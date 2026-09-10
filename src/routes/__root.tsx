import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { registerServiceWorker } from "@/hooks/useInstallPrompt";
import { bootNativeShell } from "@/lib/native-shell";
import { useSoundBoot } from "@/hooks/useSound";
import { useAmbientSound } from "@/hooks/useAmbientSound";
import { WelcomeGate } from "@/components/welcome/WelcomeGate";
import { AdminBar } from "@/components/welcome/AdminBar";
import { ConnectionNotice } from "@/components/system/ConnectionNotice";
import { BloomToaster } from "@/components/system/BloomToaster";
import { RouteProgress } from "@/components/system/RouteProgress";
import { BloomSkin } from "@/components/rewards/BloomSkin";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Bloom — Mood Intelligence" },
      {
        name: "description",
        content:
          "A private analytics command center for your emotional life — trends, rhythms, correlations, anomalies and insights computed entirely from what you log.",
      },
      { property: "og:title", content: "Bloom — Mood Intelligence" },
      {
        property: "og:description",
        content:
          "A private analytics command center for your emotional life — trends, rhythms, correlations, anomalies and insights computed entirely from what you log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      /* B6 — installable: the phone needs a theme colour and a display hint */
      { name: "theme-color", content: "#14151f" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Bloom" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/bloom/icons/icon-192.png" },
      /* B7 — iOS launch splash: no white flash when opening from home screen.
         Regenerate with `node scripts/pwa-splash.mjs` if the icon changes. */
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-640x1136.png", media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-1488x2266.png", media: "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-1536x2048.png", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-1668x2388.png", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { rel: "apple-touch-startup-image", href: "/bloom/splash/splash-2048x2732.png", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* B8 — instant boot splash. Server-rendered before the JS bundle, so
            the very first paint is branded Bloom — on the website, the
            installed PWA and the Capacitor wrapper alike. RootComponent fades
            it out the moment React has mounted. Everything is inline on
            purpose: no stylesheet or font may gate the first paint. */}
        <div id="bloom-boot" role="presentation" aria-hidden="true">
          <div className="bloom-boot-glow" />
          <svg
            className="bloom-boot-mark"
            width="76"
            height="76"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
          >
            <path
              className="bloom-boot-arc"
              d="M4 20c3-9 7-14 10-14s7 5 10 14"
              stroke="url(#bloom-boot-g)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="100"
            />
            <defs>
              <linearGradient
                id="bloom-boot-g"
                x1="4"
                y1="13"
                x2="24"
                y2="13"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#7FA88F" />
                <stop offset="1" stopColor="#E8B75E" />
              </linearGradient>
            </defs>
          </svg>
          <div className="bloom-boot-word">Bloom</div>
        </div>
        <style>{`#bloom-boot{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;background:#14151f;transition:opacity .45s ease}
#bloom-boot.bloom-boot-done{opacity:0;pointer-events:none}
.bloom-boot-glow{position:absolute;width:300px;height:300px;border-radius:9999px;background:radial-gradient(closest-side,rgba(232,183,94,.13),transparent 70%);animation:bloom-boot-breathe 2.6s ease-in-out infinite}
.bloom-boot-mark{position:relative}
.bloom-boot-arc{stroke-dasharray:100;animation:bloom-boot-draw 1.1s ease-out both}
.bloom-boot-word{position:relative;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:11px;font-weight:500;letter-spacing:.44em;text-indent:.44em;text-transform:uppercase;color:#8b8fa3;animation:bloom-boot-rise .7s ease-out .15s both}
@keyframes bloom-boot-draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes bloom-boot-breathe{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
@keyframes bloom-boot-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.bloom-boot-glow,.bloom-boot-arc,.bloom-boot-word{animation:none}}`}</style>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  /* B6 — the offline shell. Registered after load, never blocking first paint. */
  useEffect(() => {
    registerServiceWorker();
  }, []);

  /* B7 — inside the Capacitor wrapper: light status bar on our dark theme. */
  useEffect(() => {
    bootNativeShell();
  }, []);

  /* B8 — first React paint has landed: fade the boot splash, then remove it. */
  useEffect(() => {
    const boot = document.getElementById("bloom-boot");
    if (!boot) return;
    const raf = requestAnimationFrame(() => {
      boot.classList.add("bloom-boot-done");
      window.setTimeout(() => boot.remove(), 500);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  /* Sound: read the preference, and arm the audio context on the first gesture. */
  useSoundBoot();
  /* One delegated listener gives every control its cue — except on Rewards. */
  useAmbientSound();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      {/* First run only: covers the app until the person has told us who they are. */}
      <WelcomeGate />
      {/* Only in admin mode: shows you're in it, and lets you leave. */}
      <AdminBar />
      {/* Only when there is no database: says so, instead of failing silently. */}
      <ConnectionNotice />
      {/* Equipped Atelier look → app-wide skin (no-op until something is equipped). */}
      <BloomSkin />
      {/* One toast surface for every route — a confirmation that never renders
          is a silent failure the person can't tell apart from a real one. */}
      <BloomToaster />
    </QueryClientProvider>
  );
}
