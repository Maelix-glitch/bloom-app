import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";

import cycleCss from "../styles/cycle.css?url";
import { useCycleSystem } from "@/hooks/useCycleSystem";
import { BloomHeader } from "@/components/BloomHeader";
import { Reveal } from "@/components/mood/primitives";
import type { CycleEntry } from "@/lib/cycle/types";
import { diffDays, localDateKey } from "@/lib/cycle/engine";
import {
  buildObservations,
  buildPersonalInsight,
  buildRecommendations,
  dismissStore,
} from "@/lib/cycle/intelligence";
import type { PhaseKey } from "@/lib/cycle/types";
import type { DayDraft } from "@/components/cycle/Logs";
import type { TodayPatch } from "@/components/cycle/TodaySurface";
import { entriesToCsv } from "@/lib/cycle/storage";
import { QuickLog, AdvancedCycleLog } from "@/components/cycle/Logs";
import { CycleLengthSheet } from "@/components/cycle/CycleLengthSheet";
import { MethodologyDialog } from "@/components/cycle/CycleHistory";
import { CycleHero } from "@/components/cycle/CycleHero";
import { CycleRoad } from "@/components/cycle/CycleRoad";
import { CycleTimeline } from "@/components/cycle/CycleTimeline";
import { CycleRhythm } from "@/components/cycle/CycleRhythm";
import { PatternInsights } from "@/components/cycle/PatternInsights";
import { PhasesGuide } from "@/components/cycle/PhasesGuide";
import { CycleCalendar } from "@/components/cycle/CycleCalendar";
import { InsightCard, RecommendationStack } from "@/components/cycle/Insights";
import { BloomCycleAI } from "@/components/cycle/BloomCycleAI";
import { toast, Toaster } from "sonner";

/* the deeper analytics + charts load lazily — never block the story above */
const CycleHistory = lazy(() =>
  import("@/components/cycle/CycleHistory").then((m) => ({ default: m.CycleHistory })),
);
const PatternCharts = lazy(() =>
  import("@/components/cycle/PatternCharts").then((m) => ({ default: m.PatternCharts })),
);

export const Route = createFileRoute("/cycle-classic")({
  head: () => ({
    meta: [
      { title: "Bloom — Cycle (previous version)" },
      {
        name: "description",
        content:
          "Your personal cycle companion — phases, estimates and patterns computed from what you actually log.",
      },
    ],
    links: [{ rel: "stylesheet", href: cycleCss }],
  }),
  component: CyclePage,
});

function Chapter({
  nodeColor,
  title,
  id,
  children,
}: {
  nodeColor?: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="cy-chapter scroll-mt-6">
      <span
        className="cy-node"
        aria-hidden
        style={{ ["--node-c" as never]: nodeColor ?? "var(--cycle-accent)" }}
      >
        <i />
      </span>
      <h2 className="cy-chapter__title mb-4 text-pretty">{title}</h2>
      {children}
    </section>
  );
}

function CyclePage() {
  const system = useCycleSystem();
  const { model, context, entries, loading, error, localOnly } = system;

  const [quickOpen, setQuickOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [editing, setEditing] = useState<CycleEntry | null>(null);
  const [quickDate, setQuickDate] = useState<string | null>(null);
  const [advEntry, setAdvEntry] = useState<CycleEntry | null>(null);
  const [dismissTick, setDismissTick] = useState(0);
  const [insightSeen, setInsightSeen] = useState(false);
  const [inspect, setInspect] = useState<{ day: number; date: string } | null>(null);
  const [aiAsk, setAiAsk] = useState<{ q: string; n: number } | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<PhaseKey | null>(null);

  const askBloom = useCallback((q = "") => {
    setAiAsk({ q, n: Date.now() });
  }, []);

  const insight = useMemo(
    () => (model && context ? buildPersonalInsight(model, context) : null),
    [model, context],
  );
  const observations = useMemo(
    () => (model ? buildObservations(model, entries) : []),
    [model, entries],
  );
  const recs = useMemo(() => {
    if (!model || !context) return [];
    void dismissTick;
    return buildRecommendations(model, context).filter((r) => !dismissStore.isDismissed(r.id));
  }, [model, context, dismissTick]);

  const openQuick = useCallback((date?: string, entry?: CycleEntry) => {
    setEditing(entry ?? null);
    setQuickDate(date ?? null);
    setQuickOpen(true);
  }, []);

  const scrollTo = useCallback(
    (id: string) =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    [],
  );

  /* day draft → entry patch (cycle day + phase derived, never asked from user) */
  const saveDraft = useCallback(
    async (draft: DayDraft, opts?: { silent?: boolean }) => {
      const dayNum = (() => {
        if (!model?.lastPeriodStart) return draft.flow && draft.flow !== "none" ? 1 : null;
        const diff = diffDays(model.lastPeriodStart, draft.date) + 1;
        return diff > 0 ? diff : null;
      })();
      const nextPeriodInDays =
        dayNum !== null && model?.average ? Math.max(0, Math.round(model.average - dayNum)) : null;

      const before = entries.find((e) => e.date === draft.date) ?? null;
      await system.saveDay({
        date: draft.date,
        cycle_day: dayNum ?? 1,
        phase: draft.flow && draft.flow !== "none" ? "menstrual" : null,
        flow: draft.flow,
        mood: draft.mood,
        energy: draft.energy,
        pain_level: draft.pain,
        symptoms: draft.symptoms,
        notes: draft.notes.trim() === "" ? null : draft.notes.trim(),
        temperature: draft.temperature,
        cervical_mucus: (draft.cervical_mucus ?? null) as CycleEntry["cervical_mucus"],
        lh_test: (draft.lh_test ?? null) as CycleEntry["lh_test"],
        sexual_activity: (draft.sexual_activity ?? null) as CycleEntry["sexual_activity"],
        contraceptive: (draft.contraceptive ?? null) as CycleEntry["contraceptive"],
        sleep_hours: draft.sleep_hours,
        next_period_in_days: nextPeriodInDays,
      });
      if (!opts?.silent) {
        const addedPeriodDay = draft.flow && draft.flow !== "none" && before?.flow !== draft.flow;
        toast(
          addedPeriodDay
            ? "Period day recorded. Your timeline recalculated."
            : localOnly
              ? "Saved on this device."
              : "Saved.",
          {
            description: addedPeriodDay
              ? `Your latest entry changed the cycle forecast. Logged days always come first.`
              : undefined,
            action: {
              label: "Undo",
              onClick: () => {
                if (before) void system.saveDay(before);
                else void system.removeDay(draft.date);
              },
            },
          },
        );
      }
    },
    [model, system, localOnly, entries],
  );

  /* the tray follows the selected day; merges, never clobbers */
  const logDate = inspect?.date ?? model?.today ?? localDateKey();
  const logEntry = useMemo(
    () => entries.find((e) => e.date === logDate) ?? null,
    [entries, logDate],
  );
  const surfacePatch = useCallback(
    async (patch: TodayPatch) => {
      const base: DayDraft = {
        date: logDate,
        flow: logEntry?.flow ?? null,
        mood: logEntry?.mood ?? null,
        energy: logEntry?.energy ?? null,
        pain: logEntry?.pain_level ?? null,
        symptoms: logEntry?.symptoms ?? [],
        notes: logEntry?.notes ?? "",
        temperature: logEntry?.temperature ?? null,
        cervical_mucus: logEntry?.cervical_mucus ?? null,
        lh_test: logEntry?.lh_test ?? null,
        sexual_activity: logEntry?.sexual_activity ?? null,
        contraceptive: logEntry?.contraceptive ?? null,
        sleep_hours: logEntry?.sleep_hours ?? null,
      };
      await saveDraft({ ...base, ...patch }, { silent: true });
    },
    [logDate, logEntry, saveDraft],
  );

  const inspectDate = useCallback(
    (date: string | null) => {
      if (!date || !model || date === model.today) {
        setInspect(null);
        return;
      }
      const day = (() => {
        if (!model.lastPeriodStart) return null;
        const diff = diffDays(model.lastPeriodStart, date) + 1;
        return diff > 0 ? diff : null;
      })();
      setInspect(day ? { day, date } : null);
    },
    [model],
  );

  /* "q" opens the quick log when not typing */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key.toLowerCase() === "q" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        openQuick();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openQuick]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="cycle-page relative min-h-screen bg-background text-foreground">
        <BloomHeader />
        <main className="cy-main">
          {localOnly ? (
            <p className="pb-1 text-center text-[11px] text-faint">
              preview — kept on this device; signing in syncs it, if you ever want
            </p>
          ) : null}
          {error ? (
            <p className="mb-4 rounded-xl border border-amber/30 bg-amber/5 px-4 py-2.5 text-center text-[12.5px] text-amber">
              {error}{" "}
              <button
                type="button"
                onClick={system.refresh}
                className="underline underline-offset-2"
              >
                Try again
              </button>
            </p>
          ) : null}

          {/* the stage — orbit, statement, tray: one object, one composition */}
          <Reveal>
            <CycleHero
              model={model}
              entries={entries}
              loading={loading}
              logDate={logDate}
              logEntry={logEntry}
              inspect={inspect}
              onReturnToday={() => setInspect(null)}
              onPatch={surfacePatch}
              onOpenFull={() => {
                setAdvEntry(null);
                setQuickDate(logDate);
                setAdvancedOpen(true);
              }}
              onAdjust={() => setAdjustOpen(true)}
              onOpenMethod={() => setMethodOpen(true)}
              selectedPhase={selectedPhase}
              onSelectPhase={setSelectedPhase}
            />
          </Reveal>

          {import.meta.env.DEV && model ? <CycleDebugPanel model={model} /> : null}

          {system.latestChange?.forecastChanged ? (
            <Reveal delay={20}>
              <div className="cy-change-note" role="status">
                <div>
                  <p className="cy-eyebrow">updated from your log</p>
                  <p className="cy-title mt-1 text-[15px]">
                    Your latest entry changed the forecast.
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                    {system.latestChange.message} Your recorded days always take priority over
                    Bloom’s estimates.
                  </p>
                </div>
                <button type="button" className="cy-link" onClick={() => setMethodOpen(true)}>
                  Why did this change?
                </button>
              </div>
            </Reveal>
          ) : null}

          {/* the road ahead — forecast as one path, then the week on the same thread */}
          <Reveal delay={40}>
            <Chapter nodeColor="var(--cycle-menstrual)" title="The road ahead" id="cycle-road">
              {model ? (
                <>
                  <CycleRoad
                    model={model}
                    onOpenMethod={() => setMethodOpen(true)}
                    onLogStart={() => openQuick()}
                  />
                  <div className="mt-10 border-t border-[var(--cycle-hair)] pt-5">
                    <p className="cy-eyebrow mb-2.5">the week, day by day</p>
                    <CycleTimeline
                      model={model}
                      entries={entries}
                      selected={inspect?.date ?? null}
                      onSelect={inspectDate}
                      onLogDay={(date) => {
                        setQuickDate(date);
                        setEditing(entries.find((e) => e.date === date) ?? null);
                        setAdvancedOpen(true);
                      }}
                    />
                  </div>
                </>
              ) : (
                <BlockSkeleton h={190} />
              )}
            </Chapter>
          </Reveal>

          {/* what bloom noticed — insight + honest suggestions */}
          <Reveal delay={40}>
            <Chapter nodeColor="var(--violet)" title="What Bloom noticed" id="cycle-insight">
              <InsightCard
                insight={insight}
                signals={
                  model
                    ? [
                        model.currentBleedingState !== "unlogged" &&
                        model.currentBleedingState !== "none"
                          ? "period logged today"
                          : model.currentReproductivePhase
                            ? `${model.currentReproductivePhase} phase estimate`
                            : "nothing confirmed today",
                        `${entries.length} day${entries.length === 1 ? "" : "s"} logged`,
                        model.completed.length > 0
                          ? `${model.completed.length} completed cycle${model.completed.length === 1 ? "" : "s"}`
                          : "no completed cycles yet",
                        model.variabilityPercent !== null
                          ? `spread ±${Math.round(model.stdDev ?? 0)} days`
                          : "spread unknown",
                      ]
                    : []
                }
                onAsk={() => askBloom("What have you noticed about my cycles?")}
                stillLearning={
                  <div className="flex flex-wrap items-end gap-8">
                    <div className="min-w-0 max-w-[46ch]">
                      <p className="cy-title text-[17px] leading-snug text-muted-foreground">
                        Bloom is still learning your rhythm.
                      </p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-faint">
                        What unlocks the first comparisons: your next period start (that completes a
                        cycle), plus a handful of days with mood or energy tapped in the tray above.
                        Two completed cycles and Bloom starts speaking about you, not about
                        averages.
                      </p>
                    </div>
                    <div className="cy-ghost-lines" aria-hidden>
                      <i style={{ width: "150px" }} />
                      <i style={{ width: "190px" }} />
                      <i style={{ width: "132px" }} />
                      <i style={{ width: "172px", opacity: 0.55 }} />
                    </div>
                  </div>
                }
              />
              {observations.length > 0 ? (
                <ul
                  className="mt-4 flex flex-col gap-0"
                  aria-label="What Bloom can back with your data"
                >
                  {observations.map((o) => (
                    <li key={o.id} className="cy-obs">
                      <span className="cy-evi" aria-hidden>
                        {Array.from({ length: Math.min(o.total, 8) }, (_, i) => (
                          <i key={i} className={i < Math.min(o.seen, 8) ? "on" : undefined} />
                        ))}
                      </span>
                      <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                        {o.text}
                      </span>
                      <span className="mono shrink-0 text-[9px] uppercase tracking-[0.08em] text-faint">
                        {o.seen} of {o.total}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-4">
                <RecommendationStack
                  recs={recs}
                  onDismiss={(id) => {
                    dismissStore.dismiss(id);
                    setDismissTick((t) => t + 1);
                  }}
                  onAsk={() => askBloom("What should I pay attention to today?")}
                />
              </div>
            </Chapter>
          </Reveal>

          {/* your recent rhythm — history as a score */}
          <Reveal delay={40}>
            <Chapter nodeColor="var(--sage)" title="Your recent rhythm" id="cycle-history">
              {model ? (
                <>
                  <CycleRhythm model={model} entries={entries} />
                  <details className="group mt-7 border-t border-[var(--cycle-hair)] pt-3">
                    <summary className="cy-link flex cursor-pointer list-none items-center gap-1.5 [&::-webkit-details-marker]:hidden">
                      Further in your record
                      <span
                        className="text-[10px] transition-transform duration-[var(--cy-med)] group-open:rotate-90"
                        aria-hidden
                      >
                        ›
                      </span>
                    </summary>
                    <div className="pt-4">
                      <Suspense fallback={<BlockSkeleton h={220} />}>
                        <CycleHistory model={model} entries={entries} />
                      </Suspense>
                    </div>
                  </details>
                </>
              ) : (
                <BlockSkeleton h={220} />
              )}
            </Chapter>
          </Reveal>

          {/* patterns */}
          <Reveal delay={40}>
            <Chapter
              nodeColor="var(--cycle-luteal)"
              title="Your personal patterns"
              id="cycle-patterns"
            >
              <Suspense fallback={<BlockSkeleton h={220} />}>
                {model ? <PatternCharts model={model} entries={entries} /> : null}
              </Suspense>
              <div className="mt-9">
                {model ? (
                  <PatternInsights
                    model={model}
                    entries={entries}
                    onOpenMethod={() => setMethodOpen(true)}
                  />
                ) : (
                  <BlockSkeleton h={160} />
                )}
              </div>
            </Chapter>
          </Reveal>

          {/* calendar + phases, quieter */}
          <Reveal delay={40}>
            <Chapter nodeColor="var(--sky)" title="A closer look" id="cycle-calendar">
              {model ? (
                <CycleCalendar
                  model={model}
                  entries={entries}
                  inspectDate={inspect?.date ?? null}
                  onInspect={inspectDate}
                  onQuickLog={(date) => openQuick(date)}
                  onEditDay={(entry) => {
                    setEditing(entry);
                    setQuickDate(entry.date);
                    setQuickOpen(true);
                  }}
                />
              ) : (
                <BlockSkeleton h={280} />
              )}
            </Chapter>
          </Reveal>

          <Reveal delay={40}>
            <Chapter nodeColor="var(--cycle-follicular)" title="The four phases">
              {model ? (
                <PhasesGuide
                  model={model}
                  selectedPhase={selectedPhase}
                  onSelectPhase={setSelectedPhase}
                />
              ) : (
                <BlockSkeleton h={180} />
              )}
            </Chapter>
          </Reveal>

          <footer className="cy-chapter flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-faint">
            <span>cycle records stay private</span>
            <span aria-hidden>·</span>
            <span>nothing here is medical advice</span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => {
                if (entries.length === 0) {
                  toast("Nothing to export yet.");
                  return;
                }
                const blob = new Blob([entriesToCsv(entries)], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "bloom-cycle-export.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="underline decoration-[var(--cycle-hair-strong)] underline-offset-4 transition-colors hover:text-foreground"
            >
              export my data (csv)
            </button>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => {
                if (entries.length === 0) {
                  toast("Cycle data is already empty.");
                  return;
                }
                const ok = window.confirm(
                  "Reset all cycle entries on this device? This clears the cycle data you entered and recalculates the page from an empty state.",
                );
                if (!ok) return;
                void system.resetAll().then(() => toast("Cycle data reset."));
              }}
              className="underline decoration-[var(--cycle-hair-strong)] underline-offset-4 transition-colors hover:text-foreground"
            >
              reset cycle data
            </button>
          </footer>
        </main>

        {/* overlays — the deep forms; everyday logging lives in the tray */}
        <CycleLengthSheet
          open={adjustOpen}
          onClose={() => setAdjustOpen(false)}
          model={model}
          defaultCycle={system.defaultCycle}
          onSaveLength={async (days) => {
            system.setDefaultCycle(days);
          }}
          onSaveStart={async (date) => {
            await system.saveDay({ date, flow: "medium", cycle_day: 1, phase: "menstrual" });
          }}
        />
        {model ? (
          <MethodologyDialog open={methodOpen} onClose={() => setMethodOpen(false)} model={model} />
        ) : null}
        <QuickLog
          open={quickOpen}
          onClose={() => {
            setQuickOpen(false);
            setEditing(null);
            setQuickDate(null);
          }}
          model={model}
          editing={editing}
          defaultDate={quickDate}
          onSave={(draft) => saveDraft(draft)}
          onAdvanced={() => {
            setQuickOpen(false);
            setAdvEntry(editing);
            setAdvancedOpen(true);
          }}
        />
        <AdvancedCycleLog
          open={advancedOpen}
          onClose={() => {
            setAdvancedOpen(false);
            setAdvEntry(null);
          }}
          model={model}
          editing={advEntry}
          defaultDate={quickDate ?? logDate}
          onSave={(draft) => saveDraft(draft)}
          onExport={() => {
            const blob = new Blob([entriesToCsv(entries)], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "bloom-cycle-export.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        />
        <BloomCycleAI
          context={context}
          insight={insightSeen ? null : insight}
          onSeenInsight={() => setInsightSeen(true)}
          onQuickLog={() => {
            setEditing(null);
            setQuickDate(null);
            setQuickOpen(true);
          }}
          external={aiAsk}
        />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--surface-2)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
            },
          }}
        />
      </div>
    </MotionConfig>
  );
}

function CycleDebugPanel({
  model,
}: {
  model: NonNullable<ReturnType<typeof useCycleSystem>["model"]>;
}) {
  return (
    <details className="cy-debug mx-auto mt-4 max-w-[760px]">
      <summary className="cy-link cursor-pointer list-none">Cycle debug</summary>
      <div className="mt-2 grid gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-2">
        <span>version: {model.calculationVersion}</span>
        <span>sufficiency: {model.dataSufficiency}</span>
        <span>anchor: {model.lastPeriodStart ?? "none"}</span>
        <span>day: {model.currentDay ?? "—"}</span>
        <span>phase: {model.currentPhase ?? "unknown"}</span>
        <span>source: {model.currentProvenance.source}</span>
        <span>
          period episode:{" "}
          {model.currentPeriodEpisode ? `Started ${model.currentPeriodEpisode.start}` : "none"}
        </span>
        <span>status: {model.currentPeriodEpisode?.status ?? "—"}</span>
        <span>observed bleeding days: {model.currentPeriodEpisode?.observedBleedingDays ?? 0}</span>
        <span>confirmed end: {model.currentPeriodEpisode?.confirmedEnd ?? "—"}</span>
        <span>
          estimated bleeding window:{" "}
          {model.events.find((e) => e.id === "bleeding-window")?.rangeStart ?? "—"}→
          {model.events.find((e) => e.id === "bleeding-window")?.rangeEnd ?? "—"}
        </span>
        <span>period length input: {model.periodLengthAverage?.toFixed(1) ?? "baseline"}</span>
        <span>cycle length input: {model.average?.toFixed(1) ?? "general baseline"}</span>
        <span>ovulation estimate: day {model.ovulationDay ?? "—"}</span>
        {model.issues.map((issue) => (
          <span key={issue.id} className="text-amber">
            {issue.message}
          </span>
        ))}
      </div>
    </details>
  );
}

function BlockSkeleton({ h }: { h: number }) {
  return (
    <div className="animate-pulse rounded-2xl bg-surface/40" style={{ height: h }} aria-hidden />
  );
}
