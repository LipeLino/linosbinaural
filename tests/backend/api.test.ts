import { describe, expect, it, vi, afterEach } from 'vitest';
import { handleApi } from '../../worker/api';
import { verifyStripeSignature } from '../../worker/payments';
import { body } from '../../worker/http';
import type { Env } from '../../worker/env';
import { DEFAULT_MIX } from '../../src/lib/mix';

const origin = 'https://mateuslino.com';
const baseEnv: Env = {
  SUPABASE_URL: 'https://test.supabase.co', SUPABASE_ANON_KEY: 'public-key',
  SUPABASE_SERVICE_ROLE_KEY: 'private-key', PUBLIC_ORIGIN: origin,
  RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const auth = { authorization: 'Bearer valid.jwt.token' };
afterEach(() => vi.unstubAllGlobals());

function streamedRequest(path: string, chunks: Uint8Array[], headers: Record<string, string> = {}, onCancel?: () => void): Request {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) controller.enqueue(chunks[index++]);
      else controller.close();
    },
    cancel() { onCancel?.(); },
  }, { highWaterMark: 0 });
  return new Request(`${origin}${path}`, { method: 'POST', headers, body: stream, duplex: 'half' } as RequestInit);
}

describe('bounded request bodies', () => {
  it('rejects missing and understated Content-Length after the first overflowing chunk, then cancels', async () => {
    for (const headers of ([{}, { 'content-length': '1' }] as Record<string, string>[])) {
      const cancelled = vi.fn();
      const request = streamedRequest('/builds/linosbinaural/api/mixes', [new Uint8Array(8), new Uint8Array(9), new Uint8Array(1024)], headers, cancelled);
      await expect(body(request, 16)).rejects.toMatchObject({ status: 413, code: 'payload_too_large' });
      expect(cancelled).toHaveBeenCalledTimes(1);
    }
  });

  it('accepts a multibyte JSON value at the exact byte limit and rejects one byte less', async () => {
    const value = { title: 'Moon \u{1F319}' };
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    const split = bytes.indexOf(0xf0) + 2;
    expect(split).toBeGreaterThan(2);
    const chunks = [bytes.subarray(0, split), bytes.subarray(split)];
    await expect(body(streamedRequest('/builds/linosbinaural/api/mixes', chunks), bytes.byteLength)).resolves.toEqual(value);
    await expect(body(streamedRequest('/builds/linosbinaural/api/mixes', chunks), bytes.byteLength - 1)).rejects.toMatchObject({ status: 413 });
  });
});

describe('API trust boundaries', () => {
  it('rejects cross-origin writes before authentication or storage access', async () => {
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    const request = new Request(`${origin}/builds/linosbinaural/api/mixes`, { method: 'POST', headers: { origin: 'https://evil.example', ...auth }, body: '{}' });
    const response = await handleApi(request, baseEnv);
    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('accepts a full 500-character accented report within the UTF-8 envelope limit', async () => {
    const details = '\u00e9'.repeat(500);
    const payload = JSON.stringify({ token: 'a'.repeat(48), reason: 'privacy', details });
    expect(new TextEncoder().encode(payload).byteLength).toBeGreaterThan(1024);
    expect(new TextEncoder().encode(payload).byteLength).toBeLessThanOrEqual(2048);
    const upstream = vi.fn(async (url: string, options: RequestInit) => {
      expect(url).toContain('/rest/v1/rpc/submit_report');
      expect(JSON.parse(options.body as string).report_details).toBe(details);
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal('fetch', upstream);
    const request = new Request(`${origin}/builds/linosbinaural/api/reports`, { method: 'POST', headers: { origin }, body: payload });
    const response = await handleApi(request, baseEnv);
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('rejects a report envelope above 2048 bytes before storage access', async () => {
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    const payload = JSON.stringify({ token: 'a'.repeat(48), reason: 'privacy', details: '\u00e9'.repeat(1000) });
    expect(new TextEncoder().encode(payload).byteLength).toBeGreaterThan(2048);
    const request = new Request(`${origin}/builds/linosbinaural/api/reports`, { method: 'POST', headers: { origin }, body: payload });
    const response = await handleApi(request, baseEnv);
    expect(response.status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects malformed mix payload before a database write', async () => {
    const upstream = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: '11111111-1111-4111-8111-111111111111' });
      throw new Error('unexpected database write');
    });
    vi.stubGlobal('fetch', upstream);
    const request = new Request(`${origin}/builds/linosbinaural/api/mixes`, { method: 'POST', headers: { origin, ...auth }, body: JSON.stringify({ title: 'bad', description: '', mix: { ...DEFAULT_MIX, binaural: { ...DEFAULT_MIX.binaural, beat: 100 } } }) });
    const response = await handleApi(request, baseEnv);
    expect(response.status).toBe(400);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('uses the user bearer token and public key for ordinary mix reads', async () => {
    const upstream = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: '11111111-1111-4111-8111-111111111111' });
      if (url.includes('/rest/v1/mixes?')) return Response.json([]);
      throw new Error('unexpected request');
    });
    vi.stubGlobal('fetch', upstream);
    const response = await handleApi(new Request(`${origin}/builds/linosbinaural/api/mixes`, { headers: auth }), baseEnv);
    expect(response.status).toBe(200);
    const [, options] = upstream.mock.calls[1] as unknown as [string, RequestInit];
    expect((options.headers as Record<string,string>).apikey).toBe('public-key');
    expect((options.headers as Record<string,string>).authorization).toBe('Bearer valid.jwt.token');
    expect(JSON.stringify(options)).not.toContain('private-key');
  });

  it('pages a private library past 100 rows without returning another account data', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const row = (id: number) => ({ id: String(id), title: `Mix ${id}`, description: '', definition: DEFAULT_MIX,
      share_token: null, published_at: null, created_at: '2026-09-24T00:00:00Z', updated_at: '2026-09-24T00:00:00Z' });
    const upstream = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: userId });
      if (url.includes('/rest/v1/mixes?')) {
        const offset = Number(new URL(url as string).searchParams.get('offset'));
        return Response.json(offset === 0 ? Array.from({ length: 100 }, (_, i) => row(i)) : [row(100)]);
      }
      throw new Error('unexpected request');
    });
    vi.stubGlobal('fetch', upstream);
    const first = await handleApi(new Request(`${origin}/builds/linosbinaural/api/mixes`, { headers: auth }), baseEnv);
    const second = await handleApi(new Request(`${origin}/builds/linosbinaural/api/mixes?offset=100`, { headers: auth }), baseEnv);
    expect((await first.json() as unknown[])).toHaveLength(100);
    expect((await second.json() as unknown[])).toHaveLength(1);
    const requests = (upstream.mock.calls as unknown as [string, RequestInit][]).filter(([url]) => url.includes('/rest/v1/mixes?'));
    expect(requests.map(([url]) => new URL(url as string).searchParams.get('offset'))).toEqual(['0', '100']);
    expect(requests.every(([, options]) => (options.headers as Record<string,string>).authorization === 'Bearer valid.jwt.token')).toBe(true);
  });

  it('exports every mix and purchase beyond the storage page size', async () => {
    const row = (i: number) => ({ id: String(i), title: `Mix ${i}`, description: '', definition: DEFAULT_MIX,
      share_token: null, published_at: null, created_at: '2026-09-24T00:00:00Z', updated_at: '2026-09-24T00:00:00Z' });
    const upstream = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/v1/user')) return Response.json({ id: '11111111-1111-4111-8111-111111111111' });
      if (url.includes('/rest/v1/public_profiles?')) return Response.json([{ display_name: 'Tester' }]);
      if (url.includes('/rest/v1/mixes?') || url.includes('/rest/v1/purchases?')) {
        const offset = Number(new URL(url as string).searchParams.get('offset'));
        return Response.json(offset === 0 ? Array.from({ length: 500 }, (_, i) => row(i)) : [row(500)]);
      }
      throw new Error('unexpected request');
    });
    vi.stubGlobal('fetch', upstream);
    const response = await handleApi(new Request(`${origin}/builds/linosbinaural/api/account/export`, { headers: auth }), baseEnv);
    expect(response.status).toBe(200);
    const exported = await response.json();
    expect(exported.account.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(exported.mixes).toHaveLength(501);
    expect(exported.purchases).toHaveLength(501);
    expect(exported.mixes[500].title).toBe('Mix 500');
  });

  it('fails closed without a rate limit binding in production', async () => {
    const upstream = vi.fn(async () => Response.json({ id: '11111111-1111-4111-8111-111111111111' }));
    vi.stubGlobal('fetch', upstream);
    const response = await handleApi(new Request(`${origin}/builds/linosbinaural/api/mixes`, { headers: auth }), { ...baseEnv, RATE_LIMITER: undefined });
    expect(response.status).toBe(503);
    expect(upstream).toHaveBeenCalledTimes(1);
  });
});

describe('Stripe raw-body signature', () => {
  it('accepts a current HMAC and rejects tampering and stale delivery', async () => {
    const payload = '{"id":"evt_test"}';
    const timestamp = 1_700_000_000;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_test'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)));
    const hex = Array.from(digest, b => b.toString(16).padStart(2,'0')).join('');
    const header = `t=${timestamp},v1=${hex}`;
    expect(await verifyStripeSignature(payload, header, 'whsec_test', timestamp)).toBe(true);
    expect(await verifyStripeSignature(payload + ' ', header, 'whsec_test', timestamp)).toBe(false);
    expect(await verifyStripeSignature(payload, header, 'whsec_test', timestamp + 301)).toBe(false);
  });
});

describe('checkout boundaries', () => {
  const payEnv: Env = {
    ...baseEnv, STRIPE_SECRET_KEY: 'sk_test_example', STRIPE_WEBHOOK_SECRET: 'whsec_test',
    STRIPE_PRICE_USD: 'price_usd', STRIPE_PRICE_BRL: 'price_brl', STRIPE_PRODUCT_ID: 'prod_test', STRIPE_MODE: 'test',
  };

  it('does not accept a client amount or price ID', async () => {
    const upstream = vi.fn(async () => Response.json({ id: '11111111-1111-4111-8111-111111111111' }));
    vi.stubGlobal('fetch', upstream);
    const request = new Request(origin + '/builds/linosbinaural/api/checkout', { method: 'POST', headers: { origin, ...auth }, body: JSON.stringify({ currency: 'usd', amount: 1, priceId: 'price_fake' }) });
    const response = await handleApi(request, payEnv);
    expect(response.status).toBe(400);
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('rejects oversized streamed webhooks before HMAC even without an honest length header', async () => {
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    for (const headers of ([{}, { 'content-length': '1' }] as Record<string, string>[])) {
      const cancelled = vi.fn();
      const request = streamedRequest('/builds/linosbinaural/api/stripe/webhook', [new Uint8Array(64_000), new Uint8Array(64_001), new Uint8Array(10)],
        { 'stripe-signature': 'invalid', ...headers }, cancelled);
      const response = await handleApi(request, payEnv);
      expect(response.status).toBe(413);
      expect(cancelled).toHaveBeenCalledTimes(1);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it('verifies exact signed UTF-8 bytes across a multibyte stream boundary', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const raw = JSON.stringify({ id: 'evt_unicode', type: 'unhandled.event', created: timestamp, livemode: false,
      data: { object: { id: 'obj_1', note: 'Moon \u{1F319}' } } });
    const bytes = new TextEncoder().encode(raw);
    const prefix = new TextEncoder().encode(`${timestamp}.`);
    const signed = new Uint8Array(prefix.byteLength + bytes.byteLength);
    signed.set(prefix); signed.set(bytes, prefix.byteLength);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_test'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, signed));
    const header = `t=${timestamp},v1=${Array.from(digest, b => b.toString(16).padStart(2, '0')).join('')}`;
    const split = bytes.indexOf(0xf0) + 2;
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    const request = streamedRequest('/builds/linosbinaural/api/stripe/webhook', [bytes.subarray(0, split), bytes.subarray(split)], { 'stripe-signature': header });
    const response = await handleApi(request, payEnv);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, ignored: true });
    expect(upstream).not.toHaveBeenCalled();
  });

  it('authenticates raw invalid UTF-8 before rejecting the webhook JSON', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const prefix = new TextEncoder().encode(`${timestamp}.`);
    const raw = Uint8Array.from([...new TextEncoder().encode('{"id":"'), 0xff, ...new TextEncoder().encode('"}')]);
    const signed = new Uint8Array(prefix.byteLength + raw.byteLength);
    signed.set(prefix); signed.set(raw, prefix.byteLength);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_test'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, signed));
    const header = `t=${timestamp},v1=${Array.from(digest, b => b.toString(16).padStart(2, '0')).join('')}`;
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    const response = await handleApi(streamedRequest('/builds/linosbinaural/api/stripe/webhook', [raw], { 'stripe-signature': header }), payEnv);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('invalid_json');
    expect(upstream).not.toHaveBeenCalled();
  });

  it('rejects an unsigned webhook before any network or database call', async () => {
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    const response = await handleApi(new Request(origin + '/builds/linosbinaural/api/stripe/webhook', { method: 'POST', body: '{"id":"evt_fake"}' }), payEnv);
    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each([['usd',500,'price_usd'],['brl',2000,'price_brl'],['usd',500,'price_old']] as const)('validates Stripe %s amount, product and one-time price before transactional grant', async (currency, amount, priceId) => {
    const timestamp = Math.floor(Date.now()/1000);
    const payload = JSON.stringify({ id: 'evt_' + currency, type: 'checkout.session.completed', created: timestamp, livemode: false, data: { object: { id: 'cs_test_123' } } });
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('whsec_test'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp + '.' + payload)));
    const header = 't=' + timestamp + ',v1=' + Array.from(digest, b => b.toString(16).padStart(2,'0')).join('');
    const upstream = vi.fn(async (url: string) => {
      if (url.endsWith('/checkout/sessions/cs_test_123')) return Response.json({ id: 'cs_test_123', client_reference_id: '11111111-1111-4111-8111-111111111111', payment_status: 'paid', status: 'complete', amount_total: amount, currency, payment_intent: 'pi_123', customer: 'cus_123', livemode: false, metadata: { app: 'linosbinaural', user_id: '11111111-1111-4111-8111-111111111111' } });
      if (url.endsWith('/checkout/sessions/cs_test_123/line_items?limit=2')) return Response.json({ data: [{ price: { id: priceId }, quantity: 1 }] });
      if (url.endsWith('/prices/' + priceId)) return Response.json({ id: priceId, currency, unit_amount: amount, type: 'one_time', active: priceId !== 'price_old', product: 'prod_test' });
      if (url.endsWith('/rest/v1/rpc/apply_payment_event')) return new Response(null, { status: 204 });
      throw new Error('unexpected ' + url);
    });
    vi.stubGlobal('fetch', upstream);
    const response = await handleApi(new Request(origin + '/builds/linosbinaural/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': header }, body: payload }), payEnv);
    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(4);
    const rpc = upstream.mock.calls[3] as unknown as [string, RequestInit];
    expect((rpc[1].headers as Record<string,string>).apikey).toBe('private-key');
    expect(JSON.parse(rpc[1].body as string).p_amount_minor).toBe(amount);
  });
});
