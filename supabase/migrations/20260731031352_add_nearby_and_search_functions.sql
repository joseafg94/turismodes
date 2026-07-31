create extension if not exists pg_trgm with schema extensions;

create index if not exists zones_name_es_trgm_idx
  on public.zones using gin (name_es extensions.gin_trgm_ops)
  where active = true;

create index if not exists zones_name_en_trgm_idx
  on public.zones using gin (name_en extensions.gin_trgm_ops)
  where active = true;

create index if not exists places_name_trgm_idx
  on public.places using gin (name extensions.gin_trgm_ops)
  where active = true;

create or replace function public.nearby_places(
  lat double precision,
  lng double precision,
  max_distance_meters double precision default 500,
  result_limit integer default 20
)
returns table (
  id uuid,
  name text,
  category text,
  hours jsonb,
  rating numeric,
  distance_meters double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with origin as (
    select extensions.st_setsrid(
      extensions.st_makepoint(lng, lat),
      4326
    )::extensions.geography as location
  )
  select
    places.id,
    places.name,
    places.category,
    places.hours,
    places.rating,
    extensions.st_distance(places.location, origin.location)
  from public.places
  cross join origin
  where places.active = true
    and places.location is not null
    and extensions.st_dwithin(
      places.location,
      origin.location,
      greatest(0, least(max_distance_meters, 5000))
    )
  order by
    places.location operator(extensions.<->) origin.location,
    places.id
  limit greatest(1, least(result_limit, 20));
$$;

create or replace function public.search_catalog(
  search_term text,
  cursor_name text default null,
  cursor_type text default null,
  cursor_id uuid default null,
  result_limit integer default 10
)
returns table (
  result_type text,
  id uuid,
  name text,
  category text,
  sort_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with catalog as (
    select
      'zone'::text as result_type,
      zones.id,
      zones.name_es as name,
      null::text as category,
      lower(zones.name_es) as sort_name
    from public.zones
    where zones.active = true
      and (
        zones.name_es ilike '%' || trim(search_term) || '%'
        or zones.name_en ilike '%' || trim(search_term) || '%'
      )

    union all

    select
      'place'::text as result_type,
      places.id,
      places.name,
      places.category,
      lower(places.name) as sort_name
    from public.places
    where places.active = true
      and places.name ilike '%' || trim(search_term) || '%'
  )
  select
    catalog.result_type,
    catalog.id,
    catalog.name,
    catalog.category,
    catalog.sort_name
  from catalog
  where cursor_name is null
    or (
      catalog.sort_name,
      catalog.result_type,
      catalog.id
    ) > (
      cursor_name,
      cursor_type,
      cursor_id
    )
  order by catalog.sort_name, catalog.result_type, catalog.id
  limit greatest(1, least(result_limit, 20)) + 1;
$$;

revoke all on function public.nearby_places(
  double precision,
  double precision,
  double precision,
  integer
) from public;

revoke all on function public.search_catalog(
  text,
  text,
  text,
  uuid,
  integer
) from public;

grant execute on function public.nearby_places(
  double precision,
  double precision,
  double precision,
  integer
) to anon, authenticated;

grant execute on function public.search_catalog(
  text,
  text,
  text,
  uuid,
  integer
) to anon, authenticated;
