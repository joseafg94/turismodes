# SECURITY.md — SafeRoute

> **Scope:** Aplica en cada línea de código que toque datos de usuarios, reportes, ubicación o permisos.
> **Regla base:** SafeRoute es un **agregador de información pública**, no un proveedor de seguridad. Esta distinción legal debe reflejarse en el código (RLS, moderación) y no solo en el copy — ver `UI_GUIDELINES.md` sección 3.

---

## 1. Regla de aislamiento reporte–lugar (crítica, no negociable)

Un reporte de "estafa" o "acoso" vinculado a un `place_id` específico, si se muestra antes de ser verificado, es potencialmente **difamación contra un negocio real con nombre y dirección** — un riesgo legal distinto y más grave que clasificar una zona completa.

**Regla obligatoria:**
- Ningún `incident` aparece **jamás** vinculado visiblemente a un `place_id` en ninguna pantalla pública, sin importar su estado.
- Un incidente con `place_id` solo puede influir en el `risk_score` de la **zona** (`zone_id`), y únicamente después de ser aprobado (`status = 'approved'`) por un admin.
- El campo `place_id` en `incidents` existe solo para uso interno del panel admin (contexto de moderación), nunca se expone en ninguna API pública ni componente de cliente sin filtrar.

Si un agente de IA construye una pantalla o endpoint que muestre incidentes cerca de un lugar, debe excluir explícitamente cualquier vínculo directo a `place_id` en la respuesta al cliente.

---

## 2. Roles del MVP

Solo dos roles en esta fase — no la matriz completa de Super Admin/Admin/Business Owner del documento completo (esa granularidad es de Fase 2, cuando exista panel de negocio):

| Rol | Puede |
|---|---|
| `tourist` (default) | Ver mapa, zonas, lugares; reportar incidentes; guardar lugares (una vez registrado) |
| `admin` | Todo lo anterior + editar zonas, aprobar/rechazar lugares nuevos, aprobar/rechazar reportes, ver métricas básicas |

---

## 3. Row Level Security — patrón obligatorio

Toda tabla con datos sensibles o editables debe tener policy explícita, nunca depender de que el frontend oculte un botón.

```sql
-- Lectura pública: cualquiera puede ver zonas activas (dato de seguridad público)
CREATE POLICY "public_read_zones" ON zones
  FOR SELECT USING (active = true);

-- Solo admins crean/editan/borran zonas (FOR ALL cubre INSERT+UPDATE+DELETE+SELECT;
-- "FOR INSERT OR UPDATE OR DELETE" NO es sintaxis válida en Postgres, cada policy
-- toma un solo comando o ALL)
CREATE POLICY "admin_manage_zones" ON zones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Un incidente solo es visible completo (con reported_by) para su propio autor o un admin
CREATE POLICY "incident_owner_or_admin" ON incidents
  FOR SELECT USING (
    reported_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- La policy de creación de reportes (INSERT) vive completa en la sección 6
-- de este documento, fusionada con el candado geoespacial anti-spam —
-- IMPORTANTE: no crear una segunda policy de INSERT aparte para "solo pending",
-- ya que Postgres combina policies permisivas del mismo comando con OR, y eso
-- anularía el candado geoespacial si quedara en una policy separada.
```

Toda vista pública de incidentes (ej. contador de reportes por zona en el detalle de zona) debe ser una **vista o query agregada** que nunca exponga `reported_by` ni `place_id` al cliente.

---

## 4. Moderación obligatoria

- Ningún reporte afecta `risk_score` público sin que un admin lo apruebe primero.
- El flujo es: `usuario reporta → status: pending → admin revisa en /admin/reportes → approved (afecta risk_score de la zona) o rejected`.
- Un competidor o troll puede reportar falso para dañar una zona o un negocio — la moderación es la única barrera contra esto en el MVP (el sistema de reputación por usuario del documento completo se deja para Fase 2/3).

---

## 5. Datos de usuario y privacidad

- Recolectar el mínimo de PII necesario: email, nombre, idioma preferido. Nada más en el MVP.
- Ubicación del usuario: se usa para calcular cercanía en el momento, no se almacena un historial de movimiento. Si se necesita guardar la última ubicación conocida por razones de producto, debe quedar documentado aquí con su tiempo de retención antes de implementarse.
- GDPR: como se espera turismo internacional, cualquier campo nuevo de datos personales debe evaluarse contra este estándar antes de agregarse (aplica igual aunque el MVP arranque solo en Panamá).

---

## 6. Validación y anti-abuso (básico en MVP, ver `OPTIMIZATION.md` para rate limiting técnico)

- Todo formulario de reporte de incidente valida en el servidor (no confiar solo en validación de cliente): `incident_type` dentro de enum, `severity` 1–3, `description` con límite de longitud razonable.
- Un usuario no autenticado no puede crear incidentes ni lugares — el registro se pide justo en ese punto de fricción (consistente con `UI_GUIDELINES.md` sección 1).

**Candado geoespacial anti-spam (obligatorio):** un reporte de incidente solo puede crearse si la ubicación enviada por el usuario está razonablemente cerca de la zona (`zone_id`) que dice reportar. Esto evita reportes falsos hechos a distancia (ej. un competidor reportando una zona sin estar ahí).

```sql
-- Única policy de INSERT para incidents: reunir aquí TODAS las condiciones
-- (dueño, estado inicial, y geocerca) — no separarla en varias policies de
-- INSERT, porque Postgres las combina con OR y debilitaría el candado.
CREATE POLICY "tourist_can_report" ON incidents
  FOR INSERT WITH CHECK (
    reported_by = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM zones z
      WHERE z.id = zone_id
      AND ST_DWithin(z.geometry, location, 100) -- metros de tolerancia
    )
  );
```

**Por qué `ST_DWithin` con tolerancia y no `ST_Within` estricto:** el GPS en zona urbana densa (edificios coloniales de Casco Viejo) puede tener un margen de error real de 10–50 metros. Exigir que el punto esté *estrictamente dentro* del polígono rechazaría reportes legítimos hechos justo en el borde de una zona. Un buffer de tolerancia (100m como referencia, ajustable) resuelve esto sin abrir la puerta a reportes hechos a kilómetros de distancia.

Este candado es un filtro adicional, **no reemplaza la moderación** de la sección 4 — evita reportes falsos hechos a distancia, pero no evita que alguien mienta estando físicamente en el lugar; para eso sigue existiendo la cola de aprobación de un admin.

---

## 7. Trazabilidad de acciones administrativas (`audit_log`)

Para evitar disputas internas de "¿quién aprobó/cambió esto?", **toda acción de un admin sobre `zones`, `places` o `incidents` debe registrarse en `audit_log` en la misma operación que la ejecuta** — nunca como un paso separado o "para después".

**Reglas obligatorias:**

- Cualquier `UPDATE`/`INSERT` que cambie `risk_level`, `risk_score` o el polígono de una `zone`, cualquier aprobación/rechazo de `place`, y cualquier aprobación/rechazo de `incident`, debe generar una fila en `audit_log` con `actor_id = auth.uid()` real (no un valor por defecto ni un service role genérico).
- `details` debe guardar al menos qué campo cambió y su valor anterior cuando aplique (ej. `{"risk_level": {"from": "medium", "to": "high"}}`), no solo "se editó algo".
- Un admin no puede insertar una fila de `audit_log` con `actor_id` distinto al suyo — la policy de RLS lo debe impedir (ver abajo).

**RLS de `audit_log`:**

```sql
-- Solo admins pueden leer el historial de auditoría
CREATE POLICY "admin_only_read_audit" ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Solo se puede insertar como uno mismo, y solo si eres admin
CREATE POLICY "admin_insert_own_audit" ON audit_log
  FOR INSERT WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Nadie edita ni borra el historial, ni siquiera un admin (integridad del log)
-- No se define policy de UPDATE/DELETE → queda bloqueado por defecto en RLS.
```

- `audit_log` **nunca se expone en ninguna pantalla pública del turista** — es control interno, se muestra únicamente dentro de `/admin` (ver `UI_GUIDELINES.md` sección 9).
- El log no se puede editar ni borrar por diseño (sin policies de `UPDATE`/`DELETE`), para que tenga valor real como fuente de verdad ante un malentendido.

---

## 8. Cómo agregar una regla de seguridad nueva

1. Si la feature nueva toca una tabla, escribir su policy de RLS en el mismo commit que la migración (ver `ARCHITECTURE_RULES.md` sección 5) — nunca "la agrego después".
2. Si la feature expone datos de un usuario a otro usuario (ej. mostrar quién reportó algo, mostrar el negocio vinculado a un incidente), debe pasar primero por la regla de la sección 1 de este documento.
3. Documentar la policy nueva en la sección 3 de este archivo.
4. Si hay duda de si algo es un riesgo legal (no solo técnico), tratarlo como riesgo legal y preguntar antes de implementar — no asumir que "total es solo un MVP".
