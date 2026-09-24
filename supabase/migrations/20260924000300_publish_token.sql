-- Supabase installs pgcrypto in extensions, while embedded PostgreSQL may put
-- it in public. Core gen_random_uuid() avoids a search_path-dependent call.
create or replace function public.publish_mix(mix_id uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare token text;
begin
  if auth.uid() is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  token := substr(
    replace(pg_catalog.gen_random_uuid()::text,'-','') ||
    replace(pg_catalog.gen_random_uuid()::text,'-',''),
    1,48
  );
  update public.mixes set share_token=coalesce(share_token,token),published_at=coalesce(published_at,now()),updated_at=now()
  where id=mix_id and owner_id=auth.uid() returning share_token into token;
  if not found then raise exception 'Mix not found' using errcode='P0002'; end if;
  return token;
end $$;
