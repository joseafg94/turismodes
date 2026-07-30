# ARCHITECTURE_RULES.md — SafeRoute

> **Scope:** Aplica a cualquier tarea que toque estructura de carpetas, stack, base de datos o patrones de código.
> **Regla base:** Si una tarea requiere una tecnología o tabla que no está en este documento, no la agregues por tu cuenta — actualiza este archivo primero (ver protocolo en `PROJECT_CONTEXT.md` sección 10) o pregunta.

---

## 1. Stack tecnológico del MVP

| Capa | Tecnología | Nota |
|---|---|---|
| Frontend | Next.js 14 (App Router), como **PWA** | No React Native / Expo en esta fase |
| Estilos | Tailwind CSS | Ver `UI_GUIDELINES.md` para tokens de diseño |
| Backend / DB | Supabase (PostgreSQL + PostGIS + Auth) | Toda la lógica de permisos vive en RLS, no en el frontend |
| Mapas | MapLibre GL JS (fork open source, MIT) + tiles gratuitos (OpenFreeMap o Protomaps auto-hospedado) | No Mapbox GL JS: cobra por "map load" desde cierto volumen, y una PWA donde el usuario recentra el mapa seguido al caminar quema esa cuota rápido. No Google Maps (no permite polígonos de zona personalizados a este nivel). MapLibre usa prácticamente la misma API — migrar a Mapbox después, si hiciera falta, es trivial. |
| Analytics | PostHog | Obligatorio desde el primer commit funcional, no "después" |
| Deploy | Vercel | Deploy automático en cada push a `main` |
| Offline | Service Worker + Cache API | El mapa de zonas debe funcionar sin internet — es la función más crítica para el usuario en apuros |
| Pagos | — | **No existe en el MVP.** No instalar Stripe SDK, no crear variables `STRIPE_*` |

**Prohibido en esta fase** (si el agente ve una tarea que las pide, debe detenerse y preguntar): React Native, Expo, Stripe, cualquier SDK de pagos, tablas o rutas de `business`.

---

## 2. Estructura de carpetas

```
saferoute/
├── app/
│   ├── page.tsx                → Landing
│   ├── mapa/                   → Mapa principal (pantalla core)
│   ├── zona/[id]/               → Detalle de zona
│   ├── lugar/[id]/               → Detalle de lugar (sin QR, sin oferta en MVP)
│   ├── cerca/                   → Lugares cercanos
│   ├── buscar/                  → Buscador
│   ├── reportar/                 → Formulario de incidente
│   ├── admin/
│   │   ├── zonas/                → CRUD de zonas
│   │   ├── lugares/               → Aprobación de lugares
│   │   └── reportes/              → Moderación de incidentes
│   └── configuracion/            → Idioma, notificaciones, privacidad
├── components/
│   ├── Map.tsx                  → Componente MapLibre
│   ├── ZoneLayer.tsx             → Polígonos de zonas
│   ├── ZoneDetailPanel.tsx
│   ├── PlaceCard.tsx
│   ├── IncidentForm.tsx
│   └── SearchBar.tsx
├── lib/
│   ├── supabase.ts               → Cliente Supabase
│   ├── posthog.ts                → Analytics
│   ├── risk.ts                   → Cálculo/lectura de risk_score
│   └── i18n.ts                   → Utilidades de traducción
├── locales/
│   ├── es.json
│   └── en.json
├── public/
│   └── service-worker.js
└── .env.local
```

No crear `app/business/`, `app/admin/negocios/`, `lib/stripe.ts` ni nada equivalente en esta fase — están documentados en el Contexto Completo v2.0 como referencia de Fase 2/3, no se construyen ahora.

---

## 3. Esquema de base de datos — MVP (5 tablas, no más)

```sql
users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text,
  preferred_lang text DEFAULT 'es',
  role text DEFAULT 'tourist', -- tourist | admin
  created_at timestamptz DEFAULT now()
)

zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_es text NOT NULL,
  name_en text NOT NULL,
  description_es text,
  description_en text,
  risk_level text CHECK (risk_level IN ('low','medium','high','unknown')),
  risk_score integer CHECK (risk_score BETWEEN 0 AND 100),
  geometry geography(POLYGON, 4326),
  city text,
  country text DEFAULT 'PA',
  data_sources jsonb,
  last_updated timestamptz DEFAULT now(),
  confidence_ttl integer DEFAULT 30,
  active boolean DEFAULT true
)
CREATE INDEX zones_geometry_idx ON zones USING GIST (geometry);

places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text, -- restaurant | hotel | attraction | pharmacy | hospital | police | transport
  address text,
  location geography(POINT, 4326),
  zone_id uuid REFERENCES zones(id),
  google_place_id text,
  rating numeric(2,1),
  price_level integer CHECK (price_level BETWEEN 1 AND 4),
  photos text[],
  hours jsonb,
  verified boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
)
CREATE INDEX places_location_idx ON places USING GIST (location);

incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id),
  place_id uuid REFERENCES places(id) NULL, -- ver SECURITY.md: nunca se muestra públicamente vinculado
  reported_by uuid REFERENCES users(id),
  incident_type text, -- theft | scam | harassment | other
  severity integer CHECK (severity BETWEEN 1 AND 3),
  description text,
  location geography(POINT, 4326),
  occurred_at timestamptz,
  created_at timestamptz DEFAULT now(),
  verified boolean DEFAULT false,
  status text DEFAULT 'pending' -- pending | approved | rejected
)

audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) NOT NULL,
  action text NOT NULL, -- created | approved | rejected | edited | deleted
  entity_type text NOT NULL, -- zone | place | incident
  entity_id uuid NOT NULL,
  details jsonb, -- opcional: campos que cambiaron (antes/después)
  created_at timestamptz DEFAULT now()
)
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id);
```

**Por qué existe `audit_log`:** para responder siempre "¿quién aprobó/editó/rechazó esto y cuándo?" sin ambigüedad. Toda acción de un admin sobre `zones`, `places` o `incidents` debe insertar una fila aquí en la misma operación — ver `SECURITY.md` sección 8 para las reglas de cuándo se escribe y quién puede leerlo, y `UI_GUIDELINES.md` sección 9 para cómo se muestra en el panel admin.

El esquema completo del documento original (`businesses`, `deals`, `voucher_purchases`, `business_applications`, `admin_users` granular, `safety_tips`) queda documentado ahí como referencia — **no se crea en Supabase hasta Fase 2/3**.

---

## 4. Patrones de código obligatorios

- **RLS-first:** ninguna regla de permisos vive solo en el frontend. Si el frontend oculta un botón de admin pero la tabla no tiene policy, es un bug de seguridad, no un detalle de UI.
- **Queries geoespaciales:** usar `ST_DWithin` / `ST_Distance` sobre `geography`, nunca calcular distancias en JS con lat/lng crudos.

**Configuración de MapLibre — 2D estricto, no negociable (ver `UI_GUIDELINES.md` sección 2.2 para el por qué):**

```ts
// components/Map.tsx — inicialización obligatoria
const map = new maplibregl.Map({
  container: mapContainerRef.current,
  style: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
  center: [lng, lat],
  zoom: 15,
  pitch: 0,
  maxPitch: 0,          // bloquea el gesto de inclinar la cámara, no solo el valor inicial
  bearing: 0,
  dragRotate: false,     // sin rotación de cámara
  touchPitch: false,
  pitchWithRotate: false,
});
```

- Si el estilo de tiles (OpenFreeMap/Protomaps) trae por defecto una capa de edificios en 3D (`fill-extrusion`), **removerla o sobreescribirla** por una capa `fill` plana con color neutro (ver token de superficie oscura en `UI_GUIDELINES.md` sección 3) — nunca dejar pasar la extrusión de altura tal como viene del estilo base.
- No agregar capas de terreno (`addSource` tipo `raster-dem` + `setTerrain`) ni capa de cielo (`sky` layer).
- Esto ya se intentó en 3D en una iteración anterior del proyecto y degradó el rendimiento sin aportar nada al producto — queda descartado, no se reabre sin pasar por el protocolo de features de `PROJECT_CONTEXT.md`.

- **Query de referencia (radar de cercanía):**

```sql
SELECT
  z.name_es, z.risk_level, z.risk_score,
  ST_Distance(z.geometry, ST_MakePoint(:lng, :lat)::geography) AS metros,
  p.name AS lugar, p.category, p.rating
FROM zones z
LEFT JOIN places p ON p.zone_id = z.id AND p.active = true
WHERE ST_DWithin(z.geometry, ST_MakePoint(:lng, :lat)::geography, 500)
ORDER BY z.risk_score DESC, metros ASC
LIMIT 20;
```

- **i18n:** ningún string hardcodeado en componentes. Todo texto visible sale de `locales/es.json` / `locales/en.json`. Los campos bilingües de datos (`name_es`/`name_en`, `description_es`/`description_en`) van en la tabla, no en archivos de traducción.
- **Server Components por defecto** en Next.js App Router; usar Client Components solo donde haya interactividad real (mapa, formularios, botones con estado).
- **Variables de entorno:** solo las necesarias para el stack del MVP (Supabase, MapLibre, PostHog). No crear `STRIPE_*`, `EXPO_*`.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # solo backend
NEXT_PUBLIC_MAP_STYLE_URL=   # URL de estilo del proveedor de tiles gratuito (OpenFreeMap/Protomaps) — no requiere token de pago
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

---

## 5. Datos iniciales (seed) — resolver el arranque en frío

El MVP depende de `incidents` (reportes de usuarios) para mantener vivo el `risk_score`, pero el día 1 no hay usuarios ni reportes — un mapa vacío no valida nada y no genera confianza. La solución es de datos, no de código:

- **`seed.sql` con geometría real, no de ejemplo.** El polígono de cada `zone` debe exportarse como GeoJSON real de Casco Viejo (por ejemplo desde QGIS o geojson.io) e importarse a la columna `geometry`. No usar rectángulos o polígonos inventados a mano — la precisión del límite es lo que le da credibilidad al color en el mapa.
- **`risk_level` inicial basado en fuentes públicas, no en `incidents`.** Al no haber reportes de usuario todavía, el nivel de riesgo inicial de cada zona se asigna manualmente a partir de la delimitación histórica conocida de Casco Viejo/San Felipe frente a zonas colindantes (ej. límite con El Chorrillo, corredor de la Avenida Central) y de fuentes públicas ya listadas en el documento de contexto completo (SIEC Panamá, comunicados oficiales, ubicación de estaciones de policía). Este valor inicial se guarda en `data_sources` como referencia, para que quede visible de dónde salió el criterio.
- **Precargar `places` con datos reales verificados manualmente** (mínimo ~15–30: restaurantes, hoteles, farmacias, hospital, estación de policía, atracciones de Casco Viejo) — un mapa de seguridad ya da valor sin ningún negocio ni voucher, según el documento de contexto completo sección 12.3.
- Este seed se ejecuta como parte del Paso 2 del plan de desarrollo, antes de construir la pantalla de mapa (Paso 4) — sin datos reales, no hay nada útil que mostrar ni que probar.

## 6. Cómo agregar una tabla o cambio de esquema nuevo

1. Confirmar que la feature está aprobada en `PROJECT_CONTEXT.md` (sección 3 o historial de decisiones).
2. Escribir la migración SQL completa (tabla, índices, `CHECK`, FKs) **antes** de tocar el frontend.
3. Escribir las policies de RLS correspondientes en el mismo PR/commit — nunca una tabla sin policy, aunque sea "temporal".
4. Actualizar este archivo (sección 3) agregando la tabla nueva y una nota de qué fase la introdujo.
5. Si la tabla mete datos geoespaciales, revisar `OPTIMIZATION.md` sección de índices antes de mergear.
