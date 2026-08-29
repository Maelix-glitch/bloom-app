import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Info, PencilLine, Plus } from "lucide-react";

import { useCycleSystem } from "@/hooks/useCycleSystem";
import { BloomHeader } from "@/components/BloomHeader";
import { Atmosphere } from "@/components/mood/Atmosphere";
import { Reveal } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { PHASE_LABEL } from "@/lib/cycle/types";
import type { CycleEntry } from "@/lib/cycle/types";
import { daysAwayLabel, fmtShort, localDateKey } from "@/lib/cycle/engine";
import { buildPersonalInsight, buildRecommendations, dismissStore } from "@/lib/cycle/intelligence";
import type { DayDraft } from "@/components/cycle/Logs";
import { entriesToCsv } from "@/lib/cycle/storage";
import { QuickLog, AdvancedLog } from "@/components/cycle/Logs";
import { CycleRing } from "@/components/cycle/CycleRing";
import { NextEvents } from "@/components/cycle/NextEvents";
import { CycleCalendar } from "@/components/cycle/CycleCalendar";
/* below-the-fold weight loads progressively — the hero, events, and calendar never wait on it */
const Analytics = lazy(() =>
  import("@/components/cycle/Analytics").then((m) => ({ default: m.Analytics })),
);
import { InsightCard, RecommendationStack } from "@/components/cycle/Insights";
import { AssistantDock } from "@/components/cycle/AssistantDock";
import { CycleSection, ObserveLegend } from "@/components/cycle/parts";
import { toast, Toaster } from "sonner";

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
  }),
  component: CyclePage,
});

function CyclePage() {
  const system = useCycleSystem();
  const { model, context, entries, loading, error, localOnly } = system;

  const [quickOpen, setQuickOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
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

  const heroHeadline = model?.currentDay
    ? `Day ${model.currentDay} — ${model.currentPhase ? (PHASE_LABEL[model.currentPhase] ?? model.currentPhase).toLowerCase() : "your cycle"}`
    : "Your cycle, quietly tracked";
  const heroSub = model?.lastPeriodStart
    ? model.usesDefaultAssumption
      ? `Period started ${fmtShort(model.lastPeriodStart)}. Estimates follow a general 28-day pattern until you log a couple of cycles — then they become yours.`
      : `Based on your last ${Math.min(6, model.completed.length)} cycle${model.completed.length === 1 ? "" : "s"} — average ${model.average?.toFixed(1)} days${model.variabilityPercent !== null ? `, variability ${model.variabilityPercent}%` : ""}.`
    : "Log the day a period starts and the page becomes yours: phases, estimates, patterns — nothing invented.";
  const nextPeriodEvent = model?.events.find((e) => e.id === "next-period");

  return (
    <Shell>
      {localOnly ? (
        <p className="mb-4 text-center text-[11.5px] text-faint">
          preview — logs are kept on this device; signing in syncs them to your account, later, if
          you ever want
        </p>
      ) : null}
      {error ? (
        <p className="mb-6 rounded-xl border border-amber/30 bg-amber/5 px-4 py-2.5 text-center text-[12.5px] text-amber">
          {error}{" "}
          <button type="button" onClick={system.refresh} className="underline underline-offset-2">
            Try again
          </button>
        </p>
      ) : null}

      {/* HERO */}
      <Reveal>
        <section aria-label="Cycle today" className="relative pb-2 pt-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[-40px] -z-[1] h-[380px]"
            style={{
              background: model?.currentPhase
                ? `radial-gradient(50% 58% at 50% 46%, color-mix(in oklab, var(--cycle-${model.currentPhase === "ovulation" ? "ovulation" : model.currentPhase}) 10%, transparent), transparent 72%)`
                : "radial-gradient(50% 58% at 50% 46%, color-mix(in oklab, var(--violet) 8%, transparent), transparent 72%)",
            }}
          />
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
            <div className="order-2 min-w-0 lg:order-1">
              <p className="eyebrow mb-3 flex items-center gap-2">
                Cycle · personal insight
                {loading ? <span className="text-faint">· reading your record…</span> : null}
              </p>
              <h1 className="display text-pretty text-[30px] leading-[1.08] tracking-[-0.022em] sm:text-[38px]">
                {heroHeadline}
              </h1>
              <p className="mt-3 max-w-[54ch] text-[14px] leading-relaxed text-muted-foreground">
                {heroSub}
              </p>
              {nextPeriodEvent ? (
                <p className="mono mt-3 flex flex-wrap items-center gap-x-2 text-[11px] uppercase tracking-[0.06em] text-faint">
                  <CalendarDays className="size-3.5" aria-hidden />
                  next period estimated{" "}
                  {fmtShort(nextPeriodEvent.date ?? nextPeriodEvent.rangeStart ?? localDateKey())}
                  <span className="text-muted-foreground">
                    ({daysAwayLabel(nextPeriodEvent.daysAway)})
                  </span>
                  {model?.usesDefaultAssumption ? (
                    <span className="text-[color:var(--cycle-ovulation)]">· general pattern</span>
                  ) : null}
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openQuick()}
                  className="inline-flex items-center gap-2 rounded-full px-4.5 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-transform duration-[var(--motion-med)] hover:scale-[1.015] active:scale-[0.99]"
                  style={{ background: "linear-gradient(135deg, var(--violet), var(--sky))" }}
                >
                  <Plus className="size-3.5" aria-hidden /> Quick log
                </button>
                <a
                  href="#cycle-calendar"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  <CalendarDays className="size-3.5" aria-hidden /> Calendar
                </a>
                <a
                  href="#cycle-intelligence"
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Info className="size-3.5" aria-hidden /> Insights
                </a>
              </div>
            </div>
            <div className="order-1 flex flex-col items-center gap-2 lg:order-2">
              {model ? (
                <>
                  <CycleRing model={model} />
                  <ObserveLegend />
                </>
              ) : (
                <RingSkeleton />
              )}
            </div>
          </div>

          <div className="mt-7">
            <InsightCard
              insight={insight}
              onAsk={() =>
                toast("Open the Bloom assistant (bottom right) — it remembers this question.")
              }
            />
          </div>
        </section>
      </Reveal>

      {/* NEXT EVENTS */}
      <Reveal delay={40}>
        <CycleSection
          title="What comes next"
          sub="Estimates for awareness and planning — never verdicts."
          gap="default"
        >
          {model ? <NextEvents model={model} /> : <BlockSkeleton h={120} />}
        </CycleSection>
      </Reveal>

      {/* CALENDAR */}
      <Reveal delay={40}>
        <CycleSection title="Calendar" id="cycle-calendar" gap="wide">
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

      {/* RECOMMENDATIONS */}
      <Reveal delay={40}>
        <CycleSection
          title="Might help right now"
          sub="Optional suggestions drawn from your actual state — ignore freely."
          gap="default"
        >
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
        </CycleSection>
      </Reveal>

      {/* ANALYTICS */}
      <Reveal delay={40}>
        <CycleSection
          title="Cycle intelligence"
          id="cycle-intelligence"
          sub="Summaries of what you've logged. Empty stretches stay honestly empty."
          gap="wide"
          right={
            model && entries.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setAdvEntry(null);
                  setAdvancedOpen(true);
                }}
                className="mono inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.07em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
              >
                <PencilLine className="size-3" aria-hidden /> Advanced log
              </button>
            ) : null
          }
        >
          {model ? (
            <Suspense fallback={<BlockSkeleton h={220} />}>
              <Analytics model={model} entries={entries} />
            </Suspense>
          ) : (
            <BlockSkeleton h={220} />
          )}
        </CycleSection>
      </Reveal>

      <footer className="mt-12 flex flex-col items-center gap-2 border-t border-border/60 pt-5 text-center">
        <p className="mono text-[10px] uppercase tracking-[0.08em] text-faint">
          cycle records are private to your account · nothing here is medical advice
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
          Export my data (csv)
        </button>
      </footer>

      {/* overlays */}
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
      <AdvancedLog
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
      <AssistantDock
        context={context}
        insight={insightSeen ? null : insight}
        onSeenInsight={() => setInsightSeen(true)}
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
    <div className="relative min-h-screen bg-background text-foreground">
      <BloomHeader />
      <Atmosphere />
      <main className="relative mx-auto w-full max-w-[1060px] px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function RingSkeleton() {
  return (
    <div
      className="grid size-[264px] animate-pulse place-items-center rounded-full border border-border/60 bg-surface-3/30"
      aria-hidden
    >
      <div className="size-24 rounded-full bg-surface-3/50" />
    </div>
  );
}

function BlockSkeleton({ h }: { h: number }) {
  return (
    <div className="animate-pulse rounded-2xl bg-surface-3/25" style={{ height: h }} aria-hidden />
  );
}
