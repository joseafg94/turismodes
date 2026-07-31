create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  preferred_lang text default 'es',
  role text default 'tourist',
  created_at timestamptz default now()
);

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  name_es text not null,
  name_en text not null,
  description_es text,
  description_en text,
  risk_level text check (risk_level in ('low', 'medium', 'high', 'unknown')),
  risk_score integer check (risk_score between 0 and 100),
  geometry extensions.geography(polygon, 4326),
  city text,
  country text default 'PA',
  data_sources jsonb,
  last_updated timestamptz default now(),
  confidence_ttl integer default 30,
  active boolean default true
);

create index zones_geometry_idx on public.zones using gist (geometry);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  address text,
  location extensions.geography(point, 4326),
  zone_id uuid references public.zones(id),
  google_place_id text,
  rating numeric(2, 1),
  price_level integer check (price_level between 1 and 4),
  photos text[],
  hours jsonb,
  verified boolean default false,
  active boolean default true,
  created_at timestamptz default now()
);

create index places_location_idx on public.places using gist (location);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid references public.zones(id),
  place_id uuid references public.places(id) null,
  reported_by uuid references public.users(id),
  incident_type text,
  severity integer check (severity between 1 and 3),
  description text,
  location extensions.geography(point, 4326),
  occurred_at timestamptz,
  created_at timestamptz default now(),
  verified boolean default false,
  status text default 'pending'
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) not null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  details jsonb,
  created_at timestamptz default now()
);

create index audit_log_entity_idx
  on public.audit_log (entity_type, entity_id);

alter table public.users enable row level security;
alter table public.zones enable row level security;
alter table public.places enable row level security;
alter table public.incidents enable row level security;
alter table public.audit_log enable row level security;

revoke all on public.users from anon, authenticated;
revoke all on public.zones from anon, authenticated;
revoke all on public.places from anon, authenticated;
revoke all on public.incidents from anon, authenticated;
revoke all on public.audit_log from anon, authenticated;

grant select on public.users to authenticated;
grant select on public.zones to anon, authenticated;
grant insert, update, delete on public.zones to authenticated;
grant select on public.places to anon, authenticated;
grant insert, update, delete on public.places to authenticated;
grant select (
  id,
  zone_id,
  reported_by,
  incident_type,
  severity,
  description,
  location,
  occurred_at,
  created_at,
  verified,
  status
) on public.incidents to authenticated;
grant insert, update on public.incidents to authenticated;
grant select, insert on public.audit_log to authenticated;

grant all on public.users to service_role;
grant all on public.zones to service_role;
grant all on public.places to service_role;
grant all on public.incidents to service_role;
grant all on public.audit_log to service_role;

create policy users_read_own_profile
on public.users
for select
to authenticated
using (id = (select auth.uid()));

create policy public_read_zones
on public.zones
for select
to anon, authenticated
using (active = true);

create policy admin_only_zones
on public.zones
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role = 'admin'
  )
);

create policy public_read_places
on public.places
for select
to anon, authenticated
using (active = true and verified = true);

create policy admin_only_places
on public.places
for all
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role = 'admin'
  )
);

create policy incident_owner_or_admin
on public.incidents
for select
to authenticated
using (
  reported_by = (select auth.uid())
  or exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role = 'admin'
  )
);

create policy tourist_can_report
on public.incidents
for insert
to authenticated
with check (
  reported_by = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1
    from public.zones
    where zones.id = incidents.zone_id
      and extensions.st_dwithin(zones.geometry, incidents.location, 100)
  )
);

create policy admin_only_incidents
on public.incidents
for update
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role = 'admin'
  )
);

create policy admin_only_read_audit
on public.audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role = 'admin'
  )
);

create policy admin_insert_own_audit
on public.audit_log
for insert
to authenticated
with check (
  actor_id = (select auth.uid())
  and exists (
    select 1
    from public.users
    where users.id = (select auth.uid())
      and users.role = 'admin'
  )
);

comment on column public.incidents.place_id is
  'Internal moderation context. SELECT is not granted to anon/authenticated; only service_role can read it.';
