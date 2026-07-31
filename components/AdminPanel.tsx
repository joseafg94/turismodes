"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { getTranslations } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";

type RiskLevel = "low" | "medium" | "high" | "unknown";

type Zone = {
  description_en: string | null;
  description_es: string | null;
  geometry: GeoJSON.Polygon;
  id: string;
  name_en: string;
  name_es: string;
  risk_level: RiskLevel;
};

type Place = {
  category: string | null;
  id: string;
  name: string;
};

type Incident = {
  description: string;
  id: string;
  incident_type: string;
  occurred_at: string;
  place_id: string | null;
  place_name: string | null;
  severity: number;
  status: string;
  zone_id: string;
  zone_name: string;
};

type AuditEntry = {
  action: string;
  actor: { full_name: string | null; role: string } | null;
  created_at: string;
  entity_id: string;
  entity_type: string;
  id: string;
};

function AuditTrail({
  entries,
  emptyLabel,
}: {
  emptyLabel: string;
  entries: AuditEntry[];
}) {
  const t = getTranslations("es");

  if (entries.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4">
      {entries.slice(0, 5).map((entry) => {
        const approved = entry.action.endsWith("_approved");
        const rejected = entry.action.endsWith("_rejected");
        const action = approved
          ? t.admin.audit.approved
          : rejected
            ? t.admin.audit.rejected
            : t.admin.audit.edited;
        const symbol = approved ? "✓" : rejected ? "✗" : "✎";
        const actorName = entry.actor?.full_name ?? t.admin.audit.unknownActor;

        return (
          <li className="text-sm text-slate-600" key={entry.id}>
            {symbol} {action} {t.admin.audit.by} {actorName} (
            {entry.actor?.role ?? t.admin.audit.adminRole}) —{" "}
            {new Intl.DateTimeFormat("es-PA", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "America/Panama",
            }).format(new Date(entry.created_at))}
          </li>
        );
      })}
    </ul>
  );
}

function ZoneEditor({
  audit,
  onSaved,
  zone,
}: {
  audit: AuditEntry[];
  onSaved: () => Promise<void>;
  zone: Zone;
}) {
  const t = getTranslations("es");
  const supabase = getSupabaseClient();
  const [nameEs, setNameEs] = useState(zone.name_es);
  const [nameEn, setNameEn] = useState(zone.name_en);
  const [descriptionEs, setDescriptionEs] = useState(
    zone.description_es ?? "",
  );
  const [descriptionEn, setDescriptionEn] = useState(
    zone.description_en ?? "",
  );
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(zone.risk_level);
  const [geometry, setGeometry] = useState(
    JSON.stringify(zone.geometry, null, 2),
  );
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    let parsedGeometry: GeoJSON.Polygon;

    try {
      parsedGeometry = JSON.parse(geometry) as GeoJSON.Polygon;
    } catch {
      setMessage(t.admin.zones.invalidGeometry);
      return;
    }

    const { error } = await supabase.rpc("admin_update_zone", {
      p_zone_id: zone.id,
      p_name_es: nameEs,
      p_name_en: nameEn,
      p_description_es: descriptionEs,
      p_description_en: descriptionEn,
      p_risk_level: riskLevel,
      p_geometry_geojson: parsedGeometry,
    });

    if (error) {
      setMessage(t.admin.actionError);
      return;
    }

    setMessage(t.admin.zones.saved);
    await onSaved();
  }

  return (
    <form
      className="grid gap-4 rounded-2xl bg-white p-6 shadow-sm"
      onSubmit={save}
    >
      <h3 className="font-heading text-xl font-bold">{zone.name_es}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 font-semibold">
          {t.admin.zones.nameEs}
          <input
            className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal"
            onChange={(event) => setNameEs(event.target.value)}
            required
            value={nameEs}
          />
        </label>
        <label className="grid gap-2 font-semibold">
          {t.admin.zones.nameEn}
          <input
            className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal"
            onChange={(event) => setNameEn(event.target.value)}
            required
            value={nameEn}
          />
        </label>
      </div>
      <label className="grid gap-2 font-semibold">
        {t.admin.zones.descriptionEs}
        <textarea
          className="min-h-24 rounded-xl border border-slate-300 p-3 font-normal"
          onChange={(event) => setDescriptionEs(event.target.value)}
          value={descriptionEs}
        />
      </label>
      <label className="grid gap-2 font-semibold">
        {t.admin.zones.descriptionEn}
        <textarea
          className="min-h-24 rounded-xl border border-slate-300 p-3 font-normal"
          onChange={(event) => setDescriptionEn(event.target.value)}
          value={descriptionEn}
        />
      </label>
      <label className="grid gap-2 font-semibold">
        {t.admin.zones.riskLevel}
        <select
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-normal"
          onChange={(event) =>
            setRiskLevel(event.target.value as RiskLevel)
          }
          value={riskLevel}
        >
          <option value="low">{t.admin.riskLevels.low}</option>
          <option value="medium">{t.admin.riskLevels.medium}</option>
          <option value="high">{t.admin.riskLevels.high}</option>
          <option value="unknown">{t.admin.riskLevels.unknown}</option>
        </select>
      </label>
      <label className="grid gap-2 font-semibold">
        {t.admin.zones.geometry}
        <textarea
          className="min-h-48 rounded-xl border border-slate-300 p-3 font-mono text-sm font-normal"
          onChange={(event) => setGeometry(event.target.value)}
          required
          value={geometry}
        />
      </label>
      <button
        className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-white"
        type="submit"
      >
        {t.admin.zones.save}
      </button>
      {message && (
        <p className="text-sm text-slate-600" role="status">
          {message}
        </p>
      )}
      <AuditTrail emptyLabel={t.admin.audit.empty} entries={audit} />
    </form>
  );
}

export default function AdminPanel() {
  const t = getTranslations("es");
  const supabase = getSupabaseClient();
  const [zones, setZones] = useState<Zone[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const loadData = useCallback(async () => {
    setStatus("loading");
    const [zonesResult, placesResult, incidentsResult] = await Promise.all([
      supabase
        .from("zones")
        .select(
          "id,name_es,name_en,description_es,description_en,risk_level,geometry",
        )
        .order("name_es"),
      supabase
        .from("places")
        .select("id,name,category")
        .eq("verified", false)
        .eq("active", true)
        .order("name"),
      supabase.rpc("admin_incidents", { p_status: "pending" }),
    ]);

    if (zonesResult.error || placesResult.error || incidentsResult.error) {
      setStatus("error");
      return;
    }

    const nextZones = (zonesResult.data ?? []) as Zone[];
    const nextPlaces = (placesResult.data ?? []) as Place[];
    const nextIncidents = (incidentsResult.data ?? []) as Incident[];
    const entityIds = [
      ...nextZones.map((zone) => zone.id),
      ...nextPlaces.map((place) => place.id),
      ...nextIncidents.map((incident) => incident.id),
    ];

    let nextAudit: AuditEntry[] = [];

    if (entityIds.length > 0) {
      const { data } = await supabase
        .from("audit_log")
        .select(
          "id,action,entity_type,entity_id,created_at,actor:users!audit_log_actor_id_fkey(full_name,role)",
        )
        .in("entity_id", entityIds)
        .order("created_at", { ascending: false })
        .limit(100);

      nextAudit = (data ?? []) as unknown as AuditEntry[];
    }

    setZones(nextZones);
    setPlaces(nextPlaces);
    setIncidents(nextIncidents);
    setAudit(nextAudit);
    setStatus("ready");
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function moderatePlace(id: string, decision: "approved" | "rejected") {
    const { error } = await supabase.rpc("admin_moderate_place", {
      p_place_id: id,
      p_decision: decision,
    });

    if (error) {
      setStatus("error");
      return;
    }

    await loadData();
  }

  async function moderateIncident(
    id: string,
    decision: "approved" | "rejected",
  ) {
    const { error } = await supabase.rpc("admin_moderate_incident", {
      p_incident_id: id,
      p_decision: decision,
    });

    if (error) {
      setStatus("error");
      return;
    }

    await loadData();
  }

  function auditFor(entityType: string, entityId: string) {
    return audit.filter(
      (entry) =>
        entry.entity_type === entityType && entry.entity_id === entityId,
    );
  }

  const incidentTypeLabels = t.report.types as Record<string, string>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
      <AppNav />
      <header className="mt-8">
        <h1 className="font-heading text-3xl font-bold">{t.admin.title}</h1>
        <nav className="mt-4 flex flex-wrap gap-2">
          <a className="rounded-xl bg-white px-4 py-2 shadow-sm" href="#zones">
            {t.admin.sections.zones}
          </a>
          <a className="rounded-xl bg-white px-4 py-2 shadow-sm" href="#places">
            {t.admin.sections.places}
          </a>
          <a
            className="rounded-xl bg-white px-4 py-2 shadow-sm"
            href="#incidents"
          >
            {t.admin.sections.incidents}
          </a>
        </nav>
      </header>

      {status === "loading" && (
        <div
          aria-label={t.admin.loading}
          className="mt-8 grid gap-4"
          role="status"
        >
          {[0, 1, 2].map((item) => (
            <div
              className="h-40 animate-pulse rounded-2xl bg-slate-200"
              key={item}
            />
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="mt-8 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
          {t.admin.loadError}
        </p>
      )}

      {status === "ready" && (
        <div className="mt-10 grid gap-12">
          <section id="zones">
            <h2 className="font-heading text-2xl font-bold">
              {t.admin.sections.zones}
            </h2>
            <div className="mt-5 grid gap-5">
              {zones.map((zone) => (
                <ZoneEditor
                  audit={auditFor("zone", zone.id)}
                  key={zone.id}
                  onSaved={loadData}
                  zone={zone}
                />
              ))}
            </div>
          </section>

          <section id="places">
            <h2 className="font-heading text-2xl font-bold">
              {t.admin.sections.places}
            </h2>
            {places.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
                {t.admin.places.empty}
              </p>
            ) : (
              <ul className="mt-5 grid gap-4">
                {places.map((place) => (
                  <li
                    className="rounded-2xl bg-white p-6 shadow-sm"
                    key={place.id}
                  >
                    <h3 className="font-heading text-xl font-bold">
                      {place.name}
                    </h3>
                    <p className="mt-1 text-slate-500">
                      {place.category ?? t.admin.places.noCategory}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        className="rounded-xl bg-primary px-4 py-3 font-semibold text-white"
                        onClick={() => moderatePlace(place.id, "approved")}
                        type="button"
                      >
                        {t.admin.approve}
                      </button>
                      <button
                        className="rounded-xl bg-white px-4 py-3 font-semibold text-primary ring-1 ring-slate-200"
                        onClick={() => moderatePlace(place.id, "rejected")}
                        type="button"
                      >
                        {t.admin.reject}
                      </button>
                    </div>
                    <AuditTrail
                      emptyLabel={t.admin.audit.empty}
                      entries={auditFor("place", place.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section id="incidents">
            <h2 className="font-heading text-2xl font-bold">
              {t.admin.sections.incidents}
            </h2>
            {incidents.length === 0 ? (
              <p className="mt-5 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
                {t.admin.incidents.empty}
              </p>
            ) : (
              <ul className="mt-5 grid gap-4">
                {incidents.map((incident) => (
                  <li
                    className="rounded-2xl bg-white p-6 shadow-sm"
                    key={incident.id}
                  >
                    <h3 className="font-heading text-xl font-bold">
                      {incident.zone_name}
                    </h3>
                    <p className="mt-2 text-slate-600">
                      {t.admin.incidents.type}:{" "}
                      {incidentTypeLabels[incident.incident_type] ??
                        incident.incident_type}
                    </p>
                    <p className="text-slate-600">
                      {t.admin.incidents.severity}: {incident.severity}
                    </p>
                    <p className="mt-3 text-slate-700">
                      {incident.description}
                    </p>
                    {incident.place_name && (
                      <p className="mt-3 text-sm text-slate-500">
                        {t.admin.incidents.internalPlace}:{" "}
                        {incident.place_name}
                      </p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <button
                        className="rounded-xl bg-primary px-4 py-3 font-semibold text-white"
                        onClick={() =>
                          moderateIncident(incident.id, "approved")
                        }
                        type="button"
                      >
                        {t.admin.approve}
                      </button>
                      <button
                        className="rounded-xl bg-white px-4 py-3 font-semibold text-primary ring-1 ring-slate-200"
                        onClick={() =>
                          moderateIncident(incident.id, "rejected")
                        }
                        type="button"
                      >
                        {t.admin.reject}
                      </button>
                    </div>
                    <AuditTrail
                      emptyLabel={t.admin.audit.empty}
                      entries={auditFor("incident", incident.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
