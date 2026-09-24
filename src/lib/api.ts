import type { Mix, PresetInput } from './mix';
import { BASE_PATH } from './mix';
import { accessToken, forgetDeletedSession } from './auth';

export interface SavedMix extends PresetInput {
  id: string;
  shareToken: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface SharedMix extends PresetInput { displayName: string | null }
export interface Account { displayName: string | null; email: string | null }
export interface Entitlement { adFree: boolean; resolved: true }
export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function call<T>(path: string, init: RequestInit = {}, publicRequest = false): Promise<T> {
  const token = publicRequest ? null : await accessToken();
  if (!publicRequest && !token) throw new ApiClientError(401, 'unauthorized', 'Sign in is required.');
  const response = await fetch(`${BASE_PATH}/api${path}`, {
    ...init,
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiClientError(response.status, data?.error ?? 'request_failed', data?.message ?? 'Request failed.');
  return data as T;
}

async function listAllMixes(): Promise<SavedMix[]> {
  const mixes: SavedMix[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await call<SavedMix[]>(`/mixes?offset=${offset}`);
    mixes.push(...page);
    if (page.length < 100) return mixes;
  }
}

export const api = {
  listMixes: listAllMixes,
  getMix: (id: string) => call<SavedMix>(`/mixes/${encodeURIComponent(id)}`),
  saveMix: (value: PresetInput) => call<SavedMix>('/mixes', { method: 'POST', body: JSON.stringify(value) }),
  updateMix: (id: string, value: Partial<PresetInput>) => call<SavedMix>(`/mixes/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(value) }),
  deleteMix: (id: string) => call<{ deleted: true }>(`/mixes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  duplicateMix: (id: string) => call<SavedMix>(`/mixes/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }),
  publishMix: (id: string) => call<{ shareToken: string; url: string }>(`/mixes/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
  unpublishMix: (id: string) => call<{ unpublished: true }>(`/mixes/${encodeURIComponent(id)}/unpublish`, { method: 'POST' }),
  sharedMix: (token: string) => call<SharedMix>(`/shared/${encodeURIComponent(token)}`, {}, true),
  account: () => call<Account>('/account'),
  updateAccount: (displayName: string | null) => call<Account>('/account', { method: 'PATCH', body: JSON.stringify({ displayName }) }),
  exportAccount: () => call<{ exportedAt: string; account: { id: string; email: string | null }; profile: unknown; mixes: SavedMix[]; purchases: unknown[] }>('/account/export'),
  deleteAccount: async () => {
    const result = await call<{ deleted: true }>('/account', { method: 'DELETE' });
    await forgetDeletedSession();
    return result;
  },
  entitlement: () => call<Entitlement>('/entitlement'),
  checkout: (currency: 'usd' | 'brl') => call<{ url: string; sessionId: string }>('/checkout', { method: 'POST', body: JSON.stringify({ currency }) }),
  reconcileCheckout: (sessionId: string) => call<{ status: 'pending' | 'paid' | 'refunded' | 'disputed' | 'failed' }>('/checkout/reconcile', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  report: (token: string, reason: 'copyright' | 'abuse' | 'privacy' | 'other', details: string) => call<{ accepted: true }>('/reports', { method: 'POST', body: JSON.stringify({ token, reason, details }) }, true),
};
