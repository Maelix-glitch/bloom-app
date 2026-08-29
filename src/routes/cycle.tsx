import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
import { entriesToCsv } from "@/lib/cycle/storage";
import { QuickLog, AdvancedCycleLog } from "@/components/cycle/Logs";
import { CycleLengthSheet } from "@/components/cycle/CycleLengthSheet";
import { MethodologyDialog } from "@/components/cycle/CycleHistory";
import { CycleHero } from "@/components/cycle/CycleHero";
import { CycleTimeline } from "@/components/cycle/CycleTimeline";
import { PatternInsights } from "@/components/cycle/PatternInsights";
import { PhasesGuide } from "@/components/cycle/PhasesGuide";
import { CycleCalendar } from "@/components/cycle/CycleCalendar";
import { InsightCard, RecommendationStack } from "@/components/cycle/Insights";
import { BloomCycleAI } from "@/components/cycle/BloomCycleAI";
import { CycleSection } from "@/components/cycle/parts";
import { toast, Toaster } from "sonner";

/* below-the-fold weight loads progressively — hero, timeline and calendar never wait on it */
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

  const scrollToHistory = useCallback(
    () =>
      document
        .getElementById("cycle-history")
        ?.scrollIntoView({ behavior: "smooth", block: "start" }),
    [],
  );

  /* day draft → entry patch (cycle day + phase derived, never asked from user) */
  const saveDraft = useCallback(
    async (draft: DayDraft) => {
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
      toast(localOnly ? "Saved on this device." : "Saved.");
    },
    [model, system, localOnly],
  );

  /* one-tap strip logging: merge with today's existing entry — never clobber other fields */
  const todayEntry = useMemo(
    () => entries.find((e) => e.date === (model?.today ?? localDateKey())) ?? null,
    [entries, model],
  );
  const stripSave = useCallback(
    async (patch: Partial<Pick<DayDraft, "flow" | "mood" | "energy">>) => {
      const base: DayDraft = {
        date: model?.today ?? localDateKey(),
        flow: todayEntry?.flow ?? null,
        mood: todayEntry?.mood ?? null,
        energy: todayEntry?.energy ?? null,
        pain: todayEntry?.pain_level ?? null,
        symptoms: todayEntry?.symptoms ?? [],
        notes: todayEntry?.notes ?? "",
        temperature: todayEntry?.temperature ?? null,
        cervical_mucus: todayEntry?.cervical_mucus ?? null,
        lh_test: todayEntry?.lh_test ?? null,
        sexual_activity: todayEntry?.sexual_activity ?? null,
        contraceptive: todayEntry?.contraceptive ?? null,
        sleep_hours: todayEntry?.sleep_hours ?? null,
      };
      await saveDraft({ ...base, ...patch });
    },
    [model, todayEntry, saveDraft],
  );

  /* deep-ish keyboard shortcut: "q" opens quick log when not typing */
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
    <Shell>
      {localOnly ? (
        <p className="mono pt-1 text-center text-[9px] uppercase tracking-[0.09em] text-faint">
          preview — kept on this device · signing in syncs it, if you ever want
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-xl border border-amber/30 bg-amber/5 px-4 py-2.5 text-center text-[12.5px] text-amber">
          {error}{" "}
          <button type="button" onClick={system.refresh} className="underline underline-offset-2">
            Try again
          </button>
        </p>
      ) : null}

      {/* HERO — wheel-anchored two-part composition with up-next + quick log */}
      <Reveal>
        <CycleHero
          model={model}
          loading={loading}
          todayEntry={todayEntry}
          onQuickLog={() => openQuick()}
          onStripSave={stripSave}
          onOpenAdvanced={() => {
            setAdvEntry(null);
            setAdvancedOpen(true);
          }}
          onAdjust={() => setAdjustOpen(true)}
          onViewAll={scrollToHistory}
          onOpenMethod={() => setMethodOpen(true)}
        />
      </Reveal>

      {/* NEXT SEVEN DAYS */}
      <Reveal delay={40}>
        <CycleSection
          title="The next seven days"
          sub="A visual continuation of the wheel above — soft means estimated."
        >
          {model ? (
            <CycleTimeline
              model={model}
              entries={entries}
              onLogDay={(date) => {
                setQuickDate(date);
                setEditing(entries.find((e) => e.date === date) ?? null);
                setAdvancedOpen(true);
              }}
            />
          ) : (
            <BlockSkeleton h={140} />
          )}
        </CycleSection>
      </Reveal>

      {/* TODAY — insight + honest suggestions, from real data only */}
      <Reveal delay={40}>
        <CycleSection
          id="cycle-insight"
          title="Today, from your data"
          sub="Correlation language only — Bloom describes what tends to go together in your logs."
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
            onAsk={() => toast("Open the Bloom assistant (bottom right) — it picks this up.")}
          />
          <div className="mt-5">
            <RecommendationStack
              recs={recs}
              onDismiss={(id) => {
                dismissStore.dismiss(id);
                setDismissTick((t) => t + 1);
              }}
              onAsk={() =>
                toast("The assistant answers from the same data — bottom-right button opens it.")
              }
            />
          </div>
        </CycleSection>
      </Reveal>

      {/* HISTORY + PATTERNS */}
      <Reveal delay={40}>
        <CycleSection
          title="Your history"
          id="cycle-history"
          sub="Every bar is a cycle you actually completed. Averages appear only when the data earns them."
          gap="wide"
          right={
            model && entries.length > 0 ? (
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
            ) : null
          }
        >
          {model ? (
            <Suspense fallback={<BlockSkeleton h={220} />}>
              <CycleHistory model={model} entries={entries} />
            </Suspense>
          ) : (
            <BlockSkeleton h={220} />
          )}
          <div id="cycle-patterns" className="mt-12 scroll-mt-6">
            <h3 className="cy-title mb-1 text-[19px]">Your patterns</h3>
            <p className="mb-4 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">
              What your own logs keep repeating — observation first, always with its sample size.
            </p>
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
        </CycleSection>
      </Reveal>

      {/* PHASE EDUCATION */}
      <Reveal delay={40}>
        <CycleSection
          title="The four phases"
          sub="General education, kept separate from your observations. The active phase leads."
          gap="wide"
        >
          {model ? <PhasesGuide model={model} /> : <BlockSkeleton h={180} />}
        </CycleSection>
      </Reveal>

      {/* CALENDAR */}
      <Reveal delay={40}>
        <CycleSection
          title="Calendar"
          id="cycle-calendar"
          sub="A surface for exploring dates — one month at a time, context for whatever you select."
          gap="wide"
        >
          {model ? (
            <CycleCalendar
              model={model}
              entries={entries}
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
        </CycleSection>
      </Reveal>

      <footer className="cy-section mt-16 flex flex-col items-start gap-2">
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

      {/* overlays — every form field the page supports lives here */}
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
        onSave={saveDraft}
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
        defaultDate={quickDate}
        onSave={saveDraft}
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
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="cycle-page relative min-h-screen bg-background text-foreground">
      <BloomHeader />
      <main className="relative z-[1] mx-auto w-full max-w-[1120px] px-4 pb-24 pt-4 sm:px-6 lg:px-10">
        {children}
      </main>
    </div>
  );
}

function BlockSkeleton({ h }: { h: number }) {
  return (
    <div className="animate-pulse rounded-2xl bg-surface/45" style={{ height: h }} aria-hidden />
  );
}
