create index if not exists audit_log_actor_id_idx
  on public.audit_log (actor_id);

create index if not exists incidents_zone_id_idx
  on public.incidents (zone_id);

create index if not exists incidents_place_id_idx
  on public.incidents (place_id);

create index if not exists incidents_reported_by_idx
  on public.incidents (reported_by);

create index if not exists places_zone_id_idx
  on public.places (zone_id);

drop policy if exists users_read_own_profile on public.users;
drop policy if exists admin_read_users on public.users;

create policy users_read_own_or_admin
on public.users
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_admin())
);
