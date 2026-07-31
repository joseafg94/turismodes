begin;

-- Las zonas se crean y actualizan en la migración seed_zones_casco_viejo.
-- Este archivo conserva únicamente el seed repetible de places.

-- Los 24 lugares se contrastaron manualmente con OpenStreetMap/Overpass el
-- 2026-07-30. source_ref conserva el elemento OSM usado para verificar cada
-- nombre, categoría y coordenada; no se persiste porque el esquema MVP no
-- define una columna de procedencia para places.
with place_seed (
  id,
  name,
  category,
  address,
  longitude,
  latitude,
  opening_hours,
  source_ref
) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'Museo del Canal Interoceánico de Panamá', 'attraction', 'Plaza de la Independencia, San Felipe', -79.5346682, 8.9518098, null, 'OSM relation/2389829'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'Teatro Nacional', 'attraction', 'Avenida B, San Felipe', -79.5331319, 8.9525929, null, 'OSM way/140348512'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'Basílica Metropolitana Santa María la Antigua', 'attraction', 'Plaza de la Independencia, San Felipe', -79.5353495, 8.9526453, null, 'OSM way/140348509'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'Iglesia de San José — Altar de Oro', 'attraction', 'Avenida A, San Felipe', -79.5360079, 8.9513812, null, 'OSM way/157401240'),
    ('10000000-0000-4000-8000-000000000005'::uuid, 'Museo de la Mola', 'attraction', 'San Felipe, Casco Antiguo', -79.5359497, 8.9519846, null, 'OSM way/693820284'),
    ('10000000-0000-4000-8000-000000000006'::uuid, 'Paseo de Las Bóvedas', 'attraction', 'Paseo Esteban Huertas, San Felipe', -79.5317841, 8.9496931, null, 'OSM way/669450977'),
    ('10000000-0000-4000-8000-000000000007'::uuid, 'Arco Chato', 'attraction', 'Calle 3a Este, San Felipe', -79.5333492, 8.9516720, null, 'OSM way/301268840'),
    ('10000000-0000-4000-8000-000000000008'::uuid, 'American Trade Hotel & Hall', 'hotel', 'Plaza Herrera, San Felipe', -79.5368030, 8.9523523, null, 'OSM way/301268565'),
    ('10000000-0000-4000-8000-000000000009'::uuid, 'Hotel Central', 'hotel', 'Plaza de la Independencia, San Felipe', -79.5341436, 8.9524469, null, 'OSM way/301268858'),
    ('10000000-0000-4000-8000-000000000010'::uuid, 'La Concordia Boutique Hotel', 'hotel', 'Avenida Central, San Felipe', -79.5379224, 8.9528441, null, 'OSM way/301268749'),
    ('10000000-0000-4000-8000-000000000011'::uuid, 'Sofitel Legend Casco Viejo', 'hotel', 'Calle Primera Oeste, San Felipe', -79.5318871, 8.9517218, null, 'OSM way/852451675'),
    ('10000000-0000-4000-8000-000000000012'::uuid, 'Tantalo Hotel', 'hotel', 'San Felipe, Casco Antiguo', -79.5358063, 8.9531450, null, 'OSM way/301268599'),
    ('10000000-0000-4000-8000-000000000013'::uuid, 'Lo Que Hay', 'restaurant', 'San Felipe, Casco Antiguo', -79.5361050, 8.9520500, null, 'OSM node/9170784651'),
    ('10000000-0000-4000-8000-000000000014'::uuid, 'Diablicos', 'restaurant', 'San Felipe, Casco Antiguo', -79.5332299, 8.9521420, '11:30-22:00', 'OSM node/1537662988'),
    ('10000000-0000-4000-8000-000000000015'::uuid, 'Santa Rita', 'restaurant', 'San Felipe, Casco Antiguo', -79.5366916, 8.9543054, null, 'OSM node/6653104485'),
    ('10000000-0000-4000-8000-000000000016'::uuid, 'CasaCasco', 'restaurant', 'San Felipe, Casco Antiguo', -79.5368033, 8.9516701, null, 'OSM node/4941378321'),
    ('10000000-0000-4000-8000-000000000017'::uuid, 'Finca del Mar', 'restaurant', 'Calle 2 Oeste, San Felipe', -79.5324570, 8.9506327, null, 'OSM way/388287737'),
    ('10000000-0000-4000-8000-000000000018'::uuid, 'Farmacia La Milagrosa', 'pharmacy', 'Calle 12 Oeste, Santa Ana', -79.5385317, 8.9530803, null, 'OSM node/3911126215'),
    ('10000000-0000-4000-8000-000000000019'::uuid, 'Farmacia La Unión', 'pharmacy', 'Calle C, Santa Ana', -79.5389121, 8.9535764, null, 'OSM node/3913054210'),
    ('10000000-0000-4000-8000-000000000020'::uuid, 'Policlínica Presidente Remón', 'hospital', 'Santa Ana, Ciudad de Panamá', -79.5413301, 8.9564722, null, 'OSM way/1327651547'),
    ('10000000-0000-4000-8000-000000000021'::uuid, 'Hospital Santo Tomás', 'hospital', 'Calle 36 Este, Calidonia', -79.5323037, 8.9698956, 'Mo-Fr 07:00-14:00', 'OSM way/834009785'),
    ('10000000-0000-4000-8000-000000000022'::uuid, 'Policía Nacional — Subestación de San Felipe', 'police', 'San Felipe, Casco Antiguo', -79.5371654, 8.9532410, null, 'OSM way/301268985'),
    ('10000000-0000-4000-8000-000000000023'::uuid, 'Policía de Turismo', 'police', 'San Felipe, Casco Antiguo', -79.5331579, 8.9520598, null, 'OSM way/301268878'),
    ('10000000-0000-4000-8000-000000000024'::uuid, 'Subestación Policial de Santa Ana', 'police', 'Santa Ana, Ciudad de Panamá', -79.5436603, 8.9555802, null, 'OSM way/1327338082')
)
insert into public.places (
  id,
  name,
  category,
  address,
  location,
  zone_id,
  hours,
  verified,
  active
)
select
  place_seed.id,
  place_seed.name,
  place_seed.category,
  place_seed.address,
  extensions.st_setsrid(
    extensions.st_makepoint(place_seed.longitude, place_seed.latitude),
    4326
  )::extensions.geography,
  (
    select zones.id
    from public.zones
    where extensions.st_intersects(
      zones.geometry,
      extensions.st_setsrid(
        extensions.st_makepoint(place_seed.longitude, place_seed.latitude),
        4326
      )::extensions.geography
    )
    limit 1
  ),
  case
    when place_seed.opening_hours is null then null
    else jsonb_build_object('opening_hours', place_seed.opening_hours)
  end,
  true,
  true
from place_seed
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  address = excluded.address,
  location = excluded.location,
  zone_id = excluded.zone_id,
  hours = excluded.hours,
  verified = excluded.verified,
  active = excluded.active;

commit;
