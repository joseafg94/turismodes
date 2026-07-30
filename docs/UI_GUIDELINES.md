# UI_GUIDELINES.md — SafeRoute

> **Scope:** Aplica a cualquier pantalla, componente visual, copy o flujo de usuario.
> **Regla base:** El usuario tiene que ver valor (el mapa con zonas) antes de que se le pida registro. Ninguna pantalla puede usar lenguaje absoluto sobre seguridad — ver sección 6. Ninguna decisión visual nueva (color, tipografía, animación) se toma "a ojo" en un componente aislado — todo sale de este documento.

---

## 1. Principios de diseño

1. **Mobile-first, PWA.** El turista usa esto parado en la calle con el celular, con datos limitados. Prioridad: carga rápida, poco texto por pantalla, botones grandes.
2. **Abrir directo en el mapa.** Nada de pantalla de bienvenida genérica + tutorial de 5 pasos. Flujo correcto:
   `abrir app → pedir ubicación → mostrar zonas coloreadas inmediatamente → un solo tooltip: "Toca una zona para ver si es segura" → listo.`
3. **Registro tardío.** Login/registro se pide únicamente cuando el usuario intenta reportar un incidente o guardar un lugar — nunca antes.
4. **Dos modos de consumo, no compiten entre sí:**
   - 🗺️ **Mapa** — planificación previa, exploración libre.
   - 📍 **Cerca de ti** — decisión inmediata en destino, prioriza velocidad y distancia sobre exploración.
5. **Funciona sin conexión.** El mapa de zonas cacheadas debe verse aunque no haya internet — es la función más crítica para un usuario en apuros.

---

## 2. Mapa — paleta de riesgo y vista estrictamente 2D

### 2.1 Paleta de riesgo (uso exclusivo, no se reutiliza en ningún otro contexto de la UI)

| `risk_level` | Color | Hex referencia | Uso |
|---|---|---|---|
| `low` | Verde | `#16A34A` | Sin reportes recientes de incidentes |
| `medium` | Amarillo | `#EAB308` | Precaución |
| `high` | Rojo | `#DC2626` | Atención elevada |
| `unknown` / dato vencido (`confidence_ttl` superado) | Gris | `#94A3B8` | "Sin datos recientes" — nunca se infiere ni se colorea como bajo riesgo por defecto |

**Regla dura:** verde/amarillo/rojo quedan reservados únicamente para `risk_level`. Ningún botón, estado de formulario (éxito/error), badge o gráfico de analítica puede usar estos mismos tonos — se elige a propósito una identidad visual distinta (sección 3) para que el usuario nunca confunda "formulario enviado con éxito" con "zona segura".

### 2.2 Vista del mapa — 2D estricto, no 3D (regla dura, no negociable)

El mapa de SafeRoute es una **vista cenital plana (top-down)**, no un explorador urbano inmersivo. Ya se intentó la versión con extrusión 3D de edificios y el resultado fue malo tanto en rendimiento como en foco del producto — queda descartada, no se reabre sin pasar por el protocolo de features de `PROJECT_CONTEXT.md`.

**Obligatorio:**
- Pitch de cámara fijo en `0` (vista completamente cenital). Nunca se ofrece control para inclinar/rotar la cámara hacia una vista 3D.
- Los edificios se muestran como **polígonos planos** (`fill`, sin altura), rellenos con un tono neutro gris/oscuro (ver token `Bordes`/superficie oscura de sección 3) para dar contexto de manzana — nunca con volumen ni sombra que simule altura.
- Sin terreno/relieve (hillshade, terrain 3D) ni capa de cielo (sky layer).
- Sin rotación de cámara (bearing fijo en 0, norte arriba) — la lectura de calles debe ser predecible, no un mapa que gira con el gesto del usuario.
- El detalle de un lugar (descripción, horario, fotos) vive siempre en su pantalla propia (`lugar/[id]`), nunca se intenta comunicar en el mapa mediante volumen, altura o efectos 3D.

**Por qué:** cada capa 3D (extrusión de edificios, terreno, cielo) compite por el mismo presupuesto de render que ya usan los polígonos de zonas y los marcadores de lugares. En un MVP mobile-first, enfocado en que el turista lea rápido calles + colores de riesgo mientras camina, ese presupuesto no sobra — y ya se comprobó en la práctica que degradaba el rendimiento sin aportar nada a la pregunta que el MVP tiene que responder.

---

## 3. Identidad visual — estética general

> Estos tokens son la base de diseño del MVP. Si una tarea de UI necesita un color, tipografía o espaciado que no está aquí, no se improvisa — se agrega a esta tabla primero (ver protocolo sección 12).

| Token | Valor | Uso |
|---|---|---|
| **Tema** | Claro (light), único en el MVP | Modo oscuro queda documentado para Fase 2, no se construye ahora — prioridad es legibilidad al aire libre, de día, en pantalla de celular |
| **Fondo base** | `#F8FAFC` (slate-50) | Fondo de toda pantalla |
| **Tarjetas / elevación** | Blanco `#FFFFFF`, sombra sutil (`shadow-sm`), radius `12–16px` | Cards de lugares, panel de detalle de zona, formularios |
| **Acento primario** | `#2563EB` (azul) | Botón principal ("Comenzar", "Ver detalle"), links activos, ícono de ubicación del usuario en el mapa |
| **Acento secundario** | `#7C3AED` (violeta) | Acciones secundarias (ej. "Guardar lugar", badges informativos no relacionados a riesgo) |
| **Texto principal** | `#0F172A` (slate-900) | Títulos, texto de cuerpo |
| **Texto secundario / muted** | `#64748B` (slate-500) | Metadatos: distancia, fecha de actualización, horarios |
| **Bordes** | `#E2E8F0` (slate-200) | Separadores, contornos de input |

Por qué azul/violeta como acentos y no verde/rojo: son los colores exclusivos de `risk_level` (sección 2) — usar cualquier otro color para "primario de marca" evita que el usuario asocie sin querer un botón azul o un ícono violeta con un nivel de riesgo.

---

## 4. Tipografía

| Uso | Fuente | Peso / tamaño de referencia |
|---|---|---|
| Headings (H1, H2, H3) | **Sora** | H1 `32–40px` bold (hero de landing), H2 `24–28px` semibold (títulos de sección), H3 `18–20px` semibold (cards, subsecciones) |
| Body / texto de cuerpo | **Inter** | `14–16px` regular — elegida por su excelente legibilidad y soporte completo de acentos/ñ en español e inglés |
| Caption / muted | **Inter** | `12–13px` regular, color texto secundario |

Jerarquía obligatoria: nunca dos niveles de heading con el mismo peso visual en una misma pantalla (ej. no usar H2 y H3 con el mismo tamaño). Cargar ambas fuentes vía `next/font` (no CDN externo) para evitar layout shift y mantener el rendimiento del paso de carga inicial.

---

## 5. Animaciones (React Bits) — uso mínimo y con propósito

Se permite usar la librería **React Bits** (reactbits.dev) para microinteracciones puntuales, nunca como decoración general. Regla dura: **máximo 2–3 tipos de animación en toda la app del MVP.**

**Permitido (elegir de esta lista, no inventar otras sin actualizar este doc):**
- Fade-in + slight slide-up al montar las tarjetas de `PlaceCard` en un listado (`cerca/`, `buscar/`).
- Reveal sutil de texto en el hero de la landing (una sola vez, al cargar).
- Micro-interacción de hover/tap en el botón primario (escala o cambio de sombra, sin más de 150–200ms).

**Prohibido:**
- Cualquier animación sobre el mapa, sus marcadores o polígonos — MapLibre ya consume presupuesto de render; una animación encima compite por el mismo hilo y puede generar jank justo en la pantalla más crítica de la app.
- Parallax de scroll.
- Animaciones de fondo continuas (partículas, gradientes en loop, blobs animados).
- Cualquier animación que no respete `prefers-reduced-motion`.

Antes de agregar una animación nueva: revisar `OPTIMIZATION.md`. Si hay duda sobre si compromete el rendimiento percibido en un dispositivo de gama baja, no se agrega, aunque se vea bien en un dispositivo de gama alta.

---

## 6. Lenguaje dentro de la app — regla de oro (no negociable)

Ninguna pantalla, notificación, copy de marketing o mensaje de error puede usar afirmaciones absolutas sobre seguridad. Tabla de reemplazo obligatoria:

| ❌ Nunca usar | ✓ Siempre usar en su lugar |
|---|---|
| "Esta zona es peligrosa" | "Reportes recientes indican precaución en esta área" |
| "No vayas aquí" | "Recomendamos visitar con precaución, preferiblemente de día" |
| "Zona segura" | "Sin reportes de incidentes recientes en esta área" |
| "Zona roja" | "Área de atención elevada según fuentes públicas" |
| "Garantizamos tu seguridad" | "Esta información es orientativa — el criterio personal siempre prevalece" |
| "Es seguro ir a las 10pm" | "Reportes indican mayor actividad diurna — precaución nocturna" |

Cada pantalla de detalle de zona debe mostrar siempre: nivel (con el lenguaje de arriba), fuente del dato, y fecha de última actualización — visibles, no escondidos en un tooltip.

---

## 7. i18n

- Español e inglés desde el primer componente. Ningún string en JSX/TSX directamente — todo sale de `locales/es.json` / `locales/en.json`.
- Detección automática de idioma del navegador al primer ingreso, con selector manual visible en `configuracion/`.
- Los campos de datos bilingües (nombre y descripción de zonas/lugares) viven en la base de datos (`name_es`/`name_en`), no en los archivos de traducción de UI.

---

## 8. Pantallas del MVP (referencia de alcance, no agregar otras sin aprobar en `PROJECT_CONTEXT.md`)

1. Landing — una frase + botón "Comenzar", sin registro obligatorio.
2. Mapa — pantalla principal.
3. Detalle de zona.
4. Lugares cercanos — lista con distancia, categoría, horario, rating. Sin QR, sin precios de oferta (eso es Fase 2/3).
5. Reportar incidente — formulario simple, entra a cola de moderación, nunca se publica automático.
6. Mi ubicación — botón centrar mapa.
7. Buscar.
8. Configuración — idioma, notificaciones, privacidad.

---

## 9. Trazabilidad de acciones administrativas — cómo se ve en pantalla

Toda acción de un admin (aprobar/rechazar un reporte, aprobar/rechazar un lugar, editar una zona) debe registrarse en la tabla `audit_log` (ver `ARCHITECTURE_RULES.md` sección 3 y `SECURITY.md` sección 8) y **mostrarse de forma visible en el panel admin**, nunca quedar solo en la base de datos sin exponerse a los propios admins.

**Patrón de UI obligatorio en `app/admin/*`:**

```
✓ Aprobado por Juan Pérez (admin) — 30 jul 2026, 14:32
✗ Rechazado por María Gómez (admin) — 29 jul 2026, 09:10
✎ Editado por Juan Pérez (admin) — 28 jul 2026, 18:05
```

- Se arma con un join entre `audit_log` y `users` (nombre + rol), nunca solo un ID crudo.
- Este historial se muestra en la vista de detalle de cada zona/lugar/reporte dentro de `/admin`, como una línea de tiempo corta (últimas 3–5 acciones basta para el MVP, no hace falta paginar un historial completo todavía).
- Esta información **nunca se expone en las pantallas públicas del turista** (no es dato de cara al usuario final, es control interno) — reforzar con RLS según `SECURITY.md` sección 8.

Esto existe para una razón concreta que planteó el dueño del producto: evitar disputas internas de "¿quién aprobó esto?" o "¿quién cambió el nivel de esta zona?" — la respuesta debe estar siempre a un clic, no requerir revisar logs de servidor.

---

## 10. Accesibilidad y rendimiento percibido

- Contraste suficiente en los 4 colores de riesgo (no solo color — usar también un ícono/patrón para usuarios con daltonismo).
- Textos alternativos en fotos de lugares.
- Skeleton loaders en mapa y listas mientras cargan datos — nunca pantalla en blanco.
- Ningún flujo crítico (ver mapa, ver zona, buscar) debe depender de una animación larga antes de mostrar contenido.

---

## 11. Cómo agregar o modificar una pantalla nueva

1. Confirmar que la pantalla está dentro del alcance de fase actual en `PROJECT_CONTEXT.md`.
2. Verificar que todo copy nuevo respeta la tabla de la sección 6 antes de escribir el componente.
3. Agregar las claves nuevas en `locales/es.json` **y** `locales/en.json` en el mismo commit — nunca uno sin el otro.
4. Si la pantalla muestra datos de riesgo o de un lugar, reusar `ZoneDetailPanel.tsx` / `PlaceCard.tsx` en vez de crear un componente visual nuevo con estilos distintos.
5. Cualquier color, fuente o animación nueva debe salir de las secciones 3, 4 y 5 de este documento — si no existe el token que necesitas, agrégalo ahí primero, no lo definas solo dentro del componente.
6. Si la pantalla es parte de `/admin` y modifica datos, confirmar que la acción quede registrada en `audit_log` y visible según el patrón de la sección 9.
7. Revisar que la pantalla funcione en el flujo offline si toca datos de zonas (ver `OPTIMIZATION.md`).
