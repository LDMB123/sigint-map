"use client";

import { useEffect } from "react";

import * as Sentry from "@sentry/browser";

declare global {
  interface Window {
    __gdlSentryInit?: boolean;
  }
}

function sentryEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

type MonitoringClientProps = {
  environment: string;
  release: string;
};

export function MonitoringClient({ environment, release }: MonitoringClientProps) {
  useEffect(() => {
    if (!sentryEnabled() || window.__gdlSentryInit) {
      return;
    }

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment,
      release,
      sendDefaultPii: false,
      tracesSampleRate: 0,
    });

    window.__gdlSentryInit = true;
  }, []);

  return null;
}
