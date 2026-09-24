import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { DEFAULT_MIX } from '../../src/lib/mix';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
let MIX: string;
let pg: PGlite;

async function as(role: 'anon' | 'authenticated' | 'service_role', user?: string) {
  await pg.exec('reset role');
  await pg.exec(`set request.jwt.claim.role = '${role}'`);
  await pg.exec(`set request.jwt.claim.sub = '${user ?? ''}'`);
  await pg.exec(`set role ${role}`);
}
async function root() { await pg.exec('reset role'); }

async function apply(id: string, type: string, status: string, created: number, user: string | null, intent: string, session: string | null = null) {
  await pg.query(`select public.apply_payment_event($1::text,$2::text,$3::text,$4::text,$5::bigint,$6::text,$7::uuid,$8::text,$9::text,$10::text,$11::text,$12::integer)`, [
    id, type, session ?? intent, 'test', created, status, user, session, intent, null,
    session ? 'usd' : null, session ? 500 : null,
  ]);
}

beforeAll(async () => {
  pg = new PGlite({ extensions: { pgcrypto } });
  await pg.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    create function auth.role() returns text language sql stable as $$
      select current_setting('request.jwt.claim.role',true)
    $$;
  `);
  await pg.exec(readFileSync(new URL('../../supabase/migrations/20260924000100_core.sql', import.meta.url), 'utf8'));
  await pg.exec(readFileSync(new URL('../../supabase/migrations/20260924000200_payments.sql', import.meta.url), 'utf8'));
  await pg.exec(readFileSync(new URL('../../supabase/migrations/20260924000300_publish_token.sql', import.meta.url), 'utf8'));
  await pg.exec('grant all on all tables in schema public to service_role');
  await pg.query('insert into auth.users(id,email) values ($1,$2),($3,$4)', [A,'a@example.test',B,'b@example.test']);
}, 60_000);
afterAll(async () => { await pg?.close(); });

describe('real PostgreSQL migration, RLS and payment semantics via PGlite', () => {
  it('keeps private rows inaccessible to anon and other users, including direct mutations', async () => {
    await as('authenticated', A);
    const created = await pg.query<{ id: string }>('insert into public.mixes(title,description,definition) values($1,$2,$3::jsonb) returning id', ['Private rain','',JSON.stringify(DEFAULT_MIX)]);
    MIX = created.rows[0].id;
    expect(MIX).toMatch(/^[0-9a-f-]{36}$/);
    await expect(pg.query('insert into public.mixes(title,description,definition) values($1,$2,$3::jsonb)', ['Bad URL','',JSON.stringify({ ...DEFAULT_MIX, ambience: { ...DEFAULT_MIX.ambience, custom: { enabled: true, gain: 0.5 } } })])).rejects.toThrow();

    await as('authenticated', B);
    expect((await pg.query<{ count: number }>('select count(*)::int as count from public.mixes')).rows[0].count).toBe(0);
    expect((await pg.query('update public.mixes set title=$1 where id=$2', ['stolen',MIX])).affectedRows).toBe(0);
    expect((await pg.query('delete from public.mixes where id=$1', [MIX])).affectedRows).toBe(0);
    await expect(pg.query('select public.publish_mix($1::uuid)', [MIX])).rejects.toThrow();
    await expect(pg.query('insert into public.entitlements(user_id,environment,ad_free) values($1,$2,$3)', [B,'test',true])).rejects.toThrow();

    await as('anon');
    await expect(pg.query('select * from public.mixes')).rejects.toThrow();
    await expect(pg.query('select * from public.entitlements')).rejects.toThrow();
  });

  it('shares only the safe projection and revokes the old token on unpublish', async () => {
    await as('authenticated', A);
    const first = (await pg.query<{ publish_mix: string }>('select public.publish_mix($1::uuid)', [MIX])).rows[0].publish_mix;
    expect(first).toMatch(/^[0-9a-f]{48}$/);
    await as('anon');
    const shared = (await pg.query<{ get_shared_mix: Record<string,unknown> }>('select public.get_shared_mix($1::text)', [first])).rows[0].get_shared_mix;
    expect(Object.keys(shared).sort()).toEqual(['description','displayName','mix','title']);
    expect(JSON.stringify(shared)).not.toContain('a@example.test');
    expect(JSON.stringify(shared)).not.toContain(A);
    for (let i = 0; i < 10; i++) await pg.query('select public.submit_report($1::text,$2::text,$3::text)', [first,'abuse','Direct anonymous report']);
    await expect(pg.query('select public.submit_report($1::text,$2::text,$3::text)', [first,'abuse','Overflow'])).rejects.toThrow('Report limit reached');
    await as('authenticated', A);
    await pg.query('select public.unpublish_mix($1::uuid)', [MIX]);
    await as('anon');
    expect((await pg.query<{ get_shared_mix: unknown }>('select public.get_shared_mix($1::text)', [first])).rows[0].get_shared_mix).toBeNull();
    await as('authenticated', A);
    const second = (await pg.query<{ publish_mix: string }>('select public.publish_mix($1::uuid)', [MIX])).rows[0].publish_mix;
    expect(second).not.toBe(first);
  });

  it('applies idempotent payment events, revocations, and out-of-order delivery atomically', async () => {
    await as('authenticated', A);
    await expect(apply('evt_forged','checkout.session.completed','paid',100,A,'pi_a','cs_a')).rejects.toThrow();
    await as('service_role');
    await apply('evt_paid','checkout.session.completed','paid',100,A,'pi_a','cs_a');
    await apply('evt_paid','checkout.session.completed','paid',100,A,'pi_a','cs_a');
    expect((await pg.query<{ count: number }>('select count(*)::int as count from public.payment_events')).rows[0].count).toBe(1);
    expect((await pg.query<{ ad_free: boolean }>('select ad_free from public.entitlements where user_id=$1', [A])).rows[0].ad_free).toBe(true);
    await apply('evt_refund','charge.refunded','refunded',101,null,'pi_a');
    expect((await pg.query<{ ad_free: boolean }>('select ad_free from public.entitlements where user_id=$1', [A])).rows[0].ad_free).toBe(false);
    await apply('evt_old_paid','checkout.session.completed','paid',100,A,'pi_a','cs_a');
    expect((await pg.query<{ status: string }>('select status from public.purchases where stripe_payment_intent_id=$1', ['pi_a'])).rows[0].status).toBe('refunded');
    await apply('evt_dispute','charge.dispute.created','disputed',102,null,'pi_a');
    expect((await pg.query<{ ad_free: boolean }>('select ad_free from public.entitlements where user_id=$1', [A])).rows[0].ad_free).toBe(false);
    await apply('evt_won','charge.dispute.closed','paid',103,null,'pi_a');
    expect((await pg.query<{ ad_free: boolean }>('select ad_free from public.entitlements where user_id=$1', [A])).rows[0].ad_free).toBe(true);

    await apply('evt_early_refund','charge.refunded','refunded',300,null,'pi_b');
    await apply('evt_late_paid','checkout.session.completed','paid',200,B,'pi_b','cs_b');
    expect((await pg.query<{ status: string }>('select status from public.purchases where stripe_payment_intent_id=$1', ['pi_b'])).rows[0].status).toBe('refunded');
    expect((await pg.query<{ ad_free: boolean }>('select ad_free from public.entitlements where user_id=$1', [B])).rows[0].ad_free).toBe(false);

    await as('authenticated', B);
    expect((await pg.query<{ count: number }>('select count(*)::int as count from public.purchases')).rows[0].count).toBe(1);
    await as('authenticated', A);
    expect((await pg.query<{ count: number }>('select count(*)::int as count from public.purchases')).rows[0].count).toBe(1);
    await root();
  });
});
