# OPTIMIZATION.md — SafeRoute

> **Scope:** Aplica a cualquier query, componente que renderice listas/mapas, o decisión de cacheo.
> **Regla base:** El MVP corre en tiers gratuitos (Supabase Free, tiles de mapa gratuitos vía MapLibre, Vercel Free). El objetivo no es "optimizar prematuramente" con infraestructura cara, es **no desperdiciar el tier gratuito con queries o renders ineficientes** antes de tener usuarios reales que lo justifiquen.

---

## 1. Índices espaciales — obligatorios, no opcionales

Toda columna `geography`/`geometry` debe tener su índice GIST creado en la misma migración que crea la tabla, nunca "para después":

```sql
CREATE INDEX zones_geometry_idx ON zones USING GIST (geometry);
CREATE INDEX places_location_idx ON places USING GIST (location);
```

Ninguna query de cercanía puede calcular distancia recorriendo todas las filas en JS. Siempre `ST_DWithin` con el índice espacial haciendo el trabajo.

---

## 2. Límites y paginación

- Toda query de "lugares cercanos" o "zonas cercanas" lleva `LIMIT` explícito (referencia: 20). Nunca traer una tabla completa al cliente.
- El buscador (`/buscar`) pagina resultados, no devuelve todo en una sola respuesta.
- El panel admin de reportes/lugares pendientes pagina por página, no carga todo el historial de una vez.

---

## 3. Evitar N+1

Usar joins en una sola query (como en el ejemplo de `ARCHITECTURE_RULES.md` sección 4) en vez de:
`SELECT zonas` → loop → `SELECT lugares WHERE zone_id = ...` por cada zona. Si una pantalla necesita datos de más de una tabla relacionada, resolverlo en una query con `JOIN`, no en el cliente con múltiples llamadas.

---

## 4. Mapa — 2D estricto y rendimiento con muchos marcadores

- **El mapa es siempre 2D (pitch 0, sin extrusión de edificios, sin terreno, sin capa de cielo)** — ver `UI_GUIDELINES.md` sección 2.2 y `ARCHITECTURE_RULES.md` sección 4 para la configuración exacta. Esto no es solo una preferencia visual: cada capa 3D (`fill-extrusion`, `terrain`, `sky`) consume presupuesto de GPU/CPU que compite directamente con el render de zonas y marcadores — ya se probó en una iteración anterior y degradó el rendimiento real de la app. No se reintroduce sin pasar por el protocolo de features de `PROJECT_CONTEXT.md`.
- Si el número de `places` visibles en un viewport supera ~50, usar **clustering** de MapLibre (`clusterMaxZoom`, `clusterRadius` — misma API que Mapbox GL JS) en vez de renderizar un marcador individual por lugar.
- Cargar polígonos de zonas y lugares **filtrados por viewport actual** (bounding box), no el dataset completo de la ciudad en cada carga.
- Imágenes de lugares: usar tamaños optimizados/lazy loading (`next/image` con `loading="lazy"`), nunca fotos originales sin comprimir en las tarjetas de listado.

---

## 5. Offline / Service Worker — qué cachear y por qué

| Dato | Se cachea | Motivo |
|---|---|---|
| Zonas de riesgo de la ciudad actual | Sí, prioridad máxima | Es la función crítica que debe funcionar sin internet |
| Lugares guardados por el usuario | Sí | Consulta frecuente, bajo volumen de datos |
| Consejos de seguridad básicos | Sí | Texto estático, bajo costo de cache |
| Resultados de búsqueda / listados dinámicos completos | No | Cambian seguido, cachear generaría datos viejos mostrados como actuales |

Invalidar el cache de zonas cuando `last_updated` cambie server-side; no dejar que el usuario vea datos vencidos como si fueran frescos sin la marca "sin datos recientes" (ver `UI_GUIDELINES.md` sección 2).

---

## 6. Monitoreo de límites de tier gratuito

Revisar antes de cada release a producción, no solo cuando algo ya se rompió:

| Servicio | Límite free tier | Señal de alerta |
|---|---|---|
| Supabase | 50,000 MAU, 500MB DB, 5GB storage | DB acercándose a 400MB, o errores de conexión por pool agotado |
| MapLibre + tiles (OpenFreeMap/Protomaps) | Sin cobro por "map load" (a diferencia de Mapbox); si se usa Protomaps auto-hospedado, el límite real es el bandwidth/almacenamiento del hosting elegido | Tiempos de carga de tiles subiendo, o costo de bandwidth del hosting acercándose a su propio límite gratuito |
| Vercel | Deploy ilimitado, límites de función serverless | Timeouts frecuentes en rutas API |
| PostHog | 1M eventos/mes | Trackear solo eventos con valor real de producto (ver sección 7), no cada click |

Si un límite se acerca, es una señal para hablar de negocio (¿ya hay negocios pagando para cubrir el upgrade?), no solo un problema técnico — conectar con `PROJECT_CONTEXT.md` sección 6.

---

## 7. Analítica sin sobrecargar

Eventos mínimos a trackear en PostHog (no más, para no generar ruido ni gastar cuota gratis en datos sin valor de decisión):

`zone_viewed`, `place_viewed`, `incident_reported`, `search_performed`, `session_duration`.

No trackear cada movimiento de mapa o cada hover — eso satura el free tier sin aportar a la métrica de salida del MVP (`PROJECT_CONTEXT.md` sección 8, pregunta 2).

---

## 8. Checklist antes de mergear cualquier feature

- [ ] ¿Toda columna geoespacial nueva tiene su índice GIST?
- [ ] ¿El mapa sigue en 2D estricto (pitch 0, sin fill-extrusion, sin terreno, sin cielo)?
- [ ] ¿Toda query de listado tiene `LIMIT`?
- [ ] ¿Se evitaron loops de queries (N+1)?
- [ ] ¿El mapa sigue siendo usable si `places` crece a varios cientos de registros en el viewport?
- [ ] ¿Se agregó algún evento nuevo a PostHog solo si aporta a la métrica de salida del MVP?
