import type { Env } from './env';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

export async function body(request: Request, maxBytes = 16_384): Promise<unknown> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > maxBytes) throw new ApiError(413, 'payload_too_large', 'Request is too large.');
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > maxBytes) throw new ApiError(413, 'payload_too_large', 'Request is too large.');
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new ApiError(400, 'invalid_json', 'Invalid JSON body.'); }
}

export function requireOrigin(request: Request, env: Env): void {
  const origin = request.headers.get('origin');
  if (!origin || origin !== env.PUBLIC_ORIGIN) throw new ApiError(403, 'origin', 'Request origin is not allowed.');
  const secFetchSite = request.headers.get('sec-fetch-site');
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    throw new ApiError(403, 'origin', 'Request origin is not allowed.');
  }
}

export function configured(env: Env): void {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.PUBLIC_ORIGIN) {
    throw new ApiError(503, 'unavailable', 'Account service is unavailable.');
  }
  const url = new URL(env.SUPABASE_URL);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new ApiError(503, 'unavailable', 'Account service is unavailable.');
  }
}

export async function rateLimit(request: Request, env: Env, route: string, actor?: string): Promise<void> {
  if (!env.RATE_LIMITER) {
    if (env.PUBLIC_ORIGIN.includes('localhost') || env.PUBLIC_ORIGIN.includes('127.0.0.1')) return;
    throw new ApiError(503, 'unavailable', 'Request protection is unavailable.');
  }
  const key = `${route}:${actor || request.headers.get('cf-connecting-ip') || 'unknown'}`;
  if (!(await env.RATE_LIMITER.limit({ key })).success) throw new ApiError(429, 'rate_limited', 'Please try again later.');
}

export async function guarded(run: () => Promise<Response>): Promise<Response> {
  try { return await run(); }
  catch (error) {
    if (error instanceof ApiError) return json({ error: error.code, message: error.message }, error.status);
    const id = crypto.randomUUID();
    console.error('API error', id, error instanceof Error ? error.name : 'unknown');
    return json({ error: 'internal', message: 'Something went wrong.', requestId: id }, 500);
  }
}
