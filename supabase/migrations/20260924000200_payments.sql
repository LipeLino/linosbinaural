-- Only the service-role request path can call this function. It is the sole writer
-- of purchases, events and entitlements; all three changes share one transaction.
create or replace function public.apply_payment_event(
  p_event_id text, p_event_type text, p_object_id text, p_environment text,
  p_event_created bigint, p_status text, p_user_id uuid,
  p_session_id text, p_payment_intent_id text, p_customer_id text,
  p_currency text, p_amount_minor integer
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_purchase public.purchases%rowtype; v_user uuid;
begin
  if auth.role() <> 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
  if p_environment not in ('test','live') or p_status not in ('pending','paid','refunded','disputed','failed') or p_event_created < 0
    or p_event_id is null or length(p_event_id)>255 or p_object_id is null or length(p_object_id)>255
    or p_payment_intent_id is null or length(p_payment_intent_id)>255 then raise exception 'Invalid event'; end if;
  if p_status='paid' and p_event_type not in ('charge.dispute.closed') and (p_user_id is null or p_session_id is null or
     not ((p_currency='usd' and p_amount_minor=500) or (p_currency='brl' and p_amount_minor=2000))) then raise exception 'Invalid purchase'; end if;
  insert into public.payment_events(stripe_event_id,event_type,stripe_object_id,environment)
  values (p_event_id,p_event_type,p_object_id,p_environment) on conflict do nothing;
  if not found then return; end if;

  select * into v_purchase from public.purchases
  where stripe_payment_intent_id=p_payment_intent_id and environment=p_environment for update;
  if not found then
    insert into public.purchases(user_id,stripe_session_id,stripe_payment_intent_id,stripe_customer_id,currency,amount_minor,environment,status,last_event_created)
    values (
      case when exists (select 1 from auth.users where id=p_user_id) then p_user_id else null end,
      p_session_id,p_payment_intent_id,p_customer_id,p_currency,p_amount_minor,p_environment,p_status,p_event_created
    ) returning * into v_purchase;
  else
    update public.purchases set
      user_id=coalesce(user_id,case when exists (select 1 from auth.users where id=p_user_id) then p_user_id else null end),
      stripe_session_id=coalesce(stripe_session_id,p_session_id),
      stripe_customer_id=coalesce(stripe_customer_id,p_customer_id),
      currency=coalesce(currency,p_currency), amount_minor=coalesce(amount_minor,p_amount_minor),
      status=case when p_event_created > last_event_created or
        (p_event_created = last_event_created and
          case p_status when 'pending' then 0 when 'failed' then 1 when 'paid' then 2 when 'refunded' then 3 else 4 end >=
          case status when 'pending' then 0 when 'failed' then 1 when 'paid' then 2 when 'refunded' then 3 else 4 end)
        then p_status else status end,
      last_event_created=greatest(last_event_created,p_event_created), updated_at=now()
    where id=v_purchase.id returning * into v_purchase;
  end if;

  v_user := v_purchase.user_id;
  if v_user is not null then
    insert into public.entitlements(user_id,environment,ad_free,updated_at)
    values(v_user,p_environment,exists(select 1 from public.purchases where user_id=v_user and environment=p_environment and status='paid'),now())
    on conflict(user_id,environment) do update set ad_free=excluded.ad_free,updated_at=now();
  end if;
end $$;
revoke all on function public.apply_payment_event(text,text,text,text,bigint,text,uuid,text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.apply_payment_event(text,text,text,text,bigint,text,uuid,text,text,text,text,integer) to service_role;
