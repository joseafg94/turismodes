"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { getTranslations } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const t = getTranslations("es");
  const supabase = getSupabaseClient();
  const [status, setStatus] = useState<
    "loading" | "login" | "denied" | "authorized"
  >("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  useEffect(() => {
    async function verifyAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("login");
        return;
      }

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      setStatus(data?.role === "admin" ? "authorized" : "denied");
    }

    void verifyAdmin();
  }, [supabase]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(false);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setLoginError(true);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    setStatus(profile?.role === "admin" ? "authorized" : "denied");
  }

  if (status === "loading") {
    return (
      <main
        aria-label={t.admin.loading}
        className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8"
        role="status"
      >
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200" />
      </main>
    );
  }

  if (status === "login") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-6 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="font-heading text-3xl font-bold">
            {t.admin.loginTitle}
          </h1>
          <form className="mt-6 grid gap-4" onSubmit={signIn}>
            <label className="grid gap-2 font-semibold">
              {t.admin.email}
              <input
                className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label className="grid gap-2 font-semibold">
              {t.admin.password}
              <input
                className="min-h-12 rounded-xl border border-slate-300 px-3 font-normal"
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
              {t.admin.loginSubmit}
            </button>
            {loginError && (
              <p className="text-slate-600" role="alert">
                {t.admin.loginError}
              </p>
            )}
          </form>
        </section>
      </main>
    );
  }

  if (status === "denied") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="font-heading text-3xl font-bold">
            {t.admin.accessDenied}
          </h1>
        </section>
      </main>
    );
  }

  return children;
}
