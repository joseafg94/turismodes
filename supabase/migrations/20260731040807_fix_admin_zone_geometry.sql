create or replace function public.admin_zones()
returns table (
  id uuid,
  name_es text,
  name_en text,
  description_es text,
  description_en text,
  risk_level text,
  geometry jsonb
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
    zones.id,
    zones.name_es,
    zones.name_en,
    zones.description_es,
    zones.description_en,
    zones.risk_level,
    extensions.st_asgeojson(zones.geometry::extensions.geometry)::jsonb
  from public.zones
  order by zones.name_es;
end;
$$;

revoke all on function public.admin_zones() from public, anon;
grant execute on function public.admin_zones() to authenticated;
