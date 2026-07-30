> **Audiencia:** Agentes de desarrollo (Anthropic, Google, OpenAI).
> **Scope:** Aplica a cualquier proyecto que incluya este archivo.
> **Jerarquía:** Este archivo es el estándar base. Los archivos en `/docs/` del proyecto son la fuente de verdad específica y tienen precedencia.
> **Regla base:** No construyas lo que no se te pidió.

## 1. Inicio de sesión — lo primero que haces

Al comenzar cualquier sesión de trabajo:

1. Lee `/docs/PROJECT_CONTEXT.md` si existe — es el cerebro del proyecto.
2. Lee `/docs/SECURITY.md` si existe — aplica en cada línea de código.
3. Lee `/docs/ARCHITECTURE_RULES.md`, `/docs/UI_GUIDELINES.md` y `/docs/OPTIMIZATION.md` solo si la tarea impacta arquitectura, UI o rendimiento.

Si alguno de estos archivos no existe, pregunta antes de asumir.
Si ya los leíste en la misma sesión, no los releas — usa el contexto que tienes.

## 2. Alcance y disciplina de fase

Este proyecto (SafeRoute) se desarrolla por fases (ver `PROJECT_CONTEXT.md` sección 5). La fase activa es **MVP**.

- No construyas funcionalidad de una fase futura "ya que estás" ni dejes tablas, rutas o componentes a medio construir para "adelantar" Fase 2/3. Lo que no está en el alcance del MVP no se toca, aunque el documento de contexto completo lo describa.
- Si una tarea pedida por el usuario parece pertenecer a una fase futura, dilo explícitamente antes de construirla y espera confirmación.

## 3. Antes de escribir código

- Si la tarea toca base de datos o stack → confirma que sigue `ARCHITECTURE_RULES.md` antes de generar migraciones.
- Si la tarea toca una pantalla, copy o flujo visible → confirma que sigue `UI_GUIDELINES.md`, en especial la tabla de lenguaje de la sección 3 (nunca afirmaciones absolutas de seguridad).
- Si la tarea toca datos de usuario, reportes, o permisos → confirma que sigue `SECURITY.md`, en especial la regla de aislamiento reporte–lugar.
- Si la tarea puede generar muchas queries, muchos marcadores en mapa, o tráfico alto → revisa el checklist de `OPTIMIZATION.md` antes de dar la tarea por terminada.

## 4. Agregar features nuevas

Sigue siempre el protocolo de `PROJECT_CONTEXT.md` sección 10: clasificar impacto → actualizar el/los doc(s) correspondientes primero → registrar la decisión en el historial → implementar. No saltes directo a código en una feature nueva sin pasar por este protocolo.

## 5. Cuando algo no está claro

Si un requerimiento no está cubierto por ningún doc, o si genera una tensión entre dos documentos (por ejemplo, una feature que mejora UX pero rompe una regla de `SECURITY.md`), detente y pregunta. No lo resuelvas por tu cuenta priorizando velocidad sobre las reglas del proyecto.
