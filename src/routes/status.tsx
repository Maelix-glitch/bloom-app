import { useEffect, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { BloomLogo } from "@/components/BloomLogo";
import type { StatusPayload } from "@/lib/observability/status";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Bloom - Status" },
      {
        name: "description",
        content:
          "Is Bloom up, and is it fast? Live state and page speeds measured from real requests, updated every minute.",
      },
    ],
  }),
  component: StatusRoute,
});

/* Friendly names for the routes people actually open; anything
   else shows its path, which is honest and still readable. */
const ROUTE_LABELS: Record<string, string> = {
  "/": "Today",
  "/nutrition": "Nutrition",
  "/mood": "Mood",
  "/trackers": "Trackers",
  "/coach": "Coach",
  "/rewards": "Rewards",
  "/cycle": "Cycle",
  "/stories": "Stories",
  "/profile": "Profile",
  "/settings": "Settings",
  "/status": "This page",
};

function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function fmtCheckedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

type Load =
  | { kind: "loading" }
  | { kind: "ready"; payload: StatusPayload }
  | { kind: "unreachable" };

function StatusRoute() {
  const [load, setLoad] = useState<Load>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    const check = async () => {
      try {
        const res = await fetch("/api/status", { cache: "no-store" });
        if (!res.ok) throw new Error("status feed failed");
        const payload = (await res.json()) as StatusPayload;
        if (live) setLoad({ kind: "ready", payload });
      } catch {
        if (live) setLoad({ kind: "unreachable" });
      }
    };
    void check();
    const t = setInterval(check, 60_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  const payload = load.kind === "ready" ? load.payload : null;
  const anyDegraded = payload?.routes.some((r) => r.degraded) ?? false;
  const healthy = payload?.ok === true && !anyDegraded;

  const verdict =
    load.kind === "loading"
      ? "Checking on things…"
      : load.kind === "unreachable"
        ? "This page could not check."
        : !payload?.ok
          ? "Something needs attention."
          : anyDegraded
            ? "Running, but slower than usual."
            : "Everything is running normally.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-6 sm:px-8">
        <Link
          to="/"
          className="type-caption inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Bloom
        </Link>

        <header className="mt-10 flex items-start gap-4">
          <BloomLogo size={40} />
          <div>
            <p className="eyebrow">
              Bloom · status
            </p>
            <h1 className="mt-1 font-display text-[clamp(26px,5vw,38px)] italic leading-tight">
              {verdict}
            </h1>
          </div>
        </header>

        <p className="type-timestamp mt-3 flex items-center gap-2">
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${
              load.kind === "ready"
                ? healthy
                  ? "animate-pulse bg-sage"
                  : "bg-rose"
                : "bg-muted-foreground"
            }`}
          />
          {load.kind === "loading"
            ? "Asking the app how it is…"
            : load.kind === "unreachable"
              ? "The status check itself could not get through."
              : `Last checked ${fmtCheckedAt(payload!.checkedAt)} · this page re-checks every minute`}
        </p>

        <section className="mt-10">
          <h2 className="eyebrow">
            The service
          </h2>
          <div className="mt-4 flex items-center justify-between border-t border-border py-4">
            <span className="text-[length:var(--text-callout)] text-foreground/90">App and database</span>
            <span
              className={`text-[length:var(--text-support)] font-medium ${
                load.kind !== "ready"
                  ? "text-muted-foreground"
                  : payload!.ok
                    ? "text-sage"
                    : "text-rose"
              }`}
            >
              {load.kind === "loading"
                ? "Checking…"
                : load.kind === "unreachable"
                  ? "Unknown"
                  : payload!.ok
                    ? "Operational"
                    : "Not reachable"}
            </span>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="eyebrow">
            Page speeds · last 24 hours
          </h2>
          {load.kind === "ready" && payload!.routes.length === 0 ? (
            <p className="mt-4 text-[length:var(--text-callout)] leading-relaxed text-muted-foreground">
              Speed records are still gathering. Bloom samples real requests as they happen, so
              the first hours show few of them; nothing here is estimated or filled in.
            </p>
          ) : (
            <div className="mt-2">
              {(payload?.routes ?? []).map((r) => (
                <div
                  key={r.route}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border py-4"
                >
                  <span className="text-[length:var(--text-callout)] text-foreground/90">
                    {ROUTE_LABELS[r.route] ?? r.route}
                    {r.degraded ? (
                      <span className="type-badge ml-2 rounded-full border border-rose/40 bg-rose/10 px-2 py-0.5 text-rose">
                        Slower than usual
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[length:var(--text-support)] text-muted-foreground">
                    typical {fmtMs(r.p50Ms)} · slowest 1% {fmtMs(r.p99Ms)} · {r.samples}{" "}
                    {r.samples === 1 ? "check" : "checks"}
                  </span>
                </div>
              ))}
              {load.kind === "loading" ? (
                <p className="border-t border-border py-4 text-[length:var(--text-callout)] text-muted-foreground">
                  Gathering the latest speeds…
                </p>
              ) : null}
              {load.kind === "unreachable" ? (
                <p className="border-t border-border py-4 text-[length:var(--text-callout)] text-muted-foreground">
                  Speeds cannot be read while the status check cannot get through.
                </p>
              ) : null}
            </div>
          )}
        </section>

        <footer className="mt-14 border-t border-border pt-6">
          <p className="text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
            Measured from real requests to this app: every slow request is recorded, plus a
            one-in-ten sample of the rest. Only page names and timings are shown, never anything
            about a person. Questions:{" "}
            <a
              href="mailto:maelix67@gmail.com"
              className="underline underline-offset-2 hover:text-foreground"
            >
              maelix67@gmail.com
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}
