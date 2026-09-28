import type { Env } from './env';
import type { User } from './supabase';
import { db } from './supabase';
import { ApiError, body, json, readLimitedBytes } from './http';

type Currency = 'usd' | 'brl';
type StripePrice = { id: string; currency: string; unit_amount: number; type: string; active: boolean; product: string };
type StripeSession = { id: string; client_reference_id: string; payment_status: string; status: string; amount_total: number; currency: string; payment_intent: string | null; customer: string | null; livemode: boolean; metadata?: { app?: string; user_id?: string } };
type StripeEvent = { id: string; type: string; created: number; livemode: boolean; data: { object: Record<string, any> } };

function paymentConfig(env: Env) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_PRICE_USD || !env.STRIPE_PRICE_BRL || !env.STRIPE_PRODUCT_ID || !env.SUPABASE_SERVICE_ROLE_KEY || !env.STRIPE_MODE) {
    throw new ApiError(503, 'payments_unavailable', 'Purchases are not configured.');
  }
  if (env.STRIPE_MODE === 'live' && !env.STRIPE_SECRET_KEY.startsWith('sk_live_')) throw new ApiError(503, 'payments_unavailable', 'Purchases are not configured.');
  if (env.STRIPE_MODE === 'test' && !env.STRIPE_SECRET_KEY.startsWith('sk_test_')) throw new ApiError(503, 'payments_unavailable', 'Purchases are not configured.');
}

async function stripe<T>(env: Env, path: string, form?: URLSearchParams): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: form ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, ...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
    body: form?.toString(),
  });
  if (!response.ok) throw new ApiError(502, 'payment_provider', 'Payment provider is unavailable.');
  return response.json() as Promise<T>;
}

async function assertPrice(env: Env, currency: Currency): Promise<string> {
  const id = currency === 'usd' ? env.STRIPE_PRICE_USD! : env.STRIPE_PRICE_BRL!;
  const price = await stripe<StripePrice>(env, `prices/${encodeURIComponent(id)}`);
  const expected = currency === 'usd' ? 500 : 2000;
  if (!price.active || price.currency !== currency || price.unit_amount !== expected || price.type !== 'one_time' || price.product !== env.STRIPE_PRODUCT_ID || price.id !== id) {
    throw new ApiError(503, 'price_mismatch', 'Purchase price is unavailable.');
  }
  return id;
}

async function assertPurchasedItem(env: Env, session: StripeSession, priceId: string): Promise<void> {
  if (session.metadata?.app !== 'linosbinaural' || session.metadata.user_id !== session.client_reference_id) throw new ApiError(400, 'invalid_session', 'Invalid checkout session.');
  const currency = session.currency as Currency;
  if (currency !== 'usd' && currency !== 'brl') throw new ApiError(400, 'invalid_currency', 'Invalid checkout currency.');
  const price = await stripe<StripePrice>(env, 'prices/' + encodeURIComponent(priceId));
  const amount = currency === 'usd' ? 500 : 2000;
  if (price.id !== priceId || price.product !== env.STRIPE_PRODUCT_ID || price.currency !== currency || price.unit_amount !== amount || price.type !== 'one_time' || session.amount_total !== amount) {
    throw new ApiError(400, 'invalid_items', 'Invalid purchased item.');
  }
}

export async function createCheckout(request: Request, env: Env, user: User, token: string): Promise<Response> {
  paymentConfig(env);
  const input = await body(request, 1024) as Record<string, unknown>;
  if (!input || Object.keys(input).some(k => k !== 'currency') || !['usd','brl'].includes(String(input.currency))) throw new ApiError(400, 'currency', 'Choose USD or BRL.');
  const currency = input.currency as Currency;
  const rows = await db(env, `entitlements?select=ad_free&environment=eq.${env.STRIPE_MODE}&limit=1`, { token });
  if ((rows as any[])[0]?.ad_free === true) throw new ApiError(409, 'already_entitled', 'Your account is already ad-free.');
  const price = await assertPrice(env, currency);
  const returnPath = `${env.PUBLIC_ORIGIN}/builds/linosbinaural/account/`;
  const form = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    client_reference_id: user.id,
    'metadata[app]': 'linosbinaural',
    'metadata[user_id]': user.id,
    'payment_intent_data[metadata][app]': 'linosbinaural',
    'payment_intent_data[metadata][user_id]': user.id,
    success_url: `${returnPath}?checkout=return&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${returnPath}?checkout=cancelled`,
  });
  const session = await stripe<{ id: string; url: string }>(env, 'checkout/sessions', form);
  if (!session.url?.startsWith('https://checkout.stripe.com/')) throw new ApiError(502, 'payment_provider', 'Payment provider response was invalid.');
  return json({ url: session.url, sessionId: session.id });
}

function hex(bytes: Uint8Array) { return Array.from(bytes, b => b.toString(16).padStart(2,'0')).join(''); }
function constantEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function verifyStripeSignature(payload: string | Uint8Array, header: string | null, secret: string, now = Math.floor(Date.now()/1000)): Promise<boolean> {
  if (!header) return false;
  const fields = header.split(',').map(x => x.trim());
  const timestamp = Number(fields.find(x => x.startsWith('t='))?.slice(2));
  const signatures = fields.filter(x => x.startsWith('v1=')).map(x => x.slice(3));
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300 || signatures.length === 0) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prefix = new TextEncoder().encode(`${timestamp}.`);
  const raw = typeof payload === 'string' ? new TextEncoder().encode(payload) : payload;
  const signed = new Uint8Array(prefix.byteLength + raw.byteLength);
  signed.set(prefix);
  signed.set(raw, prefix.byteLength);
  const signature = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, signed)));
  return signatures.some(candidate => constantEqual(candidate, signature));
}

async function applyEvent(env: Env, event: StripeEvent, status: 'pending' | 'paid' | 'refunded' | 'disputed' | 'failed', session?: StripeSession, paymentIntent?: string) {
  await db(env, 'rpc/apply_payment_event', { method: 'POST', admin: true, body: {
    p_event_id: event.id, p_event_type: event.type, p_object_id: String(event.data.object.id),
    p_environment: env.STRIPE_MODE, p_event_created: event.created, p_status: status,
    p_user_id: session?.client_reference_id ?? null, p_session_id: session?.id ?? null,
    p_payment_intent_id: paymentIntent ?? session?.payment_intent ?? null,
    p_customer_id: session?.customer ?? null,
    p_currency: session?.currency ?? null, p_amount_minor: session?.amount_total ?? null,
  } });
}

export async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  paymentConfig(env);
  const bytes = await readLimitedBytes(request, 128_000);
  if (!(await verifyStripeSignature(bytes, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET!))) throw new ApiError(400, 'signature', 'Invalid signature.');
  let raw: string;
  try { raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new ApiError(400, 'invalid_json', 'Invalid event.'); }
  let event: StripeEvent;
  try { event = JSON.parse(raw); } catch { throw new ApiError(400, 'invalid_json', 'Invalid event.'); }
  if (!event.id || !event.type || !Number.isSafeInteger(event.created) || event.livemode !== (env.STRIPE_MODE === 'live') || !event.data?.object?.id) throw new ApiError(400, 'invalid_event', 'Invalid event.');
  if (['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(event.type)) {
    const session = await stripe<StripeSession>(env, `checkout/sessions/${encodeURIComponent(event.data.object.id)}`);
    if (session.livemode !== event.livemode || !/^[0-9a-f-]{36}$/i.test(session.client_reference_id) || !session.id) throw new ApiError(400, 'invalid_session', 'Invalid checkout session.');
    const lines = await stripe<{ data: Array<{ price: StripePrice; quantity: number }> }>(env, `checkout/sessions/${encodeURIComponent(session.id)}/line_items?limit=2`);
    if (lines.data.length !== 1 || lines.data[0].quantity !== 1) throw new ApiError(400, 'invalid_items', 'Invalid purchased item.');
    const currency = session.currency as Currency;
    if (currency !== 'usd' && currency !== 'brl') throw new ApiError(400, 'invalid_currency', 'Invalid checkout currency.');
    await assertPurchasedItem(env, session, lines.data[0].price.id);
    const paid = session.payment_status === 'paid' && session.status === 'complete';
    const status = paid ? 'paid' : event.type === 'checkout.session.async_payment_failed' ? 'failed' : 'pending';
    if (!session.payment_intent) {
      if (paid) throw new ApiError(502, 'payment_provider', 'Payment reference is unavailable.');
      return json({ received: true, pending: status === 'pending' });
    }
    await applyEvent(env, event, status, session);
  } else if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created' || event.type === 'charge.dispute.closed') {
    const obj = event.data.object;
    let intent = typeof obj.payment_intent === 'string' ? obj.payment_intent : null;
    if (!intent && typeof obj.charge === 'string') {
      const charge = await stripe<{ payment_intent: string }>(env, `charges/${encodeURIComponent(obj.charge)}`);
      intent = charge.payment_intent;
    }
    if (!intent) throw new ApiError(400, 'invalid_event', 'Payment reference is missing.');
    const paymentIntent = await stripe<{ metadata?: { app?: string; user_id?: string } }>(env, 'payment_intents/' + encodeURIComponent(intent));
    if (paymentIntent.metadata?.app !== 'linosbinaural' || !/^[0-9a-f-]{36}$/i.test(paymentIntent.metadata.user_id ?? '')) return json({ received: true, ignored: true });
    let status: 'paid' | 'refunded' | 'disputed' = event.type === 'charge.refunded' ? 'refunded' : 'disputed';
    if (event.type === 'charge.dispute.closed' && obj.status === 'won' && typeof obj.charge === 'string') {
      const charge = await stripe<{ refunded: boolean; amount_refunded: number }>(env, 'charges/' + encodeURIComponent(obj.charge));
      status = charge.amount_refunded > 0 || charge.refunded ? 'refunded' : 'paid';
    }
    await applyEvent(env, event, status, undefined, intent);
  } else return json({ received: true, ignored: true });
  return json({ received: true });
}

export async function reconcileCheckout(request: Request, env: Env, user: User): Promise<Response> {
  paymentConfig(env);
  const data = await body(request, 1024) as Record<string, unknown>;
  if (!data || Object.keys(data).some(k => k !== 'sessionId') || typeof data.sessionId !== 'string' || !/^cs_(test_|live_)[A-Za-z0-9]+$/.test(data.sessionId)) {
    throw new ApiError(400, 'invalid_session', 'Invalid checkout reference.');
  }
  const session = await stripe<StripeSession>(env, 'checkout/sessions/' + encodeURIComponent(data.sessionId));
  if (session.client_reference_id !== user.id || session.livemode !== (env.STRIPE_MODE === 'live')) throw new ApiError(403, 'forbidden', 'Checkout does not belong to this account.');
  const currency = session.currency as Currency;
  if (currency !== 'usd' && currency !== 'brl') throw new ApiError(400, 'invalid_currency', 'Invalid checkout currency.');
  const lines = await stripe<{ data: Array<{ price: StripePrice; quantity: number }> }>(env, 'checkout/sessions/' + encodeURIComponent(session.id) + '/line_items?limit=2');
  if (lines.data.length !== 1 || lines.data[0].quantity !== 1) throw new ApiError(400, 'invalid_items', 'Invalid purchased item.');
  await assertPurchasedItem(env, session, lines.data[0].price.id);
  let status: 'pending' | 'paid' | 'refunded' | 'disputed' | 'failed' = session.payment_status === 'paid' && session.status === 'complete' ? 'paid' : session.status === 'expired' ? 'failed' : 'pending';
  if (!session.payment_intent) {
    if (status === 'paid') throw new ApiError(502, 'payment_provider', 'Payment reference is unavailable.');
    return json({ status });
  }
  if (status === 'paid') {
    const intent = await stripe<{ latest_charge: string | null }>(env, 'payment_intents/' + encodeURIComponent(session.payment_intent));
    if (intent.latest_charge) {
      const charge = await stripe<{ refunded: boolean; amount_refunded: number; disputed: boolean }>(env, 'charges/' + encodeURIComponent(intent.latest_charge));
      if (charge.amount_refunded > 0 || charge.refunded) status = 'refunded';
      else if (charge.disputed) status = 'disputed';
    }
  }
  const event: StripeEvent = { id: 'reconcile:' + session.id + ':' + status, type: 'reconciliation', created: Math.floor(Date.now()/1000), livemode: session.livemode, data: { object: { id: session.id } } };
  await applyEvent(env, event, status, session);
  return json({ status });
}
