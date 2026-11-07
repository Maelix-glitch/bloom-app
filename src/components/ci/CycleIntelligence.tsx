/**
 * CycleIntelligence — the whole page body, themeable and embeddable.
 *
 * The page is organised around four destinations — overview, calendar,
 * insights, history — instead of a single wall of cards. Every estimate on the
 * overview comes from `analyseCycle`, so the numbers, their sample sizes and
 * their explanations cannot drift apart from each other.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { PhaseWave } from "./PhaseWave";
import { Atmosphere } from "./Atmosphere";
import { Reveal, CountUp } from "./motion";
import { SymptomPhaseGrid } from "./SymptomPhaseGrid";
import { CycleHeatmap } from "./CycleHeatmap";
import { RhythmChart } from "./RhythmChart";
import { FlowBreakdown, ForecastStrip, PhaseCards, StatsStrip } from "./AnalyticsCards";
import { LogPanel } from "./LogPanel";
import { CycleDial } from "./CycleDial";
import { SymptomBloom } from "./SymptomBloom";
import { VitalDials } from "./VitalDials";
import { DayLogInsights } from "./DayLogInsights";
import { InsightsPanel } from "./InsightsPanel";
import { TipsCard } from "./TipsCard";
import { HistoryTable } from "./HistoryTable";
import { CheckIns } from "./CheckIns";
import { CycleModeCard } from "./CycleModeCard";
import { ImportPeriods } from "./ImportPeriods";
import { UndoToast } from "./UndoToast";
import { Button, Card, Disclaimer } from "./primitives";
import { SyncLine } from "./SyncLine";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { daysToCsv, logsToCsv } from "@/lib/cycle/periodStore";
import { DEFAULT_THEME_ID } from "@/lib/cycle/themes";
import { PHASE_LABEL, formatDate, type LogDraft, type PeriodLog } from "@/lib/cycle/predict";
import {
  Collapse,
  CollapsibleSection,
  CycleBriefPanel,
  Details,
  CycleComparisonPanel,
  CycleOverviewPanel,
  InsightList,
  IntelTabs,
  ModelNote,
  PersonalPatternPanel,
  WhatChangedPanel,
  type IntelTab,
} from "./intel/CycleIntelPanels";
import { greetingFor } from "@/lib/home/today";
import type { CheckIn } from "@/lib/cycle/reconcile";

export function CycleIntelligence({
  theme = DEFAULT_THEME_ID,
  preview = false,
}: {
  theme?: string;
  /** Disables writes — previews can't edit data. */
  preview?: boolean;
}) {
  const store = usePeriodLog();
  const { analysis, logs, today, hydrated } = store;
  const [editing, setEditing] = useState<PeriodLog | null>(null);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  /** Survives the panel remounting when the first entry switches the layout. */
  const [notice, setNotice] = useState<string | null>(null);
  const [logDate, setLogDate] = useState<string>(store.today);
  const [tab, setTab] = useState<IntelTab>("overview");
  /* B8 — bring history in from another app */
  const [importOpen, setImportOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const hasEntries = analysis.entryCount > 0;
  /* paused / off: history and the daily log stay, everything forward-looking goes quiet */
  const expecting = store.mode === "tracking";

  /* One engine result for the whole page — see src/lib/cycle/canonical.ts. */
  const intel = store.intel;

  const focusDayLog = useCallback((date?: string) => {
    if (date) setLogDate(date);
    formRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  }, []);

  const focusForm = useCallback(() => {
    setTab("overview");
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

  /* a check-in answer either edits the record itself or hands over to the form */
  const answerCheckIn = useCallback(
    (checkIn: CheckIn, actionId: string) => {
      const next = store.answerCheckIn(checkIn, actionId);
      switch (next.type) {
        case "saved":
          setNotice(next.message);
          break;
        case "focus-form":
          setEditing(null);
          if (next.startPeriod) setPendingStart(next.date);
          else setLogDate(next.date);
          focusForm();
          break;
        case "edit-period": {
          const entry = logs.find((l) => l.id === next.periodId);
          if (entry) {
            setEditing(entry);
            focusForm();
          }
          break;
        }
        default:
          break;
      }
    },
    [store, logs, focusForm],
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

  const logPanel = (
    <LogPanel
      logs={logs}
      days={store.days}
      today={today}
      analysis={analysis}
      date={logDate}
      onDateChange={setLogDate}
      {...(hasEntries
        ? {
            editing,
            onCancelEdit: () => setEditing(null),
            pendingStart,
            onPendingConsumed: () => setPendingStart(null),
          }
        : {})}
      disabled={preview}
      onSavePeriod={submit}
      onSetPeriodEnd={store.setPeriodEnd}
      onSaveDay={store.saveDay}
      onDeleteDay={store.removeDay}
      notice={notice}
    />
  );

  return (
    <div className="ci ci-root" data-theme={theme}>
      <Atmosphere />
      <div className="ci-grain" aria-hidden />
      <div className="ci-veil" aria-hidden />
      <div className="ci-shell">
        {/* ------------------------------- header ------------------------------ */}
        <header className="ci-rise max-w-[62ch]">
          <p className="ci-eyebrow">{greeting()} · Bloom Cycle Intelligence</p>
          <h1 className="ci-display mt-2.5 text-[28px] leading-[1.1] sm:text-[36px]">
            Your cycle, read from your record.
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed ci-soft sm:text-[14px]">
            Dates, phases and patterns computed from what you log — with the evidence, the sample
            size and the uncertainty shown next to every estimate.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] ci-muted">
            <SyncLine sync={store.sync} onRetry={store.syncNow} />
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

        {hydrated ? (
          <CycleModeCard
            mode={store.mode}
            settings={store.settings}
            today={today}
            disabled={preview}
            onChange={store.setMode}
          />
        ) : null}

        {hydrated && store.checkIns.length > 0 ? (
          <div className="mt-4">
            <CheckIns checkIns={store.checkIns} onAnswer={answerCheckIn} disabled={preview} />
          </div>
        ) : null}

        {!hydrated ? (
          <div className="mt-8 space-y-4" aria-hidden>
            <div className="ci-card h-[200px] animate-pulse" />
            <div className="ci-card h-[150px] animate-pulse" />
          </div>
        ) : (
          <>
            {/* ---------------------- first-run: log a period ------------------ */}
            {!hasEntries ? (
              <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_1.05fr]">
                <Card className="ci-rise ci-rise-1">
                  <p className="ci-eyebrow">Start here</p>
                  <h2 className="ci-display mt-2 text-[22px] leading-tight sm:text-[26px]">
                    {intel.brief.headline}
                  </h2>
                  <ul className="ci-bullets mt-3">
                    {intel.brief.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-4 text-[12px] leading-relaxed ci-muted">
                    No forecast is shown until there is a measured interval. Bloom does not present
                    a population average as your pattern.
                  </p>
                  {!preview ? (
                    <Button variant="primary" className="mt-5" onClick={focusForm}>
                      Log your first period
                      <ArrowRight size={14} aria-hidden />
                    </Button>
                  ) : null}
                </Card>

                <div ref={formRef} className="ci-rise ci-rise-2">
                  {logPanel}
                </div>

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
                <div className="mt-6">
                  <IntelTabs
                    active={tab}
                    onChange={setTab}
                    counts={{ insights: intel.insights.length + intel.changes.length }}
                  />
                </div>

                {/* ------------------------------ overview --------------------- */}
                {tab === "overview" ? (
                  <div className="mt-4 space-y-4" role="tabpanel" aria-label="Overview">
                    {expecting ? (
                      <>
                        <CycleOverviewPanel
                          intel={intel}
                          disabled={preview}
                          onLogPeriod={() => {
                            setEditing(null);
                            setPendingStart(today);
                            focusForm();
                          }}
                          onLogSymptoms={() => focusDayLog(today)}
                        />
                        <CycleBriefPanel intel={intel} />
                        <Reveal delay={90}>
                          <TipsCard analysis={analysis} dayAnalysis={store.dayAnalysis} />
                        </Reveal>
                      </>
                    ) : (
                      <Card data-testid="cycle-paused-note">
                        <p className="ci-eyebrow">Predictions paused</p>
                        <h2 className="ci-display mt-2 text-[19px] leading-tight sm:text-[22px]">
                          Nothing is due, nothing is late.
                        </h2>
                        <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed ci-soft">
                          Your {analysis.entryCount} logged{" "}
                          {analysis.entryCount === 1 ? "period is" : "periods are"} kept below, and
                          the daily log still works — log bleeding or symptoms any day. When periods
                          come back, say so above and the phases, dates and fertile window return
                          from your own record.
                        </p>
                      </Card>
                    )}

                    <PersonalPatternPanel intel={intel} />

                    <div ref={formRef}>
                      <Reveal>{logPanel}</Reveal>
                    </div>

                    <ModelNote intel={intel} />
                  </div>
                ) : null}

                {/* ------------------------------ calendar --------------------- */}
                {tab === "calendar" ? (
                  <div className="mt-4 space-y-4" role="tabpanel" aria-label="Calendar">
                    {expecting ? (
                      <Card>
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div>
                            <p className="ci-eyebrow">This cycle</p>
                            <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                              {analysis.overdue
                                ? `Day ${analysis.cycleDay} · ${analysis.overdueDays} past your usual cycle`
                                : `Day ${analysis.cycleDay} of about ${Math.round(analysis.averageLength)}`}
                            </h2>
                            <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
                              {analysis.phaseLabel}
                              {analysis.lastStart
                                ? ` · started ${formatDate(analysis.lastStart)}`
                                : null}
                            </p>
                          </div>
                          {analysis.overdue && !preview ? (
                            <Button
                              variant="primary"
                              onClick={() => {
                                setEditing(null);
                                setPendingStart(today);
                                focusForm();
                              }}
                            >
                              Log a period start
                            </Button>
                          ) : null}
                        </div>
                        <div className="mt-5 grid items-center gap-6 lg:grid-cols-[minmax(230px,300px)_1fr]">
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
                    ) : null}

                    <Card>
                      <p className="ci-eyebrow">Rhythm map</p>
                      <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                        Twelve weeks, one cell per day
                      </h2>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
                        Each square is a day, coloured by the phase it fell in. Brighter squares
                        carry more logged detail; the outlined square is today.
                      </p>
                      <div className="mt-4">
                        <CycleHeatmap
                          days={store.days}
                          analysis={analysis}
                          onSelectDay={preview ? undefined : focusDayLog}
                        />
                      </div>
                    </Card>

                    {expecting ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Card>
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
                        </Card>
                        <Card>
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
                        </Card>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                                {/* ------------------------------ insights --------------------- */}
                {tab === "insights" ? (
                  <div className="mt-4 space-y-4" role="tabpanel" aria-label="Insights">
                    {/* 1 — the personal observations come first, and stay open. */}
                    <Card>
                      <p className="ci-eyebrow">Cycle intelligence</p>
                      <h2 className="ci-display mt-1.5 text-[22px] leading-tight sm:text-[26px]">
                        Bloom understands your pattern.
                      </h2>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
                        Only what your own records support — each line carries the count behind it.
                      </p>
                      <div className="mt-4">
                        <InsightList insights={intel.insights} />
                      </div>
                    </Card>

                    {/* 2 — symptom patterns: the shape first, the phase table one tap away. */}
                    <Card>
                      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
                        {/* Centred against the taller pattern list: the bloom used
                            to sit at the top and leave a band of empty card below it. */}
                        <div className="lg:self-center">
                          <SymptomBloom
                            tally={store.dayAnalysis.symptoms}
                            total={store.dayAnalysis.total}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="ci-eyebrow">Symptom patterns</p>
                          <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                            What shows up, and how often
                          </h2>
                          <p className="mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed ci-soft">
                            Counted from the days you logged. A symptom only appears once you have
                            recorded it — nothing here is suggested from a general list.
                          </p>
                          {intel.symptoms.patterns.length > 0 ? (
                            <ul className="mt-3.5 space-y-2.5">
                              {intel.symptoms.patterns.slice(0, 5).map((pattern) => (
                                <li key={pattern.symptom} className="min-w-0">
                                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                    <span className="text-[12.5px] font-medium capitalize">
                                      {pattern.symptom}
                                    </span>
                                    <span className="text-[11px] ci-muted">
                                      {pattern.cyclesSeen} of {pattern.totalCycles} cycles
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11.5px] leading-relaxed ci-muted">
                                    {pattern.daysLogged}{" "}
                                    {pattern.daysLogged === 1 ? "day" : "days"} logged
                                    {pattern.dominantPhase
                                      ? ` · mostly ${PHASE_LABEL[pattern.dominantPhase]}`
                                      : ""}
                                    {pattern.medianCycleDay !== null
                                      ? ` · around day ${pattern.medianCycleDay}`
                                      : ""}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-[12px] leading-relaxed ci-muted">
                              No recurring symptom yet — one needs to turn up on several days before
                              it means anything.
                            </p>
                          )}
                          <Details summary="Symptom by phase">
                            <SymptomPhaseGrid rows={store.dayAnalysis.symptomPhase} />
                          </Details>
                        </div>
                      </div>
                    </Card>

                    {/* 3 — meaningful historical changes. */}
                    <WhatChangedPanel intel={intel} />

                    {/* 4 — cycle comparisons. */}
                    <CycleComparisonPanel intel={intel} />

                    {/* Everything below is depth: kept, folded, one tap away. */}
                    <CollapsibleSection
                      eyebrow="The numbers"
                      title="Cycle lengths, totals and flow mix"
                      summary="Open the charts and totals"
                    >
                      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium">Your rhythm over time</p>
                          <p className="mt-1 max-w-[52ch] text-[11.5px] leading-relaxed ci-muted">
                            Each bar is one cycle. Dashed bars are outside the typical length used
                            for the median — kept on the chart, not deleted.
                          </p>
                          <div className="mt-3">
                            <RhythmChart analysis={analysis} />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <StatsStrip analysis={analysis} />
                          <div className="mt-5 border-t pt-4 ci-hair">
                            <p className="ci-eyebrow">Flow mix</p>
                            <div className="mt-3">
                              <FlowBreakdown analysis={analysis} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleSection>

                    <CollapsibleSection
                      eyebrow="Averages"
                      title="Energy, mood, sleep and pain by phase"
                      summary="Open the phase averages"
                    >
                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium">Across every logged day</p>
                          <div className="mt-4">
                            <VitalDials dayAnalysis={store.dayAnalysis} />
                          </div>
                        </div>
                        <div className="min-w-0 space-y-3">
                          <p className="text-[12.5px] font-medium">By estimated phase</p>
                          {intel.symptoms.metrics.map((metric) => (
                            <div key={metric.metric}>
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="text-[12.5px] font-medium">{metric.label}</p>
                                <span className="text-[11px] ci-muted">
                                  {metric.n} {metric.n === 1 ? "log" : "logs"}
                                </span>
                              </div>
                              <div className="ci-phasebars">
                                {metric.byPhase.map((phase) => (
                                  <div key={phase.phase} className="ci-phasebars__row">
                                    <span className="ci-phasebars__label">{phase.phase}</span>
                                    <span className="ci-phasebars__track">
                                      <span
                                        className="ci-phasebars__fill"
                                        style={{
                                          width: `${phase.average !== null ? Math.round((phase.average / 5) * 100) : 0}%`,
                                        }}
                                      />
                                    </span>
                                    <span className="ci-phasebars__value">
                                      {phase.average !== null ? phase.average.toFixed(1) : "—"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {intel.symptoms.metrics.every((m) => !m.meaningful) ? (
                            <p className="text-[11.5px] leading-relaxed ci-muted">
                              Phase averages appear once a phase has at least three logged values.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </CollapsibleSection>

                    <Collapse
                      title="Notes triggered by your record"
                      hint="Each note is tied to something specific and disappears when it stops being true."
                    >
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
                    </Collapse>

                    <Collapse
                      title="Day-by-day records"
                      hint="Every logged day, with its flow, symptoms and readings."
                    >
                      <DayLogInsights
                        days={store.days}
                        dayAnalysis={store.dayAnalysis}
                        onEditDate={preview ? undefined : focusDayLog}
                        onDeleteDate={preview ? undefined : store.removeDay}
                        disabled={preview}
                      />
                    </Collapse>
                  </div>
                ) : null}

{/* ------------------------------ history ----------------------- */}
                {tab === "history" ? (
                  <div className="mt-4 space-y-4" role="tabpanel" aria-label="History">
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
                      onImport={preview ? undefined : () => setImportOpen(true)}
                      storedOn={
                        store.sync.signedIn && !store.sync.periodsOnDevice ? "account" : "device"
                      }
                    />
                    <ModelNote intel={intel} />
                  </div>
                ) : null}
              </>
            )}

            {/* ------------------------------ footer ---------------------------- */}
            <footer className="ci-rise mt-8 border-t pt-5 ci-hair">
              <Disclaimer className="max-w-[76ch]" />
            </footer>
          </>
        )}
      </div>
      {!preview ? (
        <>
          <UndoToast undoable={store.undoable} onUndo={store.undo} onDismiss={store.dismissUndo} />
          <ImportPeriods
            open={importOpen}
            onClose={() => setImportOpen(false)}
            logs={logs}
            today={today}
            onAdd={store.add}
          />
        </>
      ) : null}
    </div>
  );
}

/** A time-of-day hello — small, but it makes the page feel addressed to you. */
/* The shared, rotating hello — see src/lib/voice. */
void CountUp;
function greeting(): string {
  return greetingFor(new Date().getHours());
}
