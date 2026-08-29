import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PencilLine } from "lucide-react";

import cycleCss from "../styles/cycle.css?url";
import { useCycleSystem } from "@/hooks/useCycleSystem";
import { BloomHeader } from "@/components/BloomHeader";
import { Reveal } from "@/components/mood/primitives";
import type { CycleEntry } from "@/lib/cycle/types";
import { fmtShort, localDateKey } from "@/lib/cycle/engine";
import { buildPersonalInsight, buildRecommendations, dismissStore } from "@/lib/cycle/intelligence";
import type { DayDraft } from "@/components/cycle/Logs";
import type { TodayPatch } from "@/components/cycle/TodaySurface";
import { entriesToCsv } from "@/lib/cycle/storage";
import { QuickLog, AdvancedCycleLog } from "@/components/cycle/Logs";
import { CycleLengthSheet } from "@/components/cycle/CycleLengthSheet";
import { MethodologyDialog } from "@/components/cycle/CycleHistory";
import { CycleHero } from "@/components/cycle/CycleHero";
import { CycleForecast } from "@/components/cycle/CycleForecast";
import { CycleTimeline } from "@/components/cycle/CycleTimeline";
import { PatternInsights } from "@/components/cycle/PatternInsights";
import { PhasesGuide } from "@/components/cycle/PhasesGuide";
import { CycleCalendar } from "@/components/cycle/CycleCalendar";
import { InsightCard, RecommendationStack } from "@/components/cycle/Insights";
import { BloomCycleAI } from "@/components/cycle/BloomCycleAI";
import { toast, Toaster } from "sonner";

/* below-the-fold weight loads progressively — hero, forecast and calendar never wait on it */
const CycleHistory = lazy(() =>
  import("@/components/cycle/CycleHistory").then((m) => ({ default: m.CycleHistory })),
);

export const Route = createFileRoute("/cycle")({
  head: () => ({
    meta: [
      { title: "Bloom — Cycle" },
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
  no,
  title,
  sub,
  right,
  id,
  children,
}: {
  no: string;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="cy-chapter scroll-mt-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          <p className="cy-chapter__no">{no}</p>
          <h2 className="cy-chapter__title mt-1.5 text-pretty">{title}</h2>
          {sub ? <p className="cy-chapter__sub">{sub}</p> : null}
        </div>
        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>
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
  const aiNonce = useRef(0);

  const askBloom = useCallback((q = "") => {
    aiNonce.current += 1;
    setAiAsk({ q, n: aiNonce.current });
  }, []);

  const insight = useMemo(
    () => (model && context ? buildPersonalInsight(model, context) : null),
    [model, context],
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
        const d = new Date(`${draft.date}T00:00:00`).getTime();
        const s = new Date(`${model.lastPeriodStart}T00:00:00`).getTime();
        const diff = Math.floor((d - s) / 86_400_000) + 1;
        return diff > 0 ? diff : null;
      })();
      const phase =
        dayNum !== null
          ? draft.flow && draft.flow !== "none"
            ? "menstrual"
            : model
              ? model.dayPhase(dayNum)
              : null
          : null;
      const nextPeriodInDays =
        dayNum !== null && model?.average ? Math.max(0, Math.round(model.average - dayNum)) : null;

      await system.saveDay({
        date: draft.date,
        cycle_day: dayNum ?? 1,
        phase: phase as CycleEntry["phase"],
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
      /* the today surface answers inline — dialogs are the only ones that toast */
      if (!opts?.silent) toast(localOnly ? "Saved on this device." : "Saved.");
    },
    [model, system, localOnly],
  );

  /* the today surface follows the selected day; merges, never clobbers */
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

  /* selection sync: timeline/calendar pick a day → the orbit and hero follow */
  const inspectDate = useCallback(
    (date: string | null) => {
      if (!date || !model || date === model.today) {
        setInspect(null);
        return;
      }
      const day = (() => {
        if (!model.lastPeriodStart) return null;
        const d = new Date(`${date}T00:00:00`).getTime();
        const s = new Date(`${model.lastPeriodStart}T00:00:00`).getTime();
        const diff = Math.floor((d - s) / 86_400_000) + 1;
        return diff > 0 ? diff : null;
      })();
      setInspect(day ? { day, date } : null);
    },
    [model],
  );

  /* keyboard shortcut: "q" opens the quick log when not typing */
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

  const tierChip = (() => {
    if (!model) return null;
    const n = model.completed.length;
    const label =
      n === 0
        ? "awaiting first anchor"
        : n === 1
          ? "learning · 1 cycle"
          : n <= 3
            ? `building baseline · ${n} cycles`
            : `personal pattern · ${n} cycles`;
    return (
      <span
        className="cy-tier"
        title="How much of this page is your data rather than the general pattern"
      >
        <span
          className="inline-block size-1.5 rounded-full"
          style={{
            background:
              n === 0
                ? "var(--faint)"
                : n === 1
                  ? "var(--amber)"
                  : n <= 3
                    ? "var(--sky)"
                    : "var(--sage)",
          }}
          aria-hidden
        />
        {label}
      </span>
    );
  })();

  return (
    <div className="cycle-page relative min-h-screen bg-background text-foreground">
      <BloomHeader />
      <main className="cy-main">
        {localOnly ? (
          <p className="mono pb-1 text-center text-[9px] uppercase tracking-[0.09em] text-faint">
            preview — kept on this device · signing in syncs it, if you ever want
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-xl border border-amber/30 bg-amber/5 px-4 py-2.5 text-center text-[12.5px] text-amber">
            {error}{" "}
            <button type="button" onClick={system.refresh} className="underline underline-offset-2">
              Try again
            </button>
          </p>
        ) : null}

        {/* I — where you are */}
        <Reveal>
          <div className="cy-chapter cy-chapter--flush">
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
              onViewForecast={() => scrollTo("cycle-forecast")}
            />
          </div>
        </Reveal>

        {/* II — what's next */}
        <Reveal delay={40}>
          <Chapter
            no="II · what's coming"
            title="The road ahead, honestly drawn"
            sub="Solid where your logs anchor it, soft where the model reaches beyond them."
            id="cycle-forecast"
            right={tierChip}
          >
            {model ? (
              <CycleForecast
                model={model}
                onOpenMethod={() => setMethodOpen(true)}
                onLogStart={() => openQuick()}
              />
            ) : (
              <BlockSkeleton h={150} />
            )}
            <div className="mt-9">
              <p className="cy-eyebrow mb-3">The week, day by day</p>
              {model ? (
                <CycleTimeline
                  model={model}
                  entries={entries}
                  onLogDay={(date) => {
                    setQuickDate(date);
                    setEditing(entries.find((e) => e.date === date) ?? null);
                    setAdvancedOpen(true);
                  }}
                  onInspect={inspectDate}
                />
              ) : (
                <BlockSkeleton h={140} />
              )}
            </div>
          </Chapter>
        </Reveal>

        {/* III — what Bloom notices */}
        <Reveal delay={40}>
          <Chapter
            no="III · what bloom notices"
            title="Bloom noticed"
            sub="Correlation language only — descriptions of what tends to go together in your logs, never diagnoses."
            id="cycle-insight"
          >
            <InsightCard
              insight={insight}
              signals={
                model
                  ? [
                      `phase · ${model.currentPhase ?? "unknown"}`,
                      `${entries.length} day${entries.length === 1 ? "" : "s"} logged`,
                      model.completed.length > 0
                        ? `${model.completed.length} completed cycle${model.completed.length === 1 ? "" : "s"}`
                        : "no completed cycles yet",
                      model.variabilityPercent !== null
                        ? `spread ±${Math.round(model.stdDev ?? 0)}d`
                        : "spread unknown",
                    ]
                  : []
              }
              onAsk={() => askBloom("Why am I seeing this insight?")}
              stillLearning={
                <p className="cy-title text-[17px] leading-snug text-muted-foreground">
                  Bloom is still learning your rhythm.
                  <span className="mt-1.5 block text-[13px] font-normal">
                    A few more completed cycles let the page compare your own records instead of
                    leaning on general estimates — nothing will be said about you before it's true
                    of your data.
                  </span>
                </p>
              }
            />
            <div className="mt-5">
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

        {/* IV — your recent rhythm */}
        <Reveal delay={40}>
          <Chapter
            no="IV · your recent rhythm"
            title="Your history so far"
            sub="Every mark is a cycle you actually completed. Averages appear only when the data earns them."
            id="cycle-history"
            right={
              <>
                {model && entries.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAdvEntry(null);
                      setAdvancedOpen(true);
                    }}
                    className="mono inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
                  >
                    <PencilLine className="size-3" aria-hidden /> Advanced log
                  </button>
                ) : null}
                {tierChip}
              </>
            }
          >
            {model ? (
              <Suspense fallback={<BlockSkeleton h={220} />}>
                <CycleHistory model={model} entries={entries} />
              </Suspense>
            ) : (
              <BlockSkeleton h={220} />
            )}
          </Chapter>
        </Reveal>

        {/* V — what is becoming personal */}
        <Reveal delay={40}>
          <Chapter
            no="V · what is becoming personal"
            title="Your patterns"
            sub="What your own logs keep repeating — observation first, always with its sample size."
            id="cycle-patterns"
          >
            {model ? (
              <PatternInsights
                model={model}
                entries={entries}
                onOpenMethod={() => setMethodOpen(true)}
              />
            ) : (
              <BlockSkeleton h={160} />
            )}
          </Chapter>
        </Reveal>

        {/* VI + VII — closer looks */}
        <Reveal delay={40}>
          <Chapter
            no="VI · a closer look"
            title="Calendar"
            sub="For exploring dates — one month at a time; selecting a day shows what Bloom actually knows about it."
            id="cycle-calendar"
          >
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
              <BlockSkeleton h={300} />
            )}
          </Chapter>
        </Reveal>

        <Reveal delay={40}>
          <Chapter
            no="VII · the fine print of the body"
            title="The four phases"
            sub="General education, kept separate from your observations. Your active phase leads."
          >
            {model ? <PhasesGuide model={model} /> : <BlockSkeleton h={180} />}
          </Chapter>
        </Reveal>

        <footer className="cy-chapter flex flex-col items-start gap-2">
          <p className="mono text-[9.5px] uppercase tracking-[0.08em] text-faint">
            cycle records stay private · nothing here is medical advice · estimates mean uncertainty
          </p>
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
            className="mono rounded-full border border-border px-3 py-1 text-[9.5px] uppercase tracking-[0.08em] text-faint transition-colors hover:text-foreground"
          >
            Export my data (csv) · {fmtShort(model?.today ?? localDateKey())}
          </button>
        </footer>
      </main>

      {/* overlays — the deep forms live here; the everyday ones live inline above */}
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
  );
}

function BlockSkeleton({ h }: { h: number }) {
  return (
    <div className="animate-pulse rounded-2xl bg-surface/40" style={{ height: h }} aria-hidden />
  );
}
