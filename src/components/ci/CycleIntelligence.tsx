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
import { PredictionsCard } from "./PredictionsCard";
import { InsightsPanel } from "./InsightsPanel";
import { TipsCard } from "./TipsCard";
import { EntryForm } from "./EntryForm";
import { HistoryTable } from "./HistoryTable";
import { Button, Card, Disclaimer } from "./primitives";
import { usePeriodLog } from "@/hooks/usePeriodLog";
import { logsToCsv } from "@/lib/cycle/periodStore";
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
  const formRef = useRef<HTMLDivElement>(null);
  const hasEntries = analysis.entryCount > 0;

  const focusForm = useCallback(() => {
    formRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    window.setTimeout(() => {
      formRef.current?.querySelector<HTMLInputElement>("input[type='date']")?.focus();
    }, 220);
  }, []);

  /* when an edit is cancelled from anywhere, drop the draft */
  useEffect(() => {
    if (editing && !logs.some((l) => l.id === editing.id)) setEditing(null);
  }, [logs, editing]);

  const submit = useCallback(
    (draft: LogDraft) => {
      const result = editing ? store.update(editing.id, draft) : store.add(draft);
      if (result.ok && editing) setEditing(null);
      return result;
    },
    [editing, store],
  );

  const exportCsv = useCallback(() => {
    if (logs.length === 0) return;
    const blob = new Blob([logsToCsv(logs)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bloom-cycle-entries.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  return (
    <div className="ci ci-root" data-theme={theme}>
      <div className="ci-veil" aria-hidden />
      <div className="ci-shell">
        {/* ------------------------------- header ------------------------------ */}
        <header className="ci-rise max-w-[68ch]">
          <p className="ci-eyebrow">Bloom · Cycle Intelligence</p>
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
                    Add the first day of your most recent period. With a single entry you'll get a
                    generic 28-day placeholder — clearly labelled as a placeholder. Log a second
                    period and the page switches to your own pattern, then keeps getting steadier
                    with every cycle after that.
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
                  <EntryForm logs={logs} today={today} disabled={preview} onSubmit={submit} />
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
                {/* ------------------------- phase overview --------------------- */}
                <Card className="ci-rise ci-rise-1 mt-8">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="ci-eyebrow">Phase overview</p>
                      <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">
                        You're on day {analysis.cycleDay} of about{" "}
                        {Math.round(analysis.averageLength)}
                      </h2>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed ci-soft">
                        Estimated phase:{" "}
                        <span
                          style={{ color: `var(--ci-${analysis.phase ?? "follicular"})` }}
                          className="font-medium"
                        >
                          {analysis.phaseLabel}
                        </span>
                        {analysis.lastStart
                          ? ` · last period started ${formatDate(analysis.lastStart)}`
                          : null}
                      </p>
                    </div>
                    <p className="max-w-[34ch] text-[11.5px] leading-relaxed ci-muted">
                      An estimate, not a fact: the map assumes your next period lands on the
                      predicted date. Log a new start and it redraws immediately.
                    </p>
                  </div>
                  <div className="mt-4">
                    <PhaseWave analysis={analysis} />
                  </div>
                </Card>

                {/* ----------------- predictions · insights · tips -------------- */}
                <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                  <div className="ci-rise ci-rise-2">
                    <PredictionsCard analysis={analysis} />
                  </div>
                  <div className="ci-rise ci-rise-3">
                    <TipsCard analysis={analysis} />
                  </div>
                </div>

                <div className="ci-rise ci-rise-4 mt-4">
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
                </div>

                {/* ------------------------------ form -------------------------- */}
                <div ref={formRef} className="ci-rise mt-4">
                  <EntryForm
                    logs={logs}
                    today={today}
                    editing={editing}
                    pendingStart={pendingStart}
                    onPendingConsumed={() => setPendingStart(null)}
                    disabled={preview}
                    onSubmit={submit}
                    onCancelEdit={() => setEditing(null)}
                  />
                </div>

                {/* ---------------------------- history ------------------------- */}
                <div className="ci-rise mt-4">
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
                      setEditing(null);
                    }}
                    onExport={exportCsv}
                  />
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
