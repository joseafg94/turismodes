create or replace function public.zones_in_view(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision
)
returns table (
  id uuid,
  name_es text,
  name_en text,
  risk_level text,
  geometry jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    zones.id,
    zones.name_es,
    zones.name_en,
    case
      when zones.last_updated
        + make_interval(days => zones.confidence_ttl) < now()
      then 'unknown'
      else coalesce(zones.risk_level, 'unknown')
    end,
    extensions.st_asgeojson(
      zones.geometry::extensions.geometry
    )::jsonb
  from public.zones
  where zones.active = true
    and zones.geometry operator(extensions.&&)
      extensions.st_makeenvelope(
        min_lng,
        min_lat,
        max_lng,
        max_lat,
        4326
      )::extensions.geography
  order by zones.id
  limit 200;
$$;

revoke all on function public.zones_in_view(
  double precision,
  double precision,
  double precision,
  double precision
) from public;

grant execute on function public.zones_in_view(
  double precision,
  double precision,
  double precision,
  double precision
) to anon, authenticated;
