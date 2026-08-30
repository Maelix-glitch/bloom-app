/**
 * /cycle-styles — the design gallery.
 *
 * Five directions for the same page, shown on real content (the actual
 * Cycle Intelligence components) rather than swatches alone, with a live
 * full-page preview and an "apply" switch that /cycle picks up immediately.
 */

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Palette } from "lucide-react";

import cycleIntelligenceCss from "../styles/cycle2.css?url";
import { BloomHeader } from "@/components/BloomHeader";
import { PhaseWave } from "@/components/ci/PhaseWave";
import { RhythmChart } from "@/components/ci/RhythmChart";
import {
  FlowBreakdown,
  ForecastStrip,
  PhaseCards,
  StatsStrip,
} from "@/components/ci/AnalyticsCards";
import { PredictionsCard } from "@/components/ci/PredictionsCard";
import { InsightsPanel } from "@/components/ci/InsightsPanel";
import { TipsCard } from "@/components/ci/TipsCard";
import { CycleIntelligence } from "@/components/ci/CycleIntelligence";
import { CycleHeatmap } from "@/components/ci/CycleHeatmap";
import { SymptomPhaseGrid } from "@/components/ci/SymptomPhaseGrid";
import { SignatureStrip } from "@/components/ci/SignatureStrip";
import { DayLogInsights } from "@/components/ci/DayLogInsights";
import { Button, ConfidenceBadge, Disclaimer } from "@/components/ci/primitives";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { analyzeCycle, addDays, todayKey, type PeriodLog } from "@/lib/cycle/predict";
import { analyzeDayLogs, type DayLog } from "@/lib/cycle/dayLogs";
import { CYCLE_THEMES, DEFAULT_THEME_ID, themeById } from "@/lib/cycle/themes";
import { loadThemeId, PERIODS_CHANGED, saveThemeId } from "@/lib/cycle/periodStore";

const FONTS =
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap";

export const Route = createFileRoute("/cycle-styles")({
  head: () => ({
    meta: [
      { title: "Bloom — Cycle design directions" },
      {
        name: "description",
        content:
          "Five design directions for the Bloom Cycle Intelligence page, previewed on real components.",
      },
    ],
    links: [
      { rel: "stylesheet", href: FONTS },
      { rel: "stylesheet", href: cycleIntelligenceCss },
    ],
  }),
  component: CycleStylesPage,
});

/**
 * A believable five-cycle record so every direction can be judged on a page
 * that actually has data in it. Real entries win when there are enough of them.
 */
function demoLogs(today: string): PeriodLog[] {
  // gaps of 29 / 30 / 28 / 27 days — steady, high confidence, no flags
  const offsets = [-126, -97, -67, -39, -12];
  const flows: PeriodLog["flow"][] = ["medium", "medium", "light", "heavy", "medium"];
  return offsets.map((offset, i) => ({
    id: `demo-${i}`,
    start: addDays(today, offset),
    end: i === 4 ? addDays(today, offset + 4) : null,
    flow: flows[i] ?? null,
    notes: i === 2 ? "Travel week, sleep was a mess" : null,
  }));
}

/**
 * A believable daily log for the same imaginary record, so the advanced-log
 * charts can be judged in every direction too.
 */
function demoDays(today: string): DayLog[] {
  const d = (offset: number, extra: Partial<DayLog>): DayLog => ({
    date: addDays(today, offset),
    ...extra,
  });
  return [
    d(-12, {
      flow: "heavy",
      pain: 4,
      mood: "rough",
      energy: 2,
      sleep: 6.5,
      temperature: 36.5,
      symptoms: ["cramps", "tiredness"],
    }),
    d(-11, {
      flow: "heavy",
      pain: 3,
      mood: "low",
      energy: 2,
      sleep: 7,
      temperature: 36.4,
      symptoms: ["cramps"],
    }),
    d(-10, {
      flow: "medium",
      pain: 2,
      mood: "low",
      energy: 3,
      sleep: 7,
      symptoms: ["cramps", "bloating"],
    }),
    d(-9, { flow: "light", pain: 1, mood: "okay", energy: 3, sleep: 7.5, symptoms: ["bloating"] }),
    d(-8, { flow: "light", pain: 1, mood: "okay", energy: 4, sleep: 8 }),
    d(-7, { mood: "good", energy: 4, sleep: 8, temperature: 36.4 }),
    d(-5, { mood: "good", energy: 4, sleep: 7.5, mucus: "watery" }),
    d(-3, {
      mood: "great",
      energy: 5,
      sleep: 8,
      temperature: 36.3,
      lh: "positive",
      notes: "best day of the month",
    }),
    d(-2, { mood: "good", energy: 4, sleep: 7, mucus: "egg-white" }),
    d(-1, { mood: "good", energy: 4, sleep: 8, temperature: 36.8, notes: "slept well" }),
  ];
}

/** One edge case of each kind, purely to show how the banners look. */
function messyLogs(today: string): PeriodLog[] {
  return [
    { id: "m1", start: addDays(today, -220), end: null, flow: "medium", notes: null },
    { id: "m2", start: addDays(today, -190), end: null, flow: "medium", notes: null },
    {
      id: "m3",
      start: addDays(today, -52),
      end: null,
      flow: "heavy",
      notes: "missed logging for ages",
    }, // 138-day gap
    { id: "m4", start: addDays(today, -20), end: null, flow: "light", notes: null },
  ];
}

function MiniPreview({
  themeId,
  analysis,
  previewDays,
}: {
  themeId: string;
  analysis: ReturnType<typeof analyzeCycle>;
  previewDays: DayLog[];
}) {
  return (
    <div className="ci" data-theme={themeId}>
      <div className="ci-panel overflow-hidden rounded-[10px]">
        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="ci-eyebrow">Phase overview</p>
              <p className="ci-display mt-1 text-[15px] leading-tight">
                Day {analysis.cycleDay} of ~{Math.round(analysis.averageLength)}
              </p>
            </div>
            <ConfidenceBadge level={analysis.confidence} reason={analysis.confidenceReason} />
          </div>
          <div className="mt-2.5">
            <PhaseWave analysis={analysis} compact />
          </div>
          <div className="mt-3.5">
            <PredictionsCard analysis={analysis} compact />
          </div>
          <div className="mt-3">
            <p className="ci-eyebrow">Cycle lengths</p>
            <RhythmChart analysis={analysis} compact />
          </div>
          <div className="mt-3">
            <p className="ci-eyebrow">Twelve weeks</p>
            <div className="mt-1.5">
              <CycleHeatmap days={previewDays} analysis={analysis} compact />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <span className="flex flex-col items-center gap-1" title={`${label} · ${hex}`}>
      <span
        className="h-6 w-6 rounded-[5px] border"
        style={{ background: hex, borderColor: "var(--ci-line-strong)" }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function CycleStylesPage() {
  const store = usePeriodLog();
  const [applied, setApplied] = useState<string>(DEFAULT_THEME_ID);
  const [previewTheme, setPreviewTheme] = useState<string>(DEFAULT_THEME_ID);

  /* read the stored direction after hydration so SSR and client agree */
  useEffect(() => {
    const sync = () => {
      setApplied(loadThemeId());
      setPreviewTheme((current) => (current === DEFAULT_THEME_ID ? loadThemeId() : current));
    };
    sync();
    window.addEventListener(PERIODS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PERIODS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const today = store.hydrated ? store.today : todayKey();
  const usingRealData = store.logs.length >= 3;
  const analysis = useMemo(
    () => analyzeCycle(usingRealData ? store.logs : demoLogs(today), today),
    [store.logs, today, usingRealData],
  );
  const messy = useMemo(() => analyzeCycle(messyLogs(today), today), [today]);
  const usingRealDays = store.days.length >= 3;
  const previewDays = usingRealDays ? store.days : demoDays(today);
  const dayAnalysis = useMemo(
    () => analyzeDayLogs(usingRealDays ? store.days : demoDays(today), analysis),
    [store.days, analysis, today, usingRealDays],
  );

  const apply = (id: string) => {
    saveThemeId(id);
    setApplied(id);
    setPreviewTheme(id);
  };

  const active = themeById(applied);

  return (
    <div className="ci" data-theme={applied}>
      <div className="ci-root">
        <BloomHeader />
        <div className="ci-veil" aria-hidden />
        <div className="ci-shell">
          <header className="ci-rise max-w-[70ch]">
            <p className="ci-eyebrow">Bloom · Cycle · Eight directions</p>
            <h1 className="ci-display mt-3 text-[30px] leading-[1.08] sm:text-[40px]">
              Five directions.
              <br />
              <span style={{ color: "var(--ci-follicular)" }}>
                One page, one set of components.
              </span>
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed ci-soft sm:text-[15px]">
              Each direction below is the same Cycle Intelligence page — same prediction engine,
              same components, same copy. Only the palette, the surface treatment, the corner
              geometry and the type weights change. Pick one and it applies to{" "}
              <Link
                to="/cycle"
                className="underline decoration-[var(--ci-line-strong)] underline-offset-4"
              >
                /cycle
              </Link>{" "}
              immediately.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11.5px] ci-muted">
              <span className="inline-flex items-center gap-1.5">
                <Palette size={13} aria-hidden />
                applied now: <strong style={{ color: "var(--ci-text)" }}>{active.name}</strong>
              </span>
              <span aria-hidden>·</span>
              <span>
                {usingRealData
                  ? "previews use your real entries"
                  : "previews use sample data until you have 3+ entries"}
              </span>
            </div>
          </header>

          {/* ------------------------------ the grid ----------------------------- */}
          <section className="mt-10" aria-label="The five directions">
            <div className="grid gap-5 lg:grid-cols-2">
              {CYCLE_THEMES.map((theme, i) => {
                const isApplied = applied === theme.id;
                return (
                  <div
                    key={theme.id}
                    className={`ci-card ci-card--pad ci-rise ci-rise-${Math.min(i + 1, 4)}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="ci-display text-[20px] leading-tight">{theme.name}</h2>
                        <p className="mt-1 text-[12.5px] ci-soft">{theme.tagline}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Swatch hex={theme.palette[0]!.hex} label="ground" />
                        <Swatch hex={theme.palette[1]!.hex} label="surface" />
                        <Swatch hex={theme.palette[2]!.hex} label="ink" />
                        <span
                          aria-hidden
                          className="mx-1 h-6 w-px"
                          style={{ background: "var(--ci-line-strong)" }}
                        />
                        {theme.palette.slice(3).map((p) => (
                          <Swatch key={p.label} hex={p.hex} label={p.label} />
                        ))}
                      </div>
                    </div>

                    <p className="mt-3 text-[12.5px] leading-relaxed ci-muted">
                      {theme.description}
                    </p>

                    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                      {theme.traits.map((t) => (
                        <li
                          key={t}
                          className="rounded-full border px-2.5 py-[3px] text-[11px] ci-muted ci-hair"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4">
                      <MiniPreview
                        themeId={theme.id}
                        analysis={analysis}
                        previewDays={previewDays}
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        variant={isApplied ? "default" : "primary"}
                        onClick={() => apply(theme.id)}
                        aria-pressed={isApplied}
                        disabled={isApplied}
                      >
                        {isApplied ? (
                          <>
                            <Check size={14} aria-hidden />
                            Applied
                          </>
                        ) : (
                          "Apply this direction"
                        )}
                      </Button>
                      <Link
                        to="/cycle"
                        className="ci-btn ci-btn--ghost"
                        onClick={() => apply(theme.id)}
                      >
                        Open /cycle
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* --------------------------- full-page preview ------------------------ */}
          <section className="mt-12" aria-label="Full page preview">
            <p className="ci-eyebrow">Full width</p>
            <h2 className="ci-display mt-1.5 text-[22px] leading-tight sm:text-[26px]">
              The whole page, at full width
            </h2>
            <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed ci-soft">
              Editing is disabled here so a preview can't change your record. This is the real
              component tree, rendering your real entries.
            </p>

            <div className="ci-seg mt-4" role="tablist" aria-label="Preview direction">
              {CYCLE_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  role="tab"
                  aria-selected={previewTheme === theme.id}
                  className="ci-seg-item"
                  aria-pressed={previewTheme === theme.id}
                  onClick={() => setPreviewTheme(theme.id)}
                >
                  {theme.name}
                </button>
              ))}
            </div>

            <div
              className="mt-4 overflow-hidden rounded-[var(--ci-radius-lg)] border"
              style={{ borderColor: "var(--ci-line-strong)" }}
            >
              <CycleIntelligence theme={previewTheme} preview showFooterLinks={false} />
            </div>
          </section>

          {/* ------------------------------- specimen ---------------------------- */}
          <section className="mt-12" aria-label="Component specimen">
            <p className="ci-eyebrow">Specimen</p>
            <h2 className="ci-display mt-1.5 text-[22px] leading-tight sm:text-[26px]">
              Type, controls and the edge-case banners
            </h2>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="ci-card ci-card--pad">
                <p className="ci-eyebrow">Type pairing</p>
                <p className="ci-display mt-2 text-[28px] leading-tight">
                  A characterful serif for headings
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed ci-soft">
                  A clean geometric sans for everything else — body copy, labels, controls and data.
                  Numbers sit in a monospaced face so columns of dates and day counts line up
                  without jitter.
                </p>
                <p className="ci-num mt-3 text-[13px] ci-muted">
                  28.4 days · ±1.1 · 5 cycles · day 13 of 28
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Button variant="primary">Primary</Button>
                  <Button>Default</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button disabled>Disabled</Button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="ci-field">
                    <span className="ci-label">Date input</span>
                    <input type="date" className="ci-input" defaultValue={today} />
                  </label>
                  <label className="ci-field">
                    <span className="ci-label">With an error</span>
                    <input
                      type="date"
                      className="ci-input"
                      defaultValue="2026-13-40"
                      aria-invalid="true"
                    />
                    <span className="ci-error">That date isn't one the calendar recognises.</span>
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <ConfidenceBadge level="none" reason="none" />
                  <ConfidenceBadge level="low" reason="low" />
                  <ConfidenceBadge level="medium" reason="medium" />
                  <ConfidenceBadge level="high" reason="high" />
                </div>
              </div>

              <div className="ci-card ci-card--pad">
                <p className="ci-eyebrow">Analytics</p>
                <p className="mt-2 text-[12.5px] leading-relaxed ci-muted">
                  The numbers, the flow mix and the three-cycle forward look — all derived from
                  logged entries, none of them invented.
                </p>
                <div className="mt-3.5">
                  <StatsStrip analysis={analysis} />
                </div>
                <div className="mt-5 border-t pt-4 ci-hair">
                  <p className="ci-eyebrow">Flow mix</p>
                  <div className="mt-3">
                    <FlowBreakdown analysis={analysis} />
                  </div>
                </div>
                <div className="mt-5 border-t pt-4 ci-hair">
                  <p className="ci-eyebrow">Forward look</p>
                  <div className="mt-3">
                    <ForecastStrip analysis={analysis} compact />
                  </div>
                </div>
              </div>

              <div className="ci-card ci-card--pad">
                <p className="ci-eyebrow">Symptom map</p>
                <p className="mt-2 text-[12.5px] leading-relaxed ci-muted">
                  Symptoms down, phases across, colour for frequency. Empty when nothing has been
                  logged for that pairing.
                </p>
                <div className="mt-3.5">
                  <SymptomPhaseGrid rows={dayAnalysis.symptomPhase} compact />
                </div>
              </div>

              <div className="ci-card ci-card--pad">
                <p className="ci-eyebrow">Edge-case banners</p>
                <p className="mt-2 text-[12.5px] leading-relaxed ci-muted">
                  The same record with a 138-day gap (a period that went unlogged) and a late
                  prediction — so you can see how the louder states sit inside each direction.
                </p>
                <div className="mt-3">
                  <InsightsPanel analysis={messy} />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <SignatureStrip analysis={analysis} dayAnalysis={dayAnalysis} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <TipsCard analysis={analysis} />
              <div className="ci-card ci-card--pad">
                <p className="ci-eyebrow">Comparison</p>
                <div className="ci-scroll mt-3 overflow-x-auto">
                  <table className="ci-table">
                    <thead>
                      <tr>
                        <th scope="col">Direction</th>
                        <th scope="col">Ground</th>
                        <th scope="col">Surface</th>
                        <th scope="col">Radius</th>
                        <th scope="col">Treatment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CYCLE_THEMES.map((t) => (
                        <tr key={t.id}>
                          <td style={{ color: "var(--ci-text)" }}>{t.name}</td>
                          <td className="ci-num">{t.palette[0]!.hex}</td>
                          <td className="ci-num">{t.palette[1]!.hex}</td>
                          <td className="ci-num">{t.traits[1]!.replace(" radius", "")}</td>
                          <td>{t.traits[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[11.5px] leading-relaxed ci-muted">
                  Best for: {active.best}
                </p>
              </div>
            </div>
          </section>

          <div className="mt-4">
            <DayLogInsights
              days={usingRealDays ? store.days : demoDays(today).slice().reverse()}
              dayAnalysis={dayAnalysis}
              compact
            />
          </div>

          {/* ------------------------------- the bar ----------------------------- */}
          <section className="mt-12" aria-label="What does not change">
            <p className="ci-eyebrow">Fixed across every direction</p>
            <h2 className="ci-display mt-1.5 text-[22px] leading-tight sm:text-[26px]">
              The parts that aren't up for redesign
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Visible focus everywhere",
                  body: "Every link, button, input and tab gets a 2px outline in the theme's focus colour, with an offset so it never disappears into a border.",
                },
                {
                  title: "Reduced motion respected",
                  body: "Entrance animations and the wave draw-in are removed under prefers-reduced-motion; colour and layout carry the hierarchy instead.",
                },
                {
                  title: "Contrast held on both schemes",
                  body: "Body copy stays above 4.5:1 and phase tints are only used for fills and marks, never for text on their own.",
                },
                {
                  title: "Empty states say what to do",
                  body: "Nothing renders blank: before the first entry the page explains what one date unlocks, and what the second one changes.",
                },
                {
                  title: "Errors name the fix",
                  body: "Validation messages say what's wrong and how to correct it — a duplicate start date, an end date before the start, a date in the future.",
                },
                {
                  title: "Estimates never pretend to be facts",
                  body: "Confidence travels with every prediction, the ovulation assumption is stated, and the disclaimer is permanent.",
                },
              ].map((item) => (
                <div key={item.title} className="ci-card ci-card--pad">
                  <p className="text-[13px] font-medium">{item.title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed ci-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <footer className="mt-12 border-t pt-5 ci-hair">
            <Disclaimer className="max-w-[76ch]" />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px]">
              <Link
                to="/cycle"
                className="underline decoration-[var(--ci-line-strong)] underline-offset-4 ci-muted"
              >
                Back to Cycle Intelligence
              </Link>
              <span aria-hidden className="ci-muted">
                ·
              </span>
              <Link
                to="/cycle-classic"
                className="underline decoration-[var(--ci-line-strong)] underline-offset-4 ci-muted"
              >
                Previous version of the page
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
