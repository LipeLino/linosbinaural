import { presetSchema } from '../src/lib/mix';
import type { Env } from './env';
import { ApiError, body, configured, guarded, json, rateLimit, requireOrigin } from './http';
import { db, userFromRequest } from './supabase';
import { createCheckout, handleStripeWebhook, reconcileCheckout } from './payments';

const prefix = '/linosbinaural/api';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenPattern = /^[0-9a-f]{48}$/i;
const mixSelect = 'id,title,description,definition,share_token,published_at,created_at,updated_at';
const pageSize = 100;
async function allRows(env: Env, table: string, select: string, token: string): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await db(env, `${table}?select=${select}&order=created_at.asc,id.asc&limit=500&offset=${offset}`, { token }) as any[];
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
function single(value: unknown): any { return Array.isArray(value) ? value[0] ?? null : value; }
function mixRow(row: any) { return { id: row.id, title: row.title, description: row.description, mix: row.definition, shareToken: row.share_token, publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at }; }
function checkId(id: string) { if (!uuid.test(id)) throw new ApiError(404, 'not_found', 'Mix not found.'); }
function invalid(): never { throw new ApiError(400, 'invalid_request', 'Invalid mix data.'); }

export function handleApi(request: Request, env: Env): Promise<Response> {
  return guarded(async () => {
    const url = new URL(request.url);
    const path = url.pathname.slice(prefix.length);
    if (!url.pathname.startsWith(`${prefix}/`)) throw new ApiError(404, 'not_found', 'Not found.');
    if (request.method === 'OPTIONS') throw new ApiError(405, 'method', 'Method not allowed.');
    if (path === '/stripe/webhook' && request.method === 'POST') return handleStripeWebhook(request, env);
    configured(env);
    if (request.method !== 'GET' && request.method !== 'HEAD') requireOrigin(request, env);

    if (path.startsWith('/shared/') && request.method === 'GET') {
      const token = path.slice('/shared/'.length);
      if (!tokenPattern.test(token)) throw new ApiError(404, 'not_found', 'Mix not found.');
      await rateLimit(request, env, 'shared');
      const item = await db(env, 'rpc/get_shared_mix', { method: 'POST', body: { token } });
      if (!item) throw new ApiError(404, 'not_found', 'Mix not found.');
      return json(item);
    }
    if (path === '/reports' && request.method === 'POST') {
      await rateLimit(request, env, 'report');
      const data = await body(request, 1024) as Record<string, unknown>;
      if (!data || !tokenPattern.test(String(data.token ?? '')) || !['copyright','abuse','privacy','other'].includes(String(data.reason)) || typeof data.details !== 'string' || data.details.length > 500) {
        throw new ApiError(400, 'invalid_report', 'Invalid report.');
      }
      await db(env, 'rpc/submit_report', { method: 'POST', body: { token: data.token, report_reason: data.reason, report_details: data.details } });
      return json({ accepted: true }, 202);
    }

    const { user, token } = await userFromRequest(request, env);
    await rateLimit(request, env, request.method === 'GET' ? 'read' : 'write', user.id);
    if (path === '/mixes' && request.method === 'GET') {
      const offset = url.searchParams.get('offset') ?? '0';
      if (!/^(0|[1-9][0-9]{0,8})$/.test(offset)) throw new ApiError(400, 'invalid_request', 'Invalid page offset.');
      const rows = await db(env, `mixes?select=${mixSelect}&order=updated_at.desc,id.desc&limit=${pageSize}&offset=${offset}`, { token });
      return json((rows as any[]).map(mixRow));
    }
    if (path === '/mixes' && request.method === 'POST') {
      const parsed = presetSchema.safeParse(await body(request));
      if (!parsed.success) invalid();
      const { title, description, mix } = parsed.data;
      const rows = await db(env, `mixes?select=${mixSelect}`, { method: 'POST', token, body: { title, description, definition: mix }, prefer: 'return=representation' });
      return json(mixRow(single(rows)), 201);
    }
    const match = /^\/mixes\/([^/]+)(?:\/(duplicate|publish|unpublish))?$/.exec(path);
    if (match) {
      const id = match[1]; checkId(id);
      const action = match[2];
      if (action === 'publish' && request.method === 'POST') {
        const shareToken = await db(env, 'rpc/publish_mix', { method: 'POST', token, body: { mix_id: id } });
        return json({ shareToken, url: `${env.PUBLIC_ORIGIN}/linosbinaural/shared/?token=${shareToken}` });
      }
      if (action === 'unpublish' && request.method === 'POST') {
        await db(env, 'rpc/unpublish_mix', { method: 'POST', token, body: { mix_id: id } });
        return json({ unpublished: true });
      }
      const rows = await db(env, `mixes?id=eq.${id}&select=${mixSelect}&limit=1`, { token });
      const row = single(rows);
      if (!row) throw new ApiError(404, 'not_found', 'Mix not found.');
      if (action === 'duplicate' && request.method === 'POST') {
        const created = await db(env, `mixes?select=${mixSelect}`, { method: 'POST', token, body: { title: `${row.title} copy`.slice(0,80), description: row.description, definition: row.definition }, prefer: 'return=representation' });
        return json(mixRow(single(created)), 201);
      }
      if (action) throw new ApiError(405, 'method', 'Method not allowed.');
      if (request.method === 'GET') return json(mixRow(row));
      if (request.method === 'DELETE') {
        await db(env, `mixes?id=eq.${id}`, { method: 'DELETE', token });
        return json({ deleted: true });
      }
      if (request.method === 'PATCH') {
        const input = await body(request) as Record<string, unknown>;
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !['title','description','mix'].includes(k))) invalid();
        const full = { title: input.title ?? row.title, description: input.description ?? row.description, mix: input.mix ?? row.definition };
        const parsed = presetSchema.safeParse(full);
        if (!parsed.success) invalid();
        const next = await db(env, `mixes?id=eq.${id}&select=${mixSelect}`, { method: 'PATCH', token, body: { title: parsed.data.title, description: parsed.data.description, definition: parsed.data.mix }, prefer: 'return=representation' });
        return json(mixRow(single(next)));
      }
    }
    if (path === '/account' && request.method === 'GET') {
      const profiles = await db(env, 'public_profiles?select=display_name&limit=1', { token });
      return json({ displayName: single(profiles)?.display_name ?? null, email: user.email ?? null });
    }
    if (path === '/account' && request.method === 'PATCH') {
      const data = await body(request, 1024) as Record<string, unknown>;
      if (!data || Object.keys(data).some(k => k !== 'displayName') || (data.displayName !== null && (typeof data.displayName !== 'string' || data.displayName.trim().length < 1 || data.displayName.trim().length > 40 || /[<>]/.test(data.displayName)))) throw new ApiError(400, 'invalid_request', 'Invalid display name.');
      await db(env, 'public_profiles?on_conflict=user_id', { method: 'POST', token, body: { user_id: user.id, display_name: data.displayName === null ? null : (data.displayName as string).trim() }, prefer: 'resolution=merge-duplicates' });
      return json({ displayName: data.displayName });
    }
    if (path === '/account/export' && request.method === 'GET') {
      const [mixes, profile, purchases] = await Promise.all([
        allRows(env, 'mixes', mixSelect, token),
        db(env, 'public_profiles?select=display_name,updated_at', { token }),
        allRows(env, 'purchases', 'id,currency,amount_minor,status,created_at,environment', token),
      ]);
      return json({ exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email ?? null }, profile: single(profile), mixes: (mixes as any[]).map(mixRow), purchases });
    }
    if (path === '/account' && request.method === 'DELETE') {
      if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new ApiError(503, 'unavailable', 'Account deletion is unavailable.');
      const response = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, { method: 'DELETE', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } });
      if (!response.ok) throw new ApiError(502, 'account_delete_failed', 'Account deletion failed.');
      return json({ deleted: true });
    }
    if (path === '/entitlement' && request.method === 'GET') {
      const environment = env.STRIPE_MODE ?? 'test';
      const rows = await db(env, `entitlements?select=ad_free&environment=eq.${environment}&limit=1`, { token });
      return json({ adFree: single(rows)?.ad_free === true, resolved: true });
    }
    if (path === '/checkout' && request.method === 'POST') return createCheckout(request, env, user, token);
    if (path === '/checkout/reconcile' && request.method === 'POST') return reconcileCheckout(request, env, user);
    throw new ApiError(404, 'not_found', 'Not found.');
  });
}
