/**
 * CycleHero v2 — the asymmetric stage. The orbit sits left of center as a
 * physical object under one soft light; the serif statement floats upper
 * right, deliberately offset; the today tray docks beneath the statement so
 * logging is adjacent to the information it changes. The empty first-run
 * state is the same composition with a warm invitation instead of a void:
 * "Your cycle starts here" + one calm primary action. Nothing is centered
 * for decoration; the offset is the point — this page is about movement.
 */

import { useState } from "react";
import { CalendarClock, MessageSquareWarning, PencilLine, RotateCcw } from "lucide-react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { currentCycleCopy } from "@/lib/cycle/presentation";
import type { CycleEntry, CycleModel, PhaseKey } from "@/lib/cycle/types";
import { CycleOrbit } from "./CycleOrbit";
import { TodaySurface, type TodayPatch } from "./TodaySurface";

export function CycleHero({
  model,
  entries,
  loading,
  logDate,
  logEntry,
  inspect,
  onReturnToday,
  onPatch,
  onOpenFull,
  onAdjust,
  onOpenMethod,
  onTrayReady,
  selectedPhase,
  onSelectPhase,
}: {
  model: CycleModel | null;
  entries: CycleEntry[];
  loading: boolean;
  logDate: string;
  logEntry: CycleEntry | null;
  inspect: { day: number; date: string } | null;
  onReturnToday: () => void;
  onPatch: (patch: TodayPatch) => Promise<void>;
  onOpenFull: () => void;
  onAdjust: () => void;
  onOpenMethod: () => void;
  onTrayReady?: React.Ref<HTMLButtonElement>;
  selectedPhase: PhaseKey | null;
  onSelectPhase: (p: PhaseKey | null) => void;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const copy = model ? currentCycleCopy(model) : null;

  return (
    <header className="cy-hero">
      <div className="cy-hero__orbit" id="cycle-orbit">
        {model ? (
          <>
            <CycleOrbit
              model={model}
              entries={entries}
              inspect={inspect}
              selectedPhase={selectedPhase}
              onSelectPhase={onSelectPhase}
            />
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <button type="button" onClick={onAdjust} className="cy-link">
                <PencilLine className="mr-1 inline size-3 align-[-1.5px]" aria-hidden />
                edit cycle length
              </button>
              {inspect ? (
                <button type="button" onClick={onReturnToday} className="cy-link">
                  ← back to today
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div
            className="animate-pulse rounded-full border border-[var(--cycle-hair)]"
            style={{ width: "min(78vw, 460px)", aspectRatio: "1.19", background: "var(--cy-fill)" }}
            role="status"
            aria-label={loading ? "Reading your cycle record" : "Cycle orbit"}
          />
        )}
      </div>

      <div className="cy-hero__statement min-w-0">
        {model?.currentDay ? (
          <>
            <h1
              className="cy-statement"
              style={{
                color: copy?.tonePhase
                  ? `var(--cycle-${copy.tonePhase === "ovulation" ? "ovulation" : copy.tonePhase})`
                  : "var(--foreground)",
              }}
            >
              {copy?.headline}
            </h1>
            <p className="cy-statement__support">
              {copy?.support}
              <span className="mx-2 text-[var(--cycle-hair-strong)]" aria-hidden>
                |
              </span>
              Day <b>{model.currentDay}</b> of your cycle
            </p>
            <p className="mt-2.5 max-w-[46ch] text-[14px] leading-relaxed text-muted-foreground">
              {copy?.secondary}
            </p>
            {model.currentBleedingState !== "unlogged" &&
            model.currentBleedingState !== "none" &&
            model.currentReproductivePhase === "follicular" ? (
              <details className="mt-2 max-w-[46ch] text-[12px] leading-relaxed text-faint">
                <summary className="cy-link inline cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  Why follicular?
                </summary>
                <p className="mt-1.5">
                  Your period describes bleeding. The follicular phase describes a stage of your
                  reproductive cycle. They begin at the same time, so your period can happen during
                  early follicular phase.
                </p>
              </details>
            ) : null}
            <p className="mt-2 max-w-[46ch] text-[12px] leading-relaxed text-faint">
              {model.confidence === "assumed" ? (
                "Bloom is still learning your personal pattern."
              ) : (
                <>
                  Based on <b>{model.completed.length}</b> completed cycle
                  {model.completed.length === 1 ? "" : "s"}. Your recorded days always take priority
                  over estimates.
                </>
              )}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <a href="#cycle-road" className="cy-btn cy-btn--quiet no-underline">
                What comes next ↓
              </a>
              <button type="button" onClick={onOpenMethod} className="cy-link">
                How predictions work
              </button>
              <button type="button" onClick={() => setFeedbackOpen(true)} className="cy-link">
                Did Bloom get it wrong?
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="cy-statement">
              Your cycle
              <br />
              <span style={{ fontStyle: "italic", color: "var(--muted-foreground)" }}>
                starts here.
              </span>
            </h1>
            <p className="cy-statement__support max-w-[44ch]">
              One starting point is enough. Bloom will build from what you actually record — nothing
              invented to fill the page.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={onOpenFull} className="cy-btn cy-btn--primary">
                Log your period
              </button>
              <button type="button" onClick={onOpenMethod} className="cy-link">
                How predictions work →
              </button>
              <button type="button" onClick={() => setFeedbackOpen(true)} className="cy-link">
                Did Bloom get it wrong?
              </button>
            </div>
          </>
        )}
      </div>

      {model ? (
        <TodaySurface
          model={model}
          date={logDate}
          entry={logEntry}
          disabled={loading}
          onPatch={onPatch}
          onOpenFull={onOpenFull}
        />
      ) : null}

      <PredictionFeedbackDialog
        open={feedbackOpen}
        model={model}
        onClose={() => setFeedbackOpen(false)}
        onAdjust={() => {
          setFeedbackOpen(false);
          onAdjust();
        }}
        onOpenFull={() => {
          setFeedbackOpen(false);
          onOpenFull();
        }}
        onOpenMethod={() => {
          setFeedbackOpen(false);
          onOpenMethod();
        }}
      />
    </header>
  );
}

function PredictionFeedbackDialog({
  open,
  model,
  onClose,
  onAdjust,
  onOpenFull,
  onOpenMethod,
}: {
  open: boolean;
  model: CycleModel | null;
  onClose: () => void;
  onAdjust: () => void;
  onOpenFull: () => void;
  onOpenMethod: () => void;
}) {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const saveFeedback = () => {
    const item = {
      at: new Date().toISOString(),
      currentDay: model?.currentDay ?? null,
      currentPhase: model?.currentPhase ?? null,
      currentBleedingState: model?.currentBleedingState ?? null,
      currentReproductivePhase: model?.currentReproductivePhase ?? null,
      cycleLength: model?.average ?? null,
      note: note.trim(),
    };
    try {
      const key = "bloom_cycle_prediction_feedback";
      const existing = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown[];
      window.localStorage.setItem(key, JSON.stringify([item, ...existing].slice(0, 20)));
    } catch {
      // Feedback is a convenience only; the correction actions still work without storage.
    }
    setSaved(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="top-1/2 left-1/2 w-[calc(100%-1.25rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border-border bg-background p-0 shadow-2xl">
        <div className="border-b border-border/70 px-5 py-4">
          <p className="cy-eyebrow">prediction feedback</p>
          <DialogTitle className="display mt-1 text-[19px] leading-tight">
            Did Bloom make a mistake?
          </DialogTitle>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">
            Tell Bloom what feels off, or jump straight to the fix. Your corrections update the
            circle immediately.
          </p>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          <button type="button" onClick={onAdjust} className="cy-fix-option">
            <CalendarClock className="size-4" aria-hidden />
            <span>
              <b>Period date or cycle length is wrong</b>
              <small>Change the start date or working length.</small>
            </span>
          </button>
          <button type="button" onClick={onOpenFull} className="cy-fix-option">
            <RotateCcw className="size-4" aria-hidden />
            <span>
              <b>Today’s details are wrong</b>
              <small>Edit flow, mood, pain, symptoms or notes.</small>
            </span>
          </button>
          <button type="button" onClick={onOpenMethod} className="cy-fix-option">
            <MessageSquareWarning className="size-4" aria-hidden />
            <span>
              <b>I want to understand the prediction</b>
              <small>See what Bloom is using and what is only an estimate.</small>
            </span>
          </button>

          <label className="mt-1 flex flex-col gap-1.5">
            <span className="cy-eyebrow">quick note</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
              placeholder="Example: my period actually started yesterday, or this phase feels off."
              className="w-full resize-none rounded-xl border border-border bg-surface/60 px-3 py-2 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-faint/60 focus:border-border-strong focus:bg-surface-2/60"
            />
          </label>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-faint">
              {saved ? "Saved on this device." : "Private note — kept on this device for now."}
            </p>
            <button
              type="button"
              onClick={saveFeedback}
              disabled={note.trim().length === 0}
              className="cy-btn cy-btn--quiet disabled:opacity-40"
            >
              Save note
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
