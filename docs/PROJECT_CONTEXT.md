# PROJECT_CONTEXT.md — SafeRoute

> **Audiencia:** Agentes de desarrollo (Antigravity, Codex, y cualquier otro asistente de IA usado en este workspace).
> **Jerarquía:** Este archivo es el cerebro del proyecto. `ARCHITECTURE_RULES.md`, `UI_GUIDELINES.md`, `SECURITY.md` y `OPTIMIZATION.md` son la fuente de verdad técnica específica y tienen precedencia sobre este archivo en su propio dominio, pero deben ser consistentes con lo que dice aquí.
> **Regla base:** No construyas lo que no está en el alcance del MVP (sección 2). Si tienes duda de si algo entra o no, pregunta antes de asumir.

---

## 1. Qué es SafeRoute (una frase)

Plataforma que muestra zonas de riesgo/seguridad en tiempo real para turistas y los guía hacia lugares verificados (restaurantes, hoteles, atracciones, farmacias, hospitales, policía), con el contexto de seguridad integrado en cada lugar.

**La pregunta que el MVP tiene que responder, y la única:**
> ¿Un turista abre esta app antes de decidir por dónde caminar o a dónde ir?

Todo lo que no ayude a responder esa pregunta con datos reales (no con opiniones) se pospone a Fase 2 o 3.

---

## 2. Estado actual del proyecto

- **Fase activa:** MVP / V1 (validación).
- **Nombre:** "SafeRoute" es **placeholder**. No comprar dominio, no registrar marca, no diseñar logo definitivo hasta confirmar disponibilidad de nombre (ver sección 8, pendiente #5).
- **Ciudad de validación:** Casco Viejo, Panamá.
- **Idiomas soportados desde el día 1:** Español e Inglés (`es` / `en`). No hardcodear strings nunca — todo va a archivos de traducción desde el primer componente.

---

## 3. Alcance del MVP — qué SÍ se construye

| # | Funcionalidad | Por qué entra |
|---|---|---|
| 1 | Mapa interactivo con zonas coloreadas (verde/amarillo/rojo/gris "sin datos recientes") + geolocalización del usuario | Es el producto. Sin esto no hay nada que validar. |
| 2 | Detalle de zona: nivel de precaución, fuentes, fecha de actualización, consejos | Le da credibilidad al color del mapa. |
| 3 | Listado de lugares cercanos (restaurantes, hoteles, hospitales, farmacias, policía, atracciones) | Es el "para qué" del mapa — sin esto es solo un mapa de riesgo, no una guía. |
| 4 | Buscador simple de lugares y zonas | Uso básico esperado. |
| 5 | Reporte de incidentes por parte de usuarios, con cola de moderación | Es la fuente de datos viva; sin esto el mapa se vuelve estático. |
| 6 | Panel admin básico (aprobar/rechazar reportes y lugares, editar zonas) | Sin esto, el desarrollador es el cuello de botella de cada cambio. |
| 7 | Analítica con PostHog desde el día 1 | Única forma de responder la pregunta del MVP con datos, no con intuición. |
| 8 | Español e inglés desde el inicio | Rehacerlo después es doloroso; hacerlo ahora es barato. |

## 4. Qué NO se construye en el MVP (out of scope explícito)

Se elimina por completo de la V1 — **no se deja "a medio construir"**, no se crean tablas ni componentes fantasma para "dejar el camino listo":

- Stripe / cualquier procesador de pago
- Vouchers prepagados
- Sistema de QR de descuento
- Registro y onboarding de negocios (`business_applications`, panel de negocio)
- Suscripciones / planes (Free, Basic, Premium)
- App nativa (React Native / Expo)
- Notificaciones push proactivas ("estás entrando a zona de riesgo")

**Nota sobre push notifications:** el MVP es de **consulta activa** (el usuario abre la app y mira), no de **aviso proactivo**. Esto es porque iOS no permite geolocalización confiable en background dentro de una PWA. No prometer en ningún copy de la app "te avisamos automáticamente" — eso llega en Fase 3 con app nativa.

---

## 5. Roadmap por fases

- **Fase 1 — MVP (activa).** Validar que el turista consulta la app antes de moverse.
- **Fase 2 — Monetización.** Solo cuando Fase 1 esté validada con datos: registro de negocios, perfil de negocio, ofertas simples **sin pago** todavía, panel de negocio básico. Un único modelo de ingreso (suscripción mensual simple), no los tres streams del documento completo a la vez.
- **Fase 3 — Escala.** Stripe, vouchers prepagados, QR de descuento, suscripciones completas, app nativa React Native, alertas push proactivas, expansión a otras ciudades/países.

El esquema completo (`businesses`, `deals`, `voucher_purchases`, `business_applications`, roles granulares Super Admin/Admin/Business Owner) **existe documentado como referencia en el Contexto Completo v2.0** — no se descarta, se pospone.

---

## 6. Modelo de negocio (referencia futura — no se construye en MVP)

Tres fuentes de ingreso planeadas para Fase 2/3: suscripción mensual de negocio ($30–80/mes), comisión por voucher vendido (15–20%), featured listing ($20–40/mes). No implementar ninguna lógica de cobro en el MVP; si el agente ve una tarea que roza esto, debe detenerse y preguntar.

**Nota sobre procesador de pagos — `[PENDIENTE — validar antes de Fase 2]`:** Stripe **no está disponible para empresas registradas en Panamá** (no es un país soportado para crear cuenta comercial) — confirmado, no es un supuesto. El documento de contexto completo v2.0 lo asume como procesador único y hay que corregir esa referencia antes de construir Fase 2. Candidatos a evaluar en su momento (no decidido, no implementar todavía):
- **Paguelo Fácil** — para el cobro B2B a negocios panameños (suscripciones) y Yappy + tarjeta local al turista nacional.
- **Whop** — para cobrar en dólares a turistas internacionales con tarjeta extranjera.

Ninguno de los dos está validado en profundidad para el modelo específico de vouchers/marketplace de SafeRoute — se revisa recién al abrir Fase 2, siguiendo el protocolo de la sección 9.

---

## 7. Glosario

| Término | Significado |
|---|---|
| `zone` | Polígono geográfico con un nivel de riesgo asociado (PostGIS `POLYGON`). |
| `risk_level` | `low` / `medium` / `high` / `unknown`. Nunca se traduce como "peligroso/seguro" en UI — ver `UI_GUIDELINES.md`. |
| `risk_score` | Número 0–100 calculado a partir de fuentes + incidentes aprobados, con decay temporal. |
| `confidence_ttl` | Días desde `last_updated` antes de que una zona se marque como "sin datos recientes" automáticamente. |
| `place` | Lugar verificado (restaurante, hotel, farmacia, etc.) asociado a una zona. |
| `incident` | Reporte de usuario, siempre en cola de moderación hasta ser aprobado por un admin. |
| `audit_log` | Registro inmutable de quién hizo qué acción administrativa (aprobar, rechazar, editar) y cuándo — ver `SECURITY.md` sección 7 y `UI_GUIDELINES.md` sección 9. Existe para evitar disputas internas de "quién aprobó/cambió esto". |

---

## 8. Preguntas pendientes (NO técnicas — resolver con el dueño de la idea)

Estas preguntas **no bloquean el desarrollo del MVP**, pero deben quedar resueltas antes de pasar a Fase 2. El agente de IA no debe intentar responderlas ni asumir una respuesta:

1. ¿Quién modera reportes/incidentes en el día a día una vez la app esté viva?
2. ¿Cuál es la métrica concreta que decide si el MVP "funcionó" (ej. "X sesiones/mes con ≥2 zonas consultadas por sesión")?
3. ¿Casco Viejo, Panamá sigue siendo la ciudad de validación, o hay otra en mente?
4. ¿Hay presupuesto para adquisición de usuarios (alianzas con hostales/hoteles), o es 100% esfuerzo manual?
5. ¿"SafeRoute" es el nombre final o sigue siendo placeholder? (verificar disponibilidad de marca antes de invertir en branding)

---

## 9. Decisiones baratas vs. costosas de revertir

En etapa de MVP/validación, no todas las decisiones técnicas tienen el mismo costo de deshacerse. Esta distinción ayuda al agente de IA (y a ti) a saber dónde iterar rápido con confianza y dónde pensarlo dos veces antes de tocar algo sin preguntar.

**Barata de revertir** — se cambia, ajusta o borra sin que el resto del sistema se entere ni se rompa. No genera migración de datos reales ni afecta contratos entre partes del código.
- Proveedor de tiles del mapa (MapLibre + OpenFreeMap/Protomaps hoy, Mapbox u otro mañana si hiciera falta — la API es casi idéntica a propósito).
- Datos precargados en `zones`/`places` (el seed de arranque en frío de `ARCHITECTURE_RULES.md` sección 5 — son filas normales, editables desde el panel admin).
- Tokens visuales (colores de acento, tipografía, qué animación puntual se usa dónde — `UI_GUIDELINES.md`).
- Copys e i18n.

**Costosa de revertir** — implica migrar datos reales ya existentes, romper pantallas/lógica que ya asumen esa estructura, o rehacer trabajo construido encima.
- La forma del esquema de base de datos (qué campos tiene cada tabla) una vez que ya hay datos reales guardados con esa estructura.
- El modelo de RLS/permisos, una vez que varias pantallas ya dependen de esas reglas.
- El proveedor de autenticación (Supabase Auth), una vez que ya existen usuarios reales registrados ahí.
- Cualquier decisión que ya haya sido usada como base para construir varias features encima (ver historial de decisiones, sección 10).

**Regla práctica para el agente:** antes de proponer un cambio, clasificarlo en una de las dos categorías. Si es "barata", se puede iterar directamente. Si es "costosa", se detiene y confirma contigo antes de tocarla, aunque técnicamente sea posible hacerlo.

---

## 10. Cómo agregar una nueva feature — protocolo obligatorio

Este protocolo aplica a **cualquier feature nueva**, sea del roadmap de Fase 2/3 o una idea que surja sobre la marcha. El agente de IA debe seguirlo siempre, en este orden:

1. **Clasificar el impacto** de la feature marcando cuáles de estos dominios toca: datos/esquema, arquitectura, UI/idioma, seguridad/legal, performance.
2. **Actualizar el/los documento(s) correspondiente(s) ANTES de escribir código**, no después:
   - ¿Toca la base de datos o el stack? → actualizar `ARCHITECTURE_RULES.md` primero.
   - ¿Agrega o cambia una pantalla, copy, o flujo visible? → actualizar `UI_GUIDELINES.md` primero.
   - ¿Maneja datos de usuario, permisos, o algo legal-sensible (reportes, ubicación)? → actualizar `SECURITY.md` primero.
   - ¿Puede generar muchas queries, muchos marcadores en el mapa, o tráfico alto? → revisar `OPTIMIZATION.md` primero.
   - ¿Cambia el alcance del MVP o el roadmap? → actualizar este archivo (secciones 3, 4 o 5) primero, y marcarlo como `[DECISIÓN MVP]` o `[PENDIENTE — confirmar]` según corresponda.
3. **Registrar la decisión** en la sección 10 (historial) de este archivo con fecha y una línea de razón — igual que hace el documento de contexto completo original.
4. **Implementar** siguiendo lo que ya quedó escrito en los docs, no al revés.
5. Si una feature parece no encajar en ningún doc existente, **preguntar antes de improvisar una estructura nueva**.

**Formato para proponer una feature nueva (úsalo tal cual al pedirle algo al agente):**

```
FEATURE: [nombre corto]
FASE: [1 MVP / 2 Monetización / 3 Escala]
POR QUÉ: [una frase, qué pregunta de negocio o de usuario responde]
IMPACTA: [datos / arquitectura / UI / seguridad / performance — marcar los que aplican]
DOCS A ACTUALIZAR ANTES DE CODEAR: [lista]
```

---

## 11. Historial de decisiones

| Fecha | Decisión | Razón |
|---|---|---|
| Jul 2026 | Se reestructura el documento completo v2.0 en un MVP recortado | Validar antes de invertir en pagos/app nativa/negocios |
| Jul 2026 | Se crea el set de docs de gobernanza (`PROJECT_CONTEXT`, `ARCHITECTURE_RULES`, `UI_GUIDELINES`, `SECURITY`, `OPTIMIZATION`, `rules-workspace`) | Mismo patrón usado en VitrinaApp, para que el agente de IA no se salga del alcance del MVP |
| Jul 2026 | Se agrega tabla `audit_log` (5ta tabla del MVP) + reglas de RLS + patrón de UI para mostrar quién aprobó/editó qué | Evitar disputas internas de "quién hizo este cambio", pedido explícito antes de que existiera un mecanismo real (solo estaba como intención en el texto) |
| Jul 2026 | Se agrega guía de identidad visual completa (colores de marca, tipografía, animaciones React Bits) en `UI_GUIDELINES.md` | El diseño visual es parte central del valor del producto, no puede quedar librado a improvisación del agente pantalla por pantalla |
| Jul 2026 | Se reemplaza Mapbox GL JS por MapLibre GL JS + tiles gratuitos (OpenFreeMap/Protomaps) | Mapbox cobra por "map load"; en una PWA con recentrados frecuentes de ubicación, el tier gratuito se agota rápido. MapLibre es MIT, API casi idéntica, sin costo de renderizado |
| Jul 2026 | Se formaliza el seed de arranque en frío (geometría real vía QGIS/geojson.io + `risk_level` inicial basado en fuentes públicas, no en `incidents`) | Sin esto el mapa está vacío el día 1 y no valida nada; ya estaba mencionado como intención en el doc original pero sin bajarlo a un paso técnico concreto |
| Jul 2026 | Se agrega candado geoespacial anti-spam (`ST_DWithin` con tolerancia, no `ST_Within` estricto) para crear `incidents` | Evita reportes falsos hechos a distancia sin rechazar reportes legítimos por margen de error de GPS urbano |
| Jul 2026 | Se corrige la referencia a Stripe como procesador único (documento original v2.0) — Stripe no opera para empresas de Panamá | Evitar construir Fase 2 sobre un supuesto técnico incorrecto; queda pendiente validar Paguelo Fácil / Whop como alternativas antes de esa fase |
| Jul 2026 | Se prohíbe explícitamente el mapa 3D (extrusión de edificios, terreno, cielo) — el mapa queda como vista 2D estricta (pitch fijo en 0, sin rotación) | Una iteración anterior lo construyó en 3D y el rendimiento se degradó sin aportar nada a la app; el detalle de un lugar ya vive en su propia pantalla, no hace falta comunicarlo con volumen en el mapa |

*(Cada vez que se agregue una feature con el protocolo de la sección 9, se agrega una fila aquí.)*
