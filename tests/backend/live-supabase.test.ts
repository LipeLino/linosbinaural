import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_MIX } from '../../src/lib/mix';

function localVars(path: string): Record<string,string> {
  return Object.fromEntries(readFileSync(new URL(path, import.meta.url), 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => {
    const equal = line.indexOf('=');
    return [line.slice(0,equal), line.slice(equal+1)];
  }));
}

const enabled = process.env.LIVE_SUPABASE_LOCAL === '1';
describe.runIf(enabled)('project-local Supabase Auth and PostgREST integration', () => {
  let url: string;
  let anon: string;
  let service: string;
  let admin: SupabaseClient;
  let aId: string;
  let bId: string;
  let aToken: string;
  let bToken: string;
  let mixId: string;

  async function rest(path: string, method = 'GET', token = anon, payload?: unknown) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: token === service ? service : anon,
        authorization: `Bearer ${token}`,
        ...(payload === undefined ? {} : { 'content-type': 'application/json' }),
        prefer: 'return=representation',
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const raw = await response.text();
    return { response, data: raw ? JSON.parse(raw) : null };
  }

  beforeAll(async () => {
    const publicVars = localVars('../../.env.local');
    const privateVars = localVars('../../.dev.vars');
    url = publicVars.NEXT_PUBLIC_SUPABASE_URL;
    anon = publicVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    service = privateVars.SUPABASE_SERVICE_ROLE_KEY;
    if (url !== 'http://127.0.0.1:54331' || !anon || !service || privateVars.SUPABASE_URL !== url) {
      throw new Error('Refusing to run integration test outside the isolated local Supabase project.');
    }
    admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
    const suffix = crypto.randomUUID().slice(0,8);
    const password = `${crypto.randomUUID()}Aa1!`;
    const first = await admin.auth.admin.createUser({ email: `binaural-a-${suffix}@example.test`, password, email_confirm: true });
    const second = await admin.auth.admin.createUser({ email: `binaural-b-${suffix}@example.test`, password, email_confirm: true });
    if (first.error || !first.data.user || second.error || !second.data.user) throw first.error ?? second.error ?? new Error('Local test accounts unavailable');
    aId = first.data.user.id; bId = second.data.user.id;
    const client = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
    const a = await client.auth.signInWithPassword({ email: first.data.user.email!, password });
    const b = await client.auth.signInWithPassword({ email: second.data.user.email!, password });
    if (!a.data.session || !b.data.session) throw a.error ?? b.error ?? new Error('Local sessions unavailable');
    aToken = a.data.session.access_token;
    bToken = b.data.session.access_token;
  }, 30_000);
  afterAll(async () => {
    if (admin && aId) await admin.auth.admin.deleteUser(aId);
    if (admin && bId) await admin.auth.admin.deleteUser(bId);
  });

  it('enforces owner isolation and revocable public projection through actual PostgREST', async () => {
    const created = await rest('mixes?select=id,title,definition', 'POST', aToken, { title: 'Local A private', description: 'not public', definition: DEFAULT_MIX });
    expect(created.response.status).toBe(201);
    mixId = created.data[0].id;
    expect((await rest(`mixes?id=eq.${mixId}&select=id`, 'GET', bToken)).data).toEqual([]);
    expect((await rest(`mixes?id=eq.${mixId}&select=id`, 'PATCH', bToken, { title: 'stolen' })).data).toEqual([]);
    expect((await rest(`mixes?id=eq.${mixId}&select=id`, 'DELETE', bToken)).data).toEqual([]);
    expect((await rest('mixes?select=id')).response.ok).toBe(false);
    expect((await rest('public_profiles?select=display_name')).response.ok).toBe(false);
    expect((await rest('entitlements?select=ad_free', 'POST', bToken, { user_id: bId, environment: 'test', ad_free: true })).response.ok).toBe(false);
    expect((await rest('rpc/publish_mix', 'POST', bToken, { mix_id: mixId })).response.ok).toBe(false);

    const published = await rest('rpc/publish_mix', 'POST', aToken, { mix_id: mixId });
    expect(published.response.ok, JSON.stringify(published.data)).toBe(true);
    const token = published.data as string;
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    const shared = await rest('rpc/get_shared_mix', 'POST', anon, { token });
    expect(shared.response.ok).toBe(true);
    expect(Object.keys(shared.data).sort()).toEqual(['description','displayName','mix','title']);
    expect(JSON.stringify(shared.data)).not.toContain(aId);
    expect(JSON.stringify(shared.data)).not.toContain('@example.test');
    expect((await rest('rpc/unpublish_mix', 'POST', aToken, { mix_id: mixId })).response.ok).toBe(true);
    expect((await rest('rpc/get_shared_mix', 'POST', anon, { token })).data).toBeNull();
  }, 30_000);

  it('allows only the service role to apply idempotent purchase and refund events', async () => {
    const suffix = crypto.randomUUID().slice(0,8);
    const event = {
      p_event_id: `evt_local_${suffix}`, p_event_type: 'checkout.session.completed', p_object_id: `cs_local_${suffix}`,
      p_environment: 'test', p_event_created: 100, p_status: 'paid', p_user_id: aId,
      p_session_id: `cs_local_${suffix}`, p_payment_intent_id: `pi_local_${suffix}`, p_customer_id: null,
      p_currency: 'usd', p_amount_minor: 500,
    };
    expect((await rest('rpc/apply_payment_event', 'POST', aToken, event)).response.ok).toBe(false);
    expect((await rest('rpc/apply_payment_event', 'POST', service, event)).response.ok).toBe(true);
    expect((await rest('rpc/apply_payment_event', 'POST', service, event)).response.ok).toBe(true);
    const entitled = await rest('entitlements?select=ad_free&environment=eq.test', 'GET', aToken);
    expect(entitled.data[0]?.ad_free).toBe(true);
    const other = await rest('entitlements?select=ad_free&environment=eq.test', 'GET', bToken);
    expect(other.data).toEqual([]);
    const refund = { ...event, p_event_id: `evt_refund_${suffix}`, p_event_type: 'charge.refunded', p_object_id: `ch_local_${suffix}`, p_event_created: 101, p_status: 'refunded', p_user_id: null, p_session_id: null, p_customer_id: null, p_currency: null, p_amount_minor: null };
    expect((await rest('rpc/apply_payment_event', 'POST', service, refund)).response.ok).toBe(true);
    expect((await rest('entitlements?select=ad_free&environment=eq.test', 'GET', aToken)).data[0]?.ad_free).toBe(false);
    expect((await rest('rpc/apply_payment_event', 'POST', service, { ...event, p_event_id: `evt_late_${suffix}` })).response.ok).toBe(true);
    expect((await rest('entitlements?select=ad_free&environment=eq.test', 'GET', aToken)).data[0]?.ad_free).toBe(false);
  }, 30_000);
});
