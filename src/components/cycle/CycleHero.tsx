/**
 * CycleHero v2 — the asymmetric stage. The orbit sits left of center as a
 * physical object under one soft light; the serif statement floats upper
 * right, deliberately offset; the today tray docks beneath the statement so
 * logging is adjacent to the information it changes. The empty first-run
 * state is the same composition with a warm invitation instead of a void:
 * "Your cycle starts here" + one calm primary action. Nothing is centered
 * for decoration; the offset is the point — this page is about movement.
 */

import { CalendarPlus, PencilLine } from "lucide-react";

import type { CycleEntry, CycleModel, PhaseKey } from "@/lib/cycle/types";
import { CycleOrbit, segmentsFor } from "./CycleOrbit";
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
  onStartNewCycle,
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
  onStartNewCycle: () => void;
  onOpenMethod: () => void;
  onTrayReady?: React.Ref<HTMLButtonElement>;
  selectedPhase: PhaseKey | null;
  onSelectPhase: (p: PhaseKey | null) => void;
}) {
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
              onStartNewCycle={onStartNewCycle}
            />
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <button type="button" onClick={onStartNewCycle} className="cy-link">
                <CalendarPlus className="mr-1 inline size-3 align-[-1.5px]" aria-hidden />
                start new cycle
              </button>
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
        {model?.currentPhase ? (
          <>
            <h1
              className="cy-statement"
              style={{
                color: `var(--cycle-${model.currentPhase === "ovulation" ? "ovulation" : model.currentPhase})`,
              }}
            >
              {momentHead(model)}
            </h1>
            <p className="cy-statement__support">
              Day <b>{model.currentDay}</b> · of your{" "}
              {model.confidence === "assumed" ? "general " : "estimated "}
              {Math.round(model.average ?? 28)}-day cycle
              <span className="mx-2 text-[var(--cycle-hair-strong)]" aria-hidden>
                |
              </span>
              {model.confidence === "assumed" ? (
                "general pattern — nothing personal yet"
              ) : (
                <>
                  based on <b>{model.completed.length}</b> completed cycle
                  {model.completed.length === 1 ? "" : "s"}
                </>
              )}
            </p>
            <p className="mt-2.5 max-w-[46ch] text-[14px] leading-relaxed text-muted-foreground">
              {phaseLine(model.currentPhase)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <a href="#cycle-road" className="cy-btn cy-btn--quiet no-underline">
                What comes next ↓
              </a>
              <button type="button" onClick={onOpenMethod} className="cy-link">
                How predictions work
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
              <button type="button" onClick={onStartNewCycle} className="cy-btn cy-btn--primary">
                <CalendarPlus className="mr-1.5 inline size-3.5 align-[-2px]" aria-hidden />
                Start new cycle
              </button>
              <button type="button" onClick={onOpenFull} className="cy-btn cy-btn--quiet">
                Log a day instead
              </button>
              <button type="button" onClick={onOpenMethod} className="cy-link">
                How predictions work →
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
    </header>
  );
}

function phaseLine(phase: CycleModel["currentPhase"]): string {
  switch (phase) {
    case "menstrual":
      return "Bleeding days. Rest here isn't slacking — log what the days are actually like and Bloom learns your version of them.";
    case "follicular":
      return "The build-up toward ovulation. Good days to log the small stuff — energy, sleep, what shows up when it shows up.";
    case "ovulation":
      return "The brief fertile peak — an estimate-shaped window. Your own signs (tests, temperature, mucus) are what firm it up.";
    case "luteal":
      return "The long wait after ovulation — the most variable stretch for nearly everyone. Your logs are what make it personal.";
    default:
      return "Log a period day and this page becomes yours — phases, windows, patterns, all computed from your record.";
  }
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The headline reflects where the day actually sits inside the phase —
 * derived from the same model that draws the orbit, never a canned string.
 * "Late luteal" when the estimate is close, "Period day 3" while bleeding.
 */
function momentHead(model: CycleModel): string {
  const phase = model.currentPhase;
  const day = model.currentDay ?? 0;
  if (!phase) return "Awaiting your first log";
  if (phase === "ovulation") return "Ovulation window";
  const seg = segmentsFor(model).find((x) => x.phase === phase);
  const span = seg ? Math.max(1, seg.to - seg.from + 1) : 1;
  const rel = seg ? (day - seg.from) / span : 0;
  if (phase === "menstrual") return `Period day ${Math.max(1, Math.min(day, Math.round(span)))}`;
  const next = model.events.find((e) => e.id === "next-period");
  if (phase === "luteal") {
    if (next && next.daysAway >= 0 && next.daysAway <= 3) return "Late luteal";
    return rel <= 0.34 ? "Early luteal" : "Luteal phase";
  }
  return rel >= 0.67 ? "Late follicular" : rel <= 0.34 ? "Early follicular" : "Follicular phase";
}
