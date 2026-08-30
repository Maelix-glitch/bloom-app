/**
 * CycleIntelligence — the whole page body, themeable and embeddable.
 *
 * /cycle renders this live; /cycle-styles renders several of them side by side
 * with the same components at smaller widths, so a direction can be judged on
 * real content instead of swatches alone.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { PhaseWave } from "./PhaseWave";
import { Atmosphere } from "./Atmosphere";
import { Reveal, CountUp } from "./motion";
import { SignatureStrip } from "./SignatureStrip";
import { SymptomPhaseGrid } from "./SymptomPhaseGrid";
import { CycleHeatmap } from "./CycleHeatmap";
import { RhythmChart } from "./RhythmChart";
import { FlowBreakdown, ForecastStrip, PhaseCards, StatsStrip } from "./AnalyticsCards";
import { LogPanel } from "./LogPanel";
import { CycleDial } from "./CycleDial";
import { SymptomBloom } from "./SymptomBloom";
import { VitalDials } from "./VitalDials";
import { DayLogInsights } from "./DayLogInsights";
import { PredictionsCard } from "./PredictionsCard";
import { InsightsPanel } from "./InsightsPanel";
import { TipsCard } from "./TipsCard";
import { HistoryTable } from "./HistoryTable";
import { Button, Card, Disclaimer } from "./primitives";
import { BlockHead } from "./SignatureStrip";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { daysToCsv, logsToCsv } from "@/lib/cycle/periodStore";
import { DEFAULT_THEME_ID } from "@/lib/cycle/themes";
import { formatDate, type LogDraft, type PeriodLog } from "@/lib/cycle/predict";

export function CycleIntelligence({
  theme = DEFAULT_THEME_ID,
  preview = false,
  showFooterLinks = true,
}: {
  theme?: string;
  /** Disables writes — used by the style gallery so previews can't edit data. */
  preview?: boolean;
  showFooterLinks?: boolean;
}) {
  const store = usePeriodLog();
  const { analysis, logs, today, hydrated } = store;
  const [editing, setEditing] = useState<PeriodLog | null>(null);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  /** Survives the panel remounting when the first entry switches the layout. */
  const [notice, setNotice] = useState<string | null>(null);
  const [logDate, setLogDate] = useState<string>(store.today);
  const formRef = useRef<HTMLDivElement>(null);
  const hasEntries = analysis.entryCount > 0;

  const focusDayLog = useCallback((date?: string) => {
    if (date) setLogDate(date);
    formRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  }, []);

  const focusForm = useCallback(() => {
    formRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    window.setTimeout(() => {
      formRef.current?.querySelector<HTMLInputElement>("input[type='date']")?.focus();
    }, 220);
  }, []);

  /* follow the clock so "today" in the day log stays today */
  useEffect(() => {
    setLogDate((current) => (current === "" ? today : current));
  }, [today]);

  /* when an edit is cancelled from anywhere, drop the draft */
  useEffect(() => {
    if (editing && !logs.some((l) => l.id === editing.id)) setEditing(null);
  }, [logs, editing]);

  const submit = useCallback(
    (draft: LogDraft) => {
      const result = editing ? store.update(editing.id, draft) : store.add(draft);
      if (result.ok) {
        setNotice(
          editing ? "Entry updated — every number below was recalculated." : "Period logged.",
        );
        if (editing) setEditing(null);
      }
      return result;
    },
    [editing, store],
  );

  const exportCsv = useCallback(() => {
    if (logs.length === 0 && store.days.length === 0) return;
    const stamp = today.replace(/-/g, "");
    const download = (name: string, body: string) => {
      const blob = new Blob([body], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    };
    if (logs.length > 0) download(`bloom-cycle-entries-${stamp}.csv`, logsToCsv(logs));
    if (store.days.length > 0) download(`bloom-daily-log-${stamp}.csv`, daysToCsv(store.days));
  }, [logs, store.days, today]);

  return (
    <div className="ci ci-root" data-theme={theme}>
      <Atmosphere />
      <div className="ci-grain" aria-hidden />
      <div className="ci-veil" aria-hidden />
      <div className="ci-shell">
        {/* ------------------------------- header ------------------------------ */}
        <header className="ci-rise max-w-[68ch]">
          <p className="ci-eyebrow">{greeting()} · Bloom Cycle Intelligence</p>
          <h1 className="ci-display mt-3 text-[30px] leading-[1.08] sm:text-[40px]">
            Your cycle, read back to you —
            <br />
            <span style={{ color: "var(--ci-follicular)" }}>before it happens.</span>
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed ci-soft sm:text-[15px]">
            Log the day a period starts. Everything below — predicted dates, your current phase, how
            much to trust it, and what tends to help — is calculated from your own record and
            recalculated the moment you change it.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] ci-muted">
            <span>stored in this browser only</span>
            <span aria-hidden>·</span>
            <span>estimates, not medical advice</span>
            {preview ? (
              <>
                <span aria-hidden>·</span>
                <span style={{ color: "var(--ci-ovulation)" }}>preview — editing disabled</span>
              </>
            ) : null}
          </div>
        </header>

        {hydrated && analysis.entryCount > 0 ? (
          <div className="mt-6">
            <SignatureStrip analysis={analysis} dayAnalysis={store.dayAnalysis} />
          </div>
        ) : null}

        {!hydrated ? (
          <div className="mt-10 space-y-4" aria-hidden>
            <div className="ci-card h-[240px] animate-pulse" />
            <div className="ci-card h-[180px] animate-pulse" />
          </div>
        ) : (
          <>
            {/* ---------------------- first-run: log a period ------------------ */}
            {!hasEntries ? (
              <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
                <Card className="ci-rise ci-rise-1">
                  <p className="ci-eyebrow">Start here</p>
                  <h2 className="ci-display mt-2 text-[22px] leading-tight sm:text-[26px]">
                    One date is enough to begin.
                  </h2>
                  <p className="mt-3 text-[13px] leading-relaxed ci-soft">
                    Add the first day of your most recent period. One entry gives you a generic
                    28-day placeholder, clearly labelled as one. Log a second period and the page
                    switches to your own pattern.
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {[
                      "Predictions hide themselves until there's something real to predict.",
                      "Implausible gaps get flagged, never silently averaged in.",
                      "Delete or edit anything and every number recomputes from what's left.",
                    ].map((line) => (
                      <li key={line} className="flex gap-2.5 text-[12.5px] leading-relaxed ci-soft">
                        <span
                          aria-hidden
                          className="mt-[7px] h-[5px] w-[5px] shrink-0 rotate-45 rounded-[1px]"
                          style={{ background: "var(--ci-follicular)" }}
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
                  {!preview ? (
                    <Button variant="primary" className="mt-6" onClick={focusForm}>
                      Log your first period
                      <ArrowRight size={14} aria-hidden />
                    </Button>
                  ) : null}
                </Card>

                <div ref={formRef} className="ci-rise ci-rise-2">
                  <LogPanel
                    logs={logs}
                    days={store.days}
                    today={today}
                    analysis={analysis}
                    date={logDate}
                    onDateChange={setLogDate}
                    disabled={preview}
                    onSavePeriod={submit}
                    onSaveDay={store.saveDay}
                    onDeleteDay={store.removeDay}
                    notice={notice}
                  />
                </div>

                <Card className="lg:col-span-2">
                  <p className="ci-eyebrow">What appears once you log</p>
                  <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                    Ten views, all computed from your own entries
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      {
                        name: "Phase wave",
                        body: "Where today sits in your cycle, with ovulation, the fertile window and your next start marked on one line.",
                      },
                      {
                        name: "Predictions",
                        body: "Next period, ovulation estimate, fertile window and average length — each with a confidence badge.",
                      },
                      {
                        name: "Cycle lengths chart",
                        body: "Every cycle as a bar against your average. Gaps that were excluded stay on the chart, marked as excluded.",
                      },
                      {
                        name: "The numbers",
                        body: "Average, shortest–longest range, variability, average bleed length and total days tracked.",
                      },
                      {
                        name: "Flow mix",
                        body: "How light, medium and heavy distribute across everything you've logged.",
                      },
                      {
                        name: "Phase cards",
                        body: "Your current cycle split into the four phases, with the real dates each one is expected to cover.",
                      },
                      {
                        name: "Forward look",
                        body: "The next three cycles projected from your average, phase by phase.",
                      },
                      {
                        name: "Advanced daily log",
                        body: "Symptoms, mood, energy, pain, sleep and fertility signs per day — then compared across your phases.",
                      },
                      {
                        name: "Twelve-week rhythm map",
                        body: "One cell per day, coloured by phase, brighter where you logged more.",
                      },
                      {
                        name: "Symptom map",
                        body: "Which symptom belongs to which phase in your record, at a glance.",
                      },
                    ].map((item) => (
                      <div
                        key={item.name}
                        className="rounded-[var(--ci-radius-md)] border px-3.5 py-3 ci-hair"
                      >
                        <p className="text-[12.5px] font-medium">{item.name}</p>
                        <p className="mt-1 text-[11.5px] leading-relaxed ci-muted">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {store.legacyAvailable && !preview ? (
                  <Card className="lg:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Sparkles
                          size={16}
                          aria-hidden
                          style={{ color: "var(--ci-ovulation)", marginTop: 2 }}
                        />
                        <div>
                          <p className="text-[13.5px] font-medium">
                            You have periods in an older Bloom log
                          </p>
                          <p className="mt-1 text-[12.5px] leading-relaxed ci-soft">
                            The previous version of this page logged individual days. We can group
                            those bleeding days into whole periods and bring them across — no
                            retyping, and nothing leaves your device.
                          </p>
                        </div>
                      </div>
                      <Button onClick={() => store.importLegacy()}>Bring them over</Button>
                    </div>
                  </Card>
                ) : null}
              </div>
            ) : (
              <>
                {/* ------------------------- phase overview --------------------- */}
                <Card className="ci-rise ci-rise-1 mt-8">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="ci-eyebrow">Phase overview</p>
                      <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                        Day {analysis.cycleDay} of about {Math.round(analysis.averageLength)}
                      </h2>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
                        <span
                          style={{ color: `var(--ci-${analysis.phase ?? "follicular"})` }}
                          className="font-medium"
                        >
                          {analysis.phaseLabel}
                        </span>
                        {analysis.lastStart ? ` · started ${formatDate(analysis.lastStart)}` : null}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid items-center gap-6 lg:grid-cols-[minmax(240px,320px)_1fr]">
                    <CycleDial analysis={analysis} days={store.days} />
                    <div>
                      <PhaseWave analysis={analysis} />
                      <p className="mt-2 text-[11.5px] leading-relaxed ci-muted">
                        An estimate, not a fact — both assume your next period lands on the
                        predicted date. Log a new start and they redraw immediately.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* ----------------- predictions · insights · tips -------------- */}
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                  <div>
                    <Reveal delay={0}>
                      <PredictionsCard analysis={analysis} />
                    </Reveal>
                  </div>
                  <div>
                    <Reveal delay={90}>
                      <TipsCard analysis={analysis} dayAnalysis={store.dayAnalysis} />
                    </Reveal>
                  </div>
                </div>

                {/* ------------------------ analytics --------------------------- */}
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
                  <div className="ci-card ci-card--pad ci-lift">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="ci-eyebrow">Cycle lengths</p>
                        <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                          Your rhythm over time
                        </h2>
                        <p className="mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed ci-soft">
                          Each bar is one cycle. Dashed bars were left out of the average — too
                          short or too long to be a real cycle — but they stay on the chart.
                        </p>
                      </div>
                      {analysis.trend ? (
                        <span
                          className="ci-badge"
                          style={{
                            color: "var(--ci-ovulation)",
                            borderColor:
                              "color-mix(in oklab, var(--ci-ovulation) 45%, transparent)",
                          }}
                        >
                          {analysis.trend.direction === "lengthening"
                            ? "getting longer"
                            : "getting shorter"}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <RhythmChart analysis={analysis} />
                    </div>
                  </div>

                  <div className="ci-card ci-card--pad ci-lift">
                    <p className="ci-eyebrow">The numbers</p>
                    <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                      What your record adds up to
                    </h2>
                    <div className="mt-4">
                      <StatsStrip analysis={analysis} />
                    </div>
                    <div className="mt-5 border-t pt-4 ci-hair">
                      <p className="ci-eyebrow">Flow mix</p>
                      <div className="mt-3">
                        <FlowBreakdown analysis={analysis} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ------------------- phases + forward look -------------------- */}
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                  <div className="ci-card ci-card--pad ci-lift">
                    <p className="ci-eyebrow">The four phases</p>
                    <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                      This cycle, split into phases
                    </h2>
                    <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed ci-soft">
                      From your own average, so the dates shift as your record shifts.
                    </p>
                    <div className="mt-4">
                      <PhaseCards analysis={analysis} />
                    </div>
                  </div>

                  <div className="ci-card ci-card--pad ci-lift">
                    <p className="ci-eyebrow">Forward look</p>
                    <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                      The next three cycles
                    </h2>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
                      Projected from your average. Useful for planning, never a promise.
                    </p>
                    <div className="mt-4">
                      <ForecastStrip analysis={analysis} />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Reveal>
                    <InsightsPanel
                      analysis={analysis}
                      onAddSuggested={
                        preview
                          ? undefined
                          : (start) => {
                              setEditing(null);
                              setPendingStart(start);
                              focusForm();
                            }
                      }
                    />
                  </Reveal>
                </div>

                {/* ------------------------------ log --------------------------- */}
                <div ref={formRef} className="mt-4">
                  <Reveal>
                    <LogPanel
                      logs={logs}
                      days={store.days}
                      today={today}
                      analysis={analysis}
                      date={logDate}
                      onDateChange={setLogDate}
                      editing={editing}
                      onCancelEdit={() => setEditing(null)}
                      pendingStart={pendingStart}
                      onPendingConsumed={() => setPendingStart(null)}
                      disabled={preview}
                      onSavePeriod={submit}
                      onSaveDay={store.saveDay}
                      onDeleteDay={store.removeDay}
                      notice={notice}
                    />
                  </Reveal>
                </div>

                {/* --------------------- patterns in your record ------------------- */}
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="ci-card ci-card--pad ci-lift">
                    <BlockHead
                      index="04"
                      eyebrow="Rhythm map"
                      title="Twelve weeks, one cell per day"
                      note="Each square is a day, coloured by the phase it fell in. Brighter squares carry more logged detail; the outlined square is today."
                    />
                    <div className="mt-4">
                      <CycleHeatmap days={store.days} analysis={analysis} />
                    </div>
                  </div>

                  <div className="ci-card ci-card--pad ci-lift">
                    <BlockHead
                      index="05"
                      eyebrow="Symptom map"
                      title="Which symptom lives in which phase"
                      note="Built only from days you logged — a symptom you've never recorded isn't on the grid."
                    />
                    <div className="mt-4">
                      <SymptomPhaseGrid rows={store.dayAnalysis.symptomPhase} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="ci-card ci-card--pad ci-lift">
                    <BlockHead
                      index="06"
                      eyebrow="Bloom"
                      title="What shows up, and how often"
                      note="One petal per symptom."
                    />
                    <div className="mt-4">
                      <SymptomBloom
                        tally={store.dayAnalysis.symptoms}
                        total={store.dayAnalysis.total}
                      />
                    </div>
                  </div>

                  <div className="ci-card ci-card--pad ci-lift">
                    <BlockHead
                      index="07"
                      eyebrow="Averages"
                      title="Energy, pain, sleep, mood"
                      note="Weighted across every day you logged."
                    />
                    <div className="mt-5">
                      <VitalDials dayAnalysis={store.dayAnalysis} />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Reveal delay={120}>
                    <DayLogInsights
                      days={store.days}
                      dayAnalysis={store.dayAnalysis}
                      onEditDate={preview ? undefined : focusDayLog}
                      onDeleteDate={preview ? undefined : store.removeDay}
                      disabled={preview}
                    />
                  </Reveal>
                </div>

                {/* ---------------------------- history ------------------------- */}
                <div className="mt-4">
                  <Reveal>
                    <HistoryTable
                      analysis={analysis}
                      logs={logs}
                      disabled={preview}
                      onEdit={(entry) => {
                        setEditing(entry);
                        focusForm();
                      }}
                      onDelete={(id) => store.remove(id)}
                      onClearAll={() => {
                        store.clearAll();
                        store.clearDays();
                        setEditing(null);
                      }}
                      onExport={exportCsv}
                    />
                  </Reveal>
                </div>
              </>
            )}

            {/* ------------------------------ footer ---------------------------- */}
            <footer className="ci-rise mt-8 border-t pt-5 ci-hair">
              <Disclaimer className="max-w-[76ch]" />
              {showFooterLinks && !preview ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px]">
                  <a href="/cycle-styles" className="ci-link py-1">
                    See the other design directions
                  </a>
                  <span aria-hidden className="ci-muted">
                    ·
                  </span>
                  <a href="/cycle-classic" className="ci-link py-1">
                    Previous version of this page
                  </a>
                </div>
              ) : null}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

/** A time-of-day hello — small, but it makes the page feel addressed to you. */
function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Late night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
