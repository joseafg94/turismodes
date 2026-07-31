"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getTranslations } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";

type ZoneOption = {
  id: string;
  name_es: string;
};

type Coordinates = {
  lat: number;
  lng: number;
};

export default function IncidentForm() {
  const t = getTranslations("es");
  const supabase = getSupabaseClient();
  const [user, setUser] = useState<User>();
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [incidentType, setIncidentType] = useState("theft");
  const [severity, setSeverity] = useState("1");
  const [description, setDescription] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates>();
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [authRequired, setAuthRequired] = useState(false);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [formStatus, setFormStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? undefined);
    });

    void supabase
      .from("zones")
      .select("id,name_es")
      .eq("active", true)
      .order("name_es")
      .then(({ data }) => {
        const options = (data ?? []) as ZoneOption[];
        setZones(options);
        setZoneId((current) => current || options[0]?.id || "");
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  function requestLocation() {
    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ lat: coords.latitude, lng: coords.longitude });
        setLocationStatus("ready");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 },
    );
  }

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");

    if (authMode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            preferred_lang: "es",
          },
        },
      });

      if (error) {
        setAuthMessage(t.report.authError);
        return;
      }

      if (!data.session) {
        setAuthMessage(t.report.confirmEmail);
        return;
      }

      setUser(data.user ?? undefined);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthMessage(t.report.authError);
        return;
      }

      setUser(data.user);
    }

    setAuthRequired(false);
    setAuthMessage("");
  }

  async function submitIncident(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormStatus("idle");

    if (!user) {
      setAuthRequired(true);
      return;
    }

    if (!coordinates || !zoneId) {
      setLocationStatus("error");
      return;
    }

    setFormStatus("submitting");
    const { error } = await supabase.rpc("report_incident", {
      p_zone_id: zoneId,
      p_incident_type: incidentType,
      p_severity: Number(severity),
      p_description: description,
      p_lat: coordinates.lat,
      p_lng: coordinates.lng,
    });

    if (error) {
      setFormStatus("error");
      return;
    }

    setDescription("");
    setFormStatus("success");
  }

  return (
    <div className="mt-8 grid gap-6">
      <form
        className="grid gap-5 rounded-2xl bg-white p-6 shadow-sm"
        onSubmit={submitIncident}
      >
        <label className="grid gap-2 font-semibold">
          {t.report.zoneLabel}
          <select
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-normal"
            onChange={(event) => setZoneId(event.target.value)}
            required
            value={zoneId}
          >
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name_es}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 font-semibold">
          {t.report.typeLabel}
          <select
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-normal"
            onChange={(event) => setIncidentType(event.target.value)}
            value={incidentType}
          >
            <option value="theft">{t.report.types.theft}</option>
            <option value="scam">{t.report.types.scam}</option>
            <option value="harassment">{t.report.types.harassment}</option>
            <option value="other">{t.report.types.other}</option>
          </select>
        </label>

        <label className="grid gap-2 font-semibold">
          {t.report.severityLabel}
          <select
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-normal"
            onChange={(event) => setSeverity(event.target.value)}
            value={severity}
          >
            <option value="1">{t.report.severities.one}</option>
            <option value="2">{t.report.severities.two}</option>
            <option value="3">{t.report.severities.three}</option>
          </select>
        </label>

        <label className="grid gap-2 font-semibold">
          {t.report.descriptionLabel}
          <textarea
            className="min-h-32 rounded-xl border border-slate-300 p-3 font-normal"
            maxLength={1000}
            minLength={10}
            onChange={(event) => setDescription(event.target.value)}
            required
            value={description}
          />
        </label>

        <div>
          <p className="font-semibold">{t.report.locationLabel}</p>
          <button
            className="mt-2 rounded-xl bg-white px-4 py-3 font-semibold text-primary shadow-sm ring-1 ring-slate-200"
            onClick={requestLocation}
            type="button"
          >
            {locationStatus === "loading"
              ? t.report.locationLoading
              : t.report.locationButton}
          </button>
          {locationStatus === "ready" && (
            <p className="mt-2 text-sm text-slate-600">
              {t.report.locationReady}
            </p>
          )}
          {locationStatus === "error" && (
            <p className="mt-2 text-sm text-slate-600">
              {t.report.locationError}
            </p>
          )}
        </div>

        <button
          className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-white disabled:opacity-50"
          disabled={formStatus === "submitting"}
          type="submit"
        >
          {formStatus === "submitting"
            ? t.report.submitting
            : t.report.submit}
        </button>

        {formStatus === "success" && (
          <p className="text-slate-600" role="status">
            {t.report.success}
          </p>
        )}
        {formStatus === "error" && (
          <p className="text-slate-600" role="alert">
            {t.report.submitError}
          </p>
        )}
      </form>

      {authRequired && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-heading text-2xl font-bold">
            {t.report.authTitle}
          </h2>
          <p className="mt-2 text-slate-600">{t.report.authDescription}</p>
          <div className="mt-4 flex gap-2">
            <button
              className="rounded-xl bg-primary px-4 py-2 font-semibold text-white"
              onClick={() => setAuthMode("register")}
              type="button"
            >
              {t.report.register}
            </button>
            <button
              className="rounded-xl bg-white px-4 py-2 font-semibold text-primary ring-1 ring-slate-200"
              onClick={() => setAuthMode("login")}
              type="button"
            >
              {t.report.login}
            </button>
          </div>
          <form className="mt-5 grid gap-4" onSubmit={authenticate}>
            {authMode === "register" && (
              <label className="grid gap-2 font-semibold">
                {t.report.fullName}
                <input
                  className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal"
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  value={fullName}
                />
              </label>
            )}
            <label className="grid gap-2 font-semibold">
              {t.report.email}
              <input
                className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className="grid gap-2 font-semibold">
              {t.report.password}
              <input
                className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <button
              className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-white"
              type="submit"
            >
              {authMode === "register"
                ? t.report.registerSubmit
                : t.report.loginSubmit}
            </button>
            {authMessage && (
              <p className="text-sm text-slate-600" role="status">
                {authMessage}
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
