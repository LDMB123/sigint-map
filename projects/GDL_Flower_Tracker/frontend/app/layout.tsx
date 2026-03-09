import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Playfair_Display } from "next/font/google";

import { MonitoringClient } from "@/components/monitoring-client";

import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const display = Playfair_Display({
  subsets: ["latin"],
  display: "optional",
  preload: false,
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "optional",
  preload: false,
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "GDL Flower Tracker",
  description: "Decision-first Green Dot Labs availability, pricing, and trend tracking around Colorado Springs.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GDL Tracker",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#10211b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const sentryEnvironment = process.env.SENTRY_ENVIRONMENT || process.env.APP_ENV || "production";
  const releaseSha = process.env.RELEASE_SHA || "dev";

  return (
    <html lang="en" data-theme="dark">
      <body className={`${sans.variable} ${display.variable} ${mono.variable}`}>
        <MonitoringClient environment={sentryEnvironment} release={releaseSha} />
        {children}
      </body>
    </html>
  );
}
