create extension if not exists pgcrypto;

create table public.private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or (char_length(display_name) between 1 and 40 and display_name !~ '[<>]')),
  updated_at timestamptz not null default now()
);
create table public.mixes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 280),
  definition jsonb not null,
  share_token text unique,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publication_pair check ((share_token is null) = (published_at is null))
);
create index mixes_owner_updated_idx on public.mixes(owner_id, updated_at desc);
create index mixes_share_idx on public.mixes(share_token) where published_at is not null;

create table public.ambience_assets (
  id text primary key,
  kind text not null check (kind in ('recording','procedural')),
  path text,
  license text,
  check ((kind='procedural' and path is null) or (kind='recording' and path is not null and license is not null))
);
insert into public.ambience_assets(id,kind,path,license) values
  ('white','procedural',null,null), ('pink','procedural',null,null), ('brown','procedural',null,null),
  ('rain','recording','/builds/linosbinaural/audio/rain.mp3','CC0'),
  ('ocean','recording','/builds/linosbinaural/audio/ocean.mp3','CC BY 3.0'),
  ('cafe','recording','/builds/linosbinaural/audio/cafe.mp3','CC0'),
  ('forest','recording','/builds/linosbinaural/audio/forest.mp3','CC0'),
  ('fireplace','recording','/builds/linosbinaural/audio/fireplace.mp3','CC0');

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  stripe_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_customer_id text,
  currency text check (currency in ('usd','brl')),
  amount_minor integer check (amount_minor in (500,2000)),
  environment text not null check (environment in ('test','live')),
  status text not null check (status in ('pending','paid','refunded','disputed','failed')),
  last_event_created bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((currency='usd' and amount_minor=500) or (currency='brl' and amount_minor=2000) or (currency is null and amount_minor is null))
);
create index purchases_user_idx on public.purchases(user_id,environment,status);

create table public.payment_events (
  stripe_event_id text primary key,
  event_type text not null,
  stripe_object_id text not null,
  environment text not null check (environment in ('test','live')),
  created_at timestamptz not null default now()
);
create table public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  environment text not null check (environment in ('test','live')),
  ad_free boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id,environment)
);
create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  mix_id uuid references public.mixes(id) on delete set null,
  share_token text not null,
  reason text not null check (reason in ('copyright','abuse','privacy','other')),
  details text not null default '' check (char_length(details) <= 500),
  reporter_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index abuse_reports_token_time_idx on public.abuse_reports(share_token,created_at desc);

create or replace function public.valid_mix(v jsonb) returns boolean
language plpgsql immutable as $$
declare b jsonb; a jsonb; k text; layer jsonb; n numeric;
begin
  if jsonb_typeof(v) <> 'object' or (v->>'version') <> '1' then return false; end if;
  if not (v ?& array['version','binaural','ambience','durationMinutes','fadeSeconds','cover']) then return false; end if;
  b := v->'binaural'; a := v->'ambience';
  if not (b ?& array['enabled','beat','carrier','waveform','gain']) then return false; end if;
  if not (a ?& array['rain','ocean','cafe','forest','fireplace','white','pink','brown']) then return false; end if;
  if (select count(*) from jsonb_object_keys(a)) <> 8 then return false; end if;
  if jsonb_typeof(b) <> 'object' or jsonb_typeof(a) <> 'object' then return false; end if;
  if jsonb_typeof(b->'enabled') <> 'boolean' or b->>'waveform' not in ('sine','triangle','square','sawtooth') then return false; end if;
  if jsonb_typeof(b->'beat') <> 'number' or (b->>'beat')::numeric not between 0.5 and 40 then return false; end if;
  if jsonb_typeof(b->'carrier') <> 'number' or (b->>'carrier')::numeric not between 200 and 500 then return false; end if;
  if jsonb_typeof(b->'gain') <> 'number' or (b->>'gain')::numeric not between 0 and 1 then return false; end if;
  if (select count(*) from jsonb_object_keys(b)) <> 5 then return false; end if;
  for k,layer in select key,value from jsonb_each(a) loop
    if k not in ('rain','ocean','cafe','forest','fireplace','white','pink','brown') then return false; end if;
    if jsonb_typeof(layer) <> 'object' or jsonb_typeof(layer->'enabled') <> 'boolean' or jsonb_typeof(layer->'gain') <> 'number' or (layer->>'gain')::numeric not between 0 and 1 then return false; end if;
    if (select count(*) from jsonb_object_keys(layer)) <> 2 then return false; end if;
  end loop;
  if (v->'durationMinutes') <> 'null'::jsonb and (jsonb_typeof(v->'durationMinutes') <> 'number' or (v->>'durationMinutes')::numeric not between 1 and 720) then return false; end if;
  if jsonb_typeof(v->'fadeSeconds') <> 'number' or (v->>'fadeSeconds')::numeric not between 2 and 30 then return false; end if;
  if v->>'cover' not in ('moon','shore','cafe','lantern','forest') then return false; end if;
  if (select count(*) from jsonb_object_keys(v)) <> 6 then return false; end if;
  return true;
exception when others then return false;
end $$;
alter table public.mixes add constraint valid_mix_definition check (public.valid_mix(definition));

alter table public.private_profiles enable row level security;
alter table public.public_profiles enable row level security;
alter table public.mixes enable row level security;
alter table public.ambience_assets enable row level security;
alter table public.purchases enable row level security;
alter table public.payment_events enable row level security;
alter table public.entitlements enable row level security;
alter table public.abuse_reports enable row level security;

create policy private_profile_owner on public.private_profiles for select to authenticated using (user_id=auth.uid());
create policy public_profile_owner_select on public.public_profiles for select to authenticated using (user_id=auth.uid());
create policy public_profile_owner_insert on public.public_profiles for insert to authenticated with check (user_id=auth.uid());
create policy public_profile_owner_update on public.public_profiles for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy mix_owner_select on public.mixes for select to authenticated using (owner_id=auth.uid());
create policy mix_owner_insert on public.mixes for insert to authenticated with check (owner_id=auth.uid());
create policy mix_owner_update on public.mixes for update to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy mix_owner_delete on public.mixes for delete to authenticated using (owner_id=auth.uid());
create policy asset_public_read on public.ambience_assets for select to anon,authenticated using (true);
create policy purchases_owner_read on public.purchases for select to authenticated using (user_id=auth.uid());
create policy entitlements_owner_read on public.entitlements for select to authenticated using (user_id=auth.uid());

create or replace function public.create_account_profiles() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.private_profiles(user_id) values(new.id);
  insert into public.public_profiles(user_id) values(new.id);
  return new;
end $$;
create trigger account_profiles_created after insert on auth.users for each row execute function public.create_account_profiles();


revoke create on schema public from public,anon,authenticated;
revoke all on all tables in schema public from anon,authenticated;
grant select on public.ambience_assets to anon,authenticated;
grant select on public.private_profiles,public.public_profiles,public.mixes,public.purchases,public.entitlements to authenticated;
grant insert(user_id,display_name) on public.public_profiles to authenticated;
grant update(display_name) on public.public_profiles to authenticated;
grant insert(title,description,definition) on public.mixes to authenticated;
grant update(title,description,definition) on public.mixes to authenticated;
grant delete on public.mixes to authenticated;

create or replace function public.touch_mix() returns trigger language plpgsql as $$
 begin new.updated_at := now(); return new; end $$;
 create trigger mix_touch before update on public.mixes for each row execute function public.touch_mix();

create or replace function public.get_shared_mix(token text) returns jsonb
language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('title',m.title,'description',m.description,'mix',m.definition,'displayName',p.display_name)
  from public.mixes m left join public.public_profiles p on p.user_id=m.owner_id
  where m.share_token=token and m.published_at is not null
$$;
revoke all on function public.get_shared_mix(text) from public;
grant execute on function public.get_shared_mix(text) to anon,authenticated;

create or replace function public.publish_mix(mix_id uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare token text;
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  token := encode(gen_random_bytes(24),'hex');
  update public.mixes set share_token=coalesce(share_token,token),published_at=coalesce(published_at,now()),updated_at=now()
  where id=mix_id and owner_id=auth.uid() returning share_token into token;
  if not found then raise exception 'Mix not found' using errcode='P0002'; end if;
  return token;
end $$;
revoke all on function public.publish_mix(uuid) from public;
grant execute on function public.publish_mix(uuid) to authenticated;

create or replace function public.unpublish_mix(mix_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  update public.mixes set share_token=null,published_at=null,updated_at=now() where id=mix_id and owner_id=auth.uid();
  if not found then raise exception 'Mix not found' using errcode='P0002'; end if;
end $$;
revoke all on function public.unpublish_mix(uuid) from public;
grant execute on function public.unpublish_mix(uuid) to authenticated;

create or replace function public.submit_report(token text, report_reason text, report_details text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if token !~ '^[0-9a-f]{48}$' or report_reason not in ('copyright','abuse','privacy','other') or report_details is null or char_length(report_details)>500 then raise exception 'Invalid report'; end if;
  perform pg_advisory_xact_lock(hashtextextended(token,0));
  if (select count(*) from public.abuse_reports where share_token=token and created_at>now()-interval '1 day')>=10 then raise exception 'Report limit reached'; end if;
  insert into public.abuse_reports(mix_id,share_token,reason,details,reporter_user_id)
  select id,token,report_reason,report_details,auth.uid() from public.mixes where share_token=token and published_at is not null;
  if not found then raise exception 'Mix not found' using errcode='P0002'; end if;
end $$;
revoke all on function public.submit_report(text,text,text) from public;
grant execute on function public.submit_report(text,text,text) to anon,authenticated;
