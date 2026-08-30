/**
 * /trackers-styles — the three trackers designs side by side, pick one.
 *
 * Same data, same logic, three completely different pages. The choice is kept
 * in localStorage so the whole app can follow it.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import trackersCss from "../styles/trackers2.css?url";
import trackersConsoleCss from "../styles/trackers.css?url";
import { useCycleTheme } from "@/hooks/usePeriodLog";
import { Atlas } from "@/components/tk/designs/Atlas";
import { Ledger } from "@/components/tk/designs/Ledger";
import { Strip } from "@/components/tk/designs/Strip";
import { TrackersPage } from "@/components/tk/TrackersPage";

export const DESIGNS = [
  {
    id: "ledger",
    name: "Ledger",
    note: "A bookkeeper's sheet — rules, tabular figures, a row of ticks for fourteen days.",
  },
  {
    id: "atlas",
    name: "Atlas",
    note: "A map of the day — a 24-hour compass, six territories, one route with six paths.",
  },
  {
    id: "strip",
    name: "Strip",
    note: "A filmstrip — one band per tracker, fourteen cells across, a single playhead at today.",
  },
  {
    id: "console",
    name: "Console",
    note: "The earlier version — a 24-hour dial with a ring, sparkline and quick-adds per row.",
  },
] as const;

export type DesignId = (typeof DESIGNS)[number]["id"];

/** What /trackers shows when nobody has chosen yet. */
export const DEFAULT_DESIGN: DesignId = "atlas";

const KEY = "bloom.trackers.design.v1";

export function loadDesignId(): DesignId {
  if (typeof window === "undefined") return DEFAULT_DESIGN;
  try {
    const raw = window.localStorage.getItem(KEY);
    return DESIGNS.some((d) => d.id === raw) ? (raw as DesignId) : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
}

export function saveDesignId(id: DesignId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, id);
    window.dispatchEvent(new CustomEvent("bloom:trackers-design"));
  } catch {
    /* storage blocked — the session still works */
  }
}

export const Route = createFileRoute("/trackers-styles")({
  head: () => ({
    meta: [{ title: "Bloom — Trackers, three ways" }],
    links: [
      { rel: "stylesheet", href: trackersCss },
      { rel: "stylesheet", href: trackersConsoleCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: TrackersStyles,
});

function TrackersStyles() {
  const [theme] = useCycleTheme();
  const [design, setDesign] = useState<DesignId>("ledger");

  useEffect(() => {
    setDesign(loadDesignId());
  }, []);

  const pick = (id: DesignId) => {
    setDesign(id);
    saveDesignId(id);
  };

  return (
    <div className="ci ci-root" data-theme={theme}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
          padding: "0.7rem 1rem",
          background: "color-mix(in oklab, var(--ci-ground) 88%, transparent)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid color-mix(in oklab, var(--ci-text) 12%, transparent)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--ci-font-mono)",
            fontSize: "10px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            opacity: 0.6,
            marginRight: "0.5rem",
          }}
        >
          Trackers · pick a design
        </span>
        {DESIGNS.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => pick(d.id)}
            aria-pressed={design === d.id}
            title={d.note}
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: 999,
              cursor: "pointer",
              fontSize: "12px",
              border: `1px solid ${
                design === d.id
                  ? "color-mix(in oklab, var(--ci-text) 55%, transparent)"
                  : "color-mix(in oklab, var(--ci-text) 16%, transparent)"
              }`,
              background:
                design === d.id
                  ? "color-mix(in oklab, var(--ci-text) 12%, transparent)"
                  : "transparent",
              color: "var(--ci-text)",
            }}
          >
            {d.name}
          </button>
        ))}
      </div>

      {design === "ledger" ? <Ledger theme={theme} /> : null}
      {design === "atlas" ? <Atlas theme={theme} /> : null}
      {design === "strip" ? <Strip theme={theme} /> : null}
      {design === "console" ? <TrackersPage theme={theme} /> : null}
    </div>
  );
}
