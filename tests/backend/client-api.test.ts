import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_MIX } from '../../src/lib/mix';

vi.mock('../../src/lib/auth', () => ({
  accessToken: async () => 'valid.jwt.token',
  forgetDeletedSession: async () => {},
}));

import { api } from '../../src/lib/api';

afterEach(() => vi.unstubAllGlobals());

it('loads every private mix page while preserving the library array contract', async () => {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
    calls.push(url);
    expect((options.headers as Record<string, string>).authorization).toBe('Bearer valid.jwt.token');
    const offset = Number(new URL(url, 'https://example.test').searchParams.get('offset'));
    const count = offset === 0 ? 100 : 1;
    return Response.json(Array.from({ length: count }, (_, i) => ({
      id: `${offset + i}`, title: `Mix ${offset + i}`, description: '', mix: DEFAULT_MIX,
      shareToken: null, publishedAt: null, createdAt: '', updatedAt: '',
    })));
  }));
  const mixes = await api.listMixes();
  expect(mixes).toHaveLength(101);
  expect(mixes[100].title).toBe('Mix 100');
  expect(calls).toEqual(['/builds/linosbinaural/api/mixes?offset=0', '/builds/linosbinaural/api/mixes?offset=100']);
});
