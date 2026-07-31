"use client";

import posthog from "posthog-js";

let initialized = false;

export function initPostHog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (typeof window === "undefined" || initialized || !key) {
    return posthog;
  }

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: "2026-05-30",
  });
  initialized = true;

  return posthog;
}

export { posthog };
