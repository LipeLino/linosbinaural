import type { Env } from './env';
import { ApiError } from './http';

export interface User { id: string; email?: string }

export async function userFromRequest(request: Request, env: Env): Promise<{ user: User; token: string }> {
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(request.headers.get('authorization') ?? '');
  if (!match) throw new ApiError(401, 'unauthorized', 'Sign in is required.');
  const token = match[1];
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError(401, 'unauthorized', 'Session expired. Sign in again.');
  const user = await response.json() as User;
  if (!/^[0-9a-f-]{36}$/i.test(user.id)) throw new ApiError(401, 'unauthorized', 'Invalid session.');
  return { user, token };
}

export async function db(env: Env, path: string, options: { method?: string; token?: string; admin?: boolean; body?: unknown; prefer?: string } = {}): Promise<any> {
  const key = options.admin ? env.SUPABASE_SERVICE_ROLE_KEY : env.SUPABASE_ANON_KEY;
  if (!key) throw new ApiError(503, 'unavailable', 'Account service is unavailable.');
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method ?? 'GET',
    headers: {
      apikey: key,
      authorization: `Bearer ${options.admin ? key : options.token ?? key}`,
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(options.prefer ? { prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    if (response.status === 404 || response.status === 406) throw new ApiError(404, 'not_found', 'Item not found.');
    if (response.status === 409) throw new ApiError(409, 'conflict', 'The request conflicts with current data.');
    if (response.status === 400) throw new ApiError(400, 'invalid_request', 'Invalid request.');
    throw new ApiError(502, 'storage_error', 'Account service is temporarily unavailable.');
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
