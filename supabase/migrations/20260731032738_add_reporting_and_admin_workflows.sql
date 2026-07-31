create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

alter table public.incidents
  drop constraint if exists incidents_incident_type_check,
  add constraint incidents_incident_type_check
    check (incident_type in ('theft', 'scam', 'harassment', 'other')),
  drop constraint if exists incidents_description_length_check,
  add constraint incidents_description_length_check
    check (char_length(description) between 10 and 1000),
  drop constraint if exists incidents_status_check,
  add constraint incidents_status_check
    check (status in ('pending', 'approved', 'rejected'));

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (
    id,
    email,
    full_name,
    preferred_lang,
    role
  )
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'preferred_lang', ''), 'es'),
    'tourist'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.users.full_name, excluded.full_name);

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  );
$$;

grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

drop policy if exists tourist_can_report on public.incidents;
drop policy if exists incident_location_matches_zone on public.incidents;

create policy incident_location_matches_zone
on public.incidents
for insert
to authenticated
with check (
  reported_by = (select auth.uid())
  and status = 'pending'
  and incident_type in ('theft', 'scam', 'harassment', 'other')
  and severity between 1 and 3
  and char_length(description) between 10 and 1000
  and exists (
    select 1
    from public.zones
    where zones.id = incidents.zone_id
      and zones.active = true
      and extensions.st_dwithin(
        zones.geometry,
        incidents.location,
        100
      )
  )
);

drop policy if exists admin_read_users on public.users;
create policy admin_read_users
on public.users
for select
to authenticated
using ((select private.is_admin()));

create or replace function private.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_actor uuid := auth.uid();
  audit_action text;
  audit_details jsonb;
begin
  if current_actor is null or not exists (
    select 1
    from public.users
    where users.id = current_actor
      and users.role = 'admin'
  ) then
    raise exception 'Admin authorization required'
      using errcode = '42501';
  end if;

  if tg_table_name = 'zones' then
    audit_action := 'zone_edited';
    audit_details := jsonb_strip_nulls(jsonb_build_object(
      'name_es', case when old.name_es is distinct from new.name_es
        then jsonb_build_object('from', old.name_es, 'to', new.name_es) end,
      'name_en', case when old.name_en is distinct from new.name_en
        then jsonb_build_object('from', old.name_en, 'to', new.name_en) end,
      'description_es', case
        when old.description_es is distinct from new.description_es
        then jsonb_build_object(
          'from',
          old.description_es,
          'to',
          new.description_es
        ) end,
      'description_en', case
        when old.description_en is distinct from new.description_en
        then jsonb_build_object(
          'from',
          old.description_en,
          'to',
          new.description_en
        ) end,
      'risk_level', case
        when old.risk_level is distinct from new.risk_level
        then jsonb_build_object(
          'from',
          old.risk_level,
          'to',
          new.risk_level
        ) end,
      'risk_score', case
        when old.risk_score is distinct from new.risk_score
        then jsonb_build_object(
          'from',
          old.risk_score,
          'to',
          new.risk_score
        ) end,
      'geometry', case
        when old.geometry is distinct from new.geometry
        then jsonb_build_object('from', 'updated', 'to', 'updated') end
    ));
  elsif tg_table_name = 'places' then
    audit_action := case
      when new.verified = true and old.verified is distinct from true
        then 'place_approved'
      when new.active = false and old.active is distinct from false
        then 'place_rejected'
      else 'place_edited'
    end;
    audit_details := jsonb_strip_nulls(jsonb_build_object(
      'verified', case when old.verified is distinct from new.verified
        then jsonb_build_object(
          'from',
          old.verified,
          'to',
          new.verified
        ) end,
      'active', case when old.active is distinct from new.active
        then jsonb_build_object('from', old.active, 'to', new.active) end
    ));
  elsif tg_table_name = 'incidents' then
    audit_action := case new.status
      when 'approved' then 'incident_approved'
      when 'rejected' then 'incident_rejected'
      else 'incident_edited'
    end;
    audit_details := jsonb_build_object(
      'status',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  if audit_details = '{}'::jsonb then
    return new;
  end if;

  insert into public.audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    current_actor,
    audit_action,
    case tg_table_name
      when 'zones' then 'zone'
      when 'places' then 'place'
      else 'incident'
    end,
    new.id,
    audit_details
  );

  return new;
end;
$$;

revoke all on function private.audit_admin_change()
  from public, anon, authenticated;

drop trigger if exists audit_zone_updates on public.zones;
create trigger audit_zone_updates
after update of
  name_es,
  name_en,
  description_es,
  description_en,
  risk_level,
  risk_score,
  geometry
on public.zones
for each row execute function private.audit_admin_change();

drop trigger if exists audit_place_updates on public.places;
create trigger audit_place_updates
after update of verified, active
on public.places
for each row execute function private.audit_admin_change();

drop trigger if exists audit_incident_updates on public.incidents;
create trigger audit_incident_updates
after update of status
on public.incidents
for each row execute function private.audit_admin_change();

create or replace function public.report_incident(
  p_zone_id uuid,
  p_incident_type text,
  p_severity integer,
  p_description text,
  p_lat double precision,
  p_lng double precision
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_incident_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_incident_type not in ('theft', 'scam', 'harassment', 'other') then
    raise exception 'Invalid incident type'
      using errcode = '22023';
  end if;

  if p_severity not between 1 and 3 then
    raise exception 'Severity must be between 1 and 3'
      using errcode = '22023';
  end if;

  if char_length(trim(p_description)) not between 10 and 1000 then
    raise exception 'Description length must be between 10 and 1000'
      using errcode = '22023';
  end if;

  insert into public.incidents (
    zone_id,
    place_id,
    reported_by,
    incident_type,
    severity,
    description,
    location,
    occurred_at,
    verified,
    status
  )
  values (
    p_zone_id,
    null,
    auth.uid(),
    p_incident_type,
    p_severity,
    trim(p_description),
    extensions.st_setsrid(
      extensions.st_makepoint(p_lng, p_lat),
      4326
    )::extensions.geography,
    now(),
    false,
    'pending'
  )
  returning id into new_incident_id;

  return new_incident_id;
end;
$$;

create or replace function public.admin_update_zone(
  p_zone_id uuid,
  p_name_es text,
  p_name_en text,
  p_description_es text,
  p_description_en text,
  p_risk_level text,
  p_geometry_geojson jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  next_geometry extensions.geometry;
begin
  if p_risk_level not in ('low', 'medium', 'high', 'unknown') then
    raise exception 'Invalid risk level'
      using errcode = '22023';
  end if;

  if nullif(trim(p_name_es), '') is null
    or nullif(trim(p_name_en), '') is null then
    raise exception 'Zone names are required'
      using errcode = '22023';
  end if;

  next_geometry := extensions.st_setsrid(
    extensions.st_geomfromgeojson(p_geometry_geojson),
    4326
  );

  if extensions.geometrytype(next_geometry) <> 'POLYGON'
    or not extensions.st_isvalid(next_geometry) then
    raise exception 'Zone geometry must be a valid Polygon'
      using errcode = '22023';
  end if;

  update public.zones
  set
    name_es = trim(p_name_es),
    name_en = trim(p_name_en),
    description_es = nullif(trim(p_description_es), ''),
    description_en = nullif(trim(p_description_en), ''),
    risk_level = p_risk_level,
    geometry = next_geometry::extensions.geography,
    last_updated = now()
  where id = p_zone_id;

  if not found then
    raise exception 'Zone not found or access denied'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_moderate_place(
  p_place_id uuid,
  p_decision text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid moderation decision'
      using errcode = '22023';
  end if;

  update public.places
  set
    verified = p_decision = 'approved',
    active = p_decision = 'approved'
  where id = p_place_id;

  if not found then
    raise exception 'Place not found or access denied'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_moderate_incident(
  p_incident_id uuid,
  p_decision text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  affected_zone_id uuid;
  next_risk_score integer;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid moderation decision'
      using errcode = '22023';
  end if;

  update public.incidents
  set
    status = p_decision,
    verified = p_decision = 'approved'
  where id = p_incident_id
  returning zone_id into affected_zone_id;

  if affected_zone_id is null then
    raise exception 'Incident not found or access denied'
      using errcode = '42501';
  end if;

  select least(100, coalesce(sum(severity * 10), 0))::integer
  into next_risk_score
  from public.incidents
  where zone_id = affected_zone_id
    and status = 'approved';

  update public.zones
  set
    risk_score = next_risk_score,
    last_updated = now()
  where id = affected_zone_id;
end;
$$;

create or replace function public.admin_incidents(
  p_status text default null
)
returns table (
  id uuid,
  zone_id uuid,
  zone_name text,
  place_id uuid,
  place_name text,
  incident_type text,
  severity integer,
  description text,
  occurred_at timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.users
    where users.id = auth.uid()
      and users.role = 'admin'
  ) then
    raise exception 'Admin authorization required'
      using errcode = '42501';
  end if;

  return query
  select
    incidents.id,
    incidents.zone_id,
    zones.name_es,
    incidents.place_id,
    places.name,
    incidents.incident_type,
    incidents.severity,
    incidents.description,
    incidents.occurred_at,
    incidents.status
  from public.incidents
  join public.zones on zones.id = incidents.zone_id
  left join public.places on places.id = incidents.place_id
  where p_status is null or incidents.status = p_status
  order by incidents.created_at desc
  limit 100;
end;
$$;

revoke all on function public.report_incident(
  uuid,
  text,
  integer,
  text,
  double precision,
  double precision
) from public;

revoke all on function public.admin_update_zone(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public;

revoke all on function public.admin_moderate_place(uuid, text) from public;
revoke all on function public.admin_moderate_incident(uuid, text) from public;
revoke all on function public.admin_incidents(text) from public;

grant execute on function public.report_incident(
  uuid,
  text,
  integer,
  text,
  double precision,
  double precision
) to authenticated;

grant execute on function public.admin_update_zone(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;

grant execute on function public.admin_moderate_place(uuid, text)
  to authenticated;
grant execute on function public.admin_moderate_incident(uuid, text)
  to authenticated;
grant execute on function public.admin_incidents(text)
  to authenticated;

comment on function public.admin_incidents(text) is
  'Admin-only moderation query. The place_id association is never exposed through public incident reads.';
