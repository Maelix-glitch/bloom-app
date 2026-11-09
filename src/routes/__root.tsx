import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { registerServiceWorker } from "@/hooks/useInstallPrompt";
import { bootNativeShell } from "@/lib/native-shell";
import { installErrorTelemetry } from "@/lib/telemetry";
import { useSoundBoot } from "@/hooks/useSound";
import { useAmbientSound } from "@/hooks/useAmbientSound";
import { WelcomeGate } from "@/components/welcome/WelcomeGate";
import { AccessGate } from "@/components/auth/AccessGate";
import { BloomLogo } from "@/components/BloomLogo";
import { useSession } from "@/hooks/useSession";
import { hasSupabaseConfig } from "@/lib/supabase";
import { AdminBar } from "@/components/welcome/AdminBar";
import { ConnectionNotice } from "@/components/system/ConnectionNotice";
import { BloomToaster } from "@/components/system/BloomToaster";
import { PointsAwardToast } from "@/components/system/PointsAwardToast";
import { RemindersEngine } from "@/components/system/RemindersEngine";
import { RouteProgress } from "@/components/system/RouteProgress";
import { BloomSkin } from "@/components/rewards/BloomSkin";

/**
 * The two screens every lost or unlucky visitor is guaranteed to meet, so
 * they speak Bloom like everything else (Wave 1): the EmptyState pattern —
 * the botanical mark in its quiet ring, a Fraunces headline, one calm line,
 * the kit's gold pill home. Only the words and the way out differ; the
 * routing and error mechanics are exactly what they were.
 */
function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[var(--tracking-meta)] text-gold">
          404 · Page not found
        </p>
        <EmptyState
          title={
            <>
              This path has <span className="display-em">wandered off</span>
            </>
          }
          description="The page you're looking for doesn't exist or has been moved. Everything you've logged is exactly where you left it."
          action={
            <Button asChild>
              <Link to="/">Go home</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <EmptyState
          title={
            <>
              This page didn't <span className="display-em">load</span>
            </>
          }
          description="Something went wrong on our end. You can try again, or head back home — your record is safe either way."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={() => {
                  router.invalidate();
                  reset();
                }}
              >
                Try again
              </Button>
              <Button asChild variant="ghost">
                <a href="/">Go home</a>
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}

/**
 * Invite-only access control.
 *
 * Bloom is by invitation, so when an account system is connected an uninvited
 * or signed-out visitor gets the door instead of the app. The app is *not*
 * rendered behind it — that would let private routes fetch on someone's behalf
 * while a panel told them they couldn't come in.
 *
 * Two deliberate carve-outs:
 *
 *   · **No database means no accounts**, so there is nothing to enforce. A copy
 *     of Bloom with no project configured stays open, and `ConnectionNotice`
 *     already explains the situation.
 *   · **Nothing renders while the session is unknown.** `useSession` cannot see
 *     localStorage or a session during the server pass, so gating on it
 *     immediately would flash the door at every signed-in user on first paint.
 *     The cost is that a signed-out visitor briefly sees the app shell — which
 *     is the same trade `WelcomeGate` and `useAdminAccess` already make, and
 *     the lesser evil. The server-side trigger is the real enforcement.
 */
/* Legal pages are public in every deployment, configured or not. */
const PUBLIC_ROUTES = ["/privacy", "/terms"];

function AccessControl({ children }: { children: ReactNode }) {
  const session = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const isPublicRoute = useRouterState({
    select: (s) => PUBLIC_ROUTES.includes(s.location.pathname),
  });

  if (isPublicRoute) return <>{children}</>;
  if (!hasSupabaseConfig) return <>{children}</>;
  if (!mounted || !session.ready) return <>{children}</>;
  if (session.userId !== null) return <>{children}</>;
  return <AccessGate />;
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
      /* Type is self-hosted: Fraunces, Inter, IBM Plex Mono and Caveat
         (the U1 system + the D4 Stories exception) are @font-face rules in
         styles/fonts.css, imported by appCss below, with the woff2 files
         served from /fonts. Cormorant Garamond + Oswald stay Stories-scoped
         via styles/fonts-stories.css on /, /profile and /$handle. */
      {
        rel: "stylesheet",
        href: appCss,
      },
      /* First-paint type: preload the two faces every page opens with —
         Fraunces (display) and Inter 400 (body) — so the hero never swaps
         in from a fallback font. Latin only; latin-ext loads on demand. */
      {
        rel: "preload",
        href: "/fonts/Fraunces-latin-normal-300700.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: "/fonts/Inter-latin-normal-400.woff2",
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/bloom/icons/icon-192.png" },
      /* B7 — iOS launch splash: no white flash when opening from home screen.
         Regenerate with `node scripts/pwa-splash.mjs` if the icon changes. */
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-640x1136.png",
        media:
          "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-750x1334.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-1125x2436.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-1170x2532.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-1179x2556.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-1242x2688.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-1284x2778.png",
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-1290x2796.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-1488x2266.png",
        media:
          "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-1536x2048.png",
        media:
          "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-1668x2388.png",
        media:
          "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/bloom/splash/splash-2048x2732.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
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
          {/* The favicon's arc, bare on the splash's obsidian — as before. */}
          <BloomLogo size={76} className="bloom-boot-mark" arcClassName="bloom-boot-arc" />
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
  /* Page transitions: keying the wrapper by pathname remounts it on every
     navigation, replaying the .bloom-page-enter crossfade (opacity only —
     a transform would trap position:fixed descendants in a containing
     block). Pages keep their own richer entrances; this just removes the
     hard cut between routes. */
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  /* B6 — the offline shell. Registered after load, never blocking first paint. */
  useEffect(() => {
    registerServiceWorker();
  }, []);

  /* Error telemetry: report() calls land in the sink from anywhere, and
     this installs the global net (uncaught errors, unhandled rejections,
     flush on hide) exactly once. */
  useEffect(() => {
    installErrorTelemetry();
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
        <AccessControl>
          <div key={pathname} className="bloom-page-enter">
            <Outlet />
          </div>
        </AccessControl>
        {/* First run only: covers the app until the person has told us who they are. */}
        <WelcomeGate />
        {/* Only in admin mode: shows you're in it, and lets you leave. */}
        <AdminBar />
        {/* Only when there is no database: says so, instead of failing silently. */}
        <ConnectionNotice />
        {/* Equipped Atelier look → app-wide skin (no-op until something is equipped). */}
        <BloomSkin />
        {/* Reminder delivery: fires due nudges from boot on every route. */}
        <RemindersEngine />
        {/* One toast surface for every route — a confirmation that never renders
            is a silent failure the person can't tell apart from a real one. */}
        <BloomToaster />
        <PointsAwardToast />
        {/* Global tour FAB + auto-prompt for new users */}
    </QueryClientProvider>
  );
}
