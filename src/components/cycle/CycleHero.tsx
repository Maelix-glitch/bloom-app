/**
 * CycleHero — the first viewport rebuilt around one truth: the current cycle
 * state is the story. Two-part composition: the wheel as the dominant
 * anchor, and beside it a tight editorial status block, the up-next
 * intelligence hierarchy, and the inline quick-log strip. On narrow screens
 * the wheel leads, everything stacks beneath it — never a centered empty
 * marketing hero with a ring floating off to the side.
 */

import { CalendarDays, PencilLine } from "lucide-react";

import type { CycleEntry, CycleModel, FlowValue, MoodValue } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";
import { CycleWheel } from "./CycleWheel";
import { UpcomingIntelligence } from "./UpcomingIntelligence";
import { QuickLogStrip } from "./QuickLogStrip";

export function CycleHero({
  model,
  loading,
  todayEntry,
  onQuickLog,
  onStripSave,
  onOpenAdvanced,
  onAdjust,
  onViewAll,
  onOpenMethod,
}: {
  model: CycleModel | null;
  loading: boolean;
  todayEntry: CycleEntry | null;
  onQuickLog: () => void;
  onStripSave: (patch: {
    flow?: FlowValue | null;
    mood?: MoodValue | null;
    energy?: number | null;
  }) => void;
  onOpenAdvanced: () => void;
  onAdjust: () => void;
  onViewAll: () => void;
  onOpenMethod: () => void;
}) {
  const headline = model?.currentDay
    ? `Day ${model.currentDay} of ${Math.round(model.average ?? 28)}`
    : "Your cycle, quietly kept";
  const phaseLine = model?.currentPhase
    ? model.currentPhase === "ovulation"
      ? "Estimated fertile peak"
      : `${cap(model.currentPhase)} phase`
    : "Awaiting your first log";
  const contextLine = model?.lastPeriodStart
    ? model.usesDefaultAssumption
      ? `Last period started ${fmtShort(model.lastPeriodStart)}. Until a couple of cycles accumulate, estimates follow a general pattern — then they become yours.`
      : `Last period started ${fmtShort(model.lastPeriodStart)} — estimates follow your own ${Math.min(6, model.completed.length)}-cycle average of ${model.average?.toFixed(1)} days.`
    : "Log the day a period starts and this whole page wakes up — phases, windows, patterns. Nothing is ever invented.";

  return (
    <header className="cy-hero relative pt-3 pb-1 lg:pt-6">
      {/* wheel column */}
      <div className="cy-hero__wheel">
        {model ? (
          <>
            <CycleWheel model={model} />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onAdjust}
                className="mono rounded-full border border-border px-3 py-1 text-[9px] uppercase tracking-[0.08em] text-faint transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
              >
                <PencilLine className="mr-1 inline size-2.5 align-[-1px]" aria-hidden />
                adjust cycle
              </button>
              <span className="mono text-[9px] uppercase tracking-[0.08em] text-faint">
                {model.lastPeriodStart
                  ? model.confidence === "assumed"
                    ? "general pattern"
                    : "personal model"
                  : "no anchor yet"}
              </span>
            </div>
          </>
        ) : (
          <div
            className="cy-wheel animate-pulse rounded-full border border-[var(--cycle-hair)]"
            style={{ background: "color-mix(in oklab, var(--surface) 45%, transparent)" }}
            role="status"
            aria-label={loading ? "Reading your cycle record" : "Cycle wheel"}
          />
        )}
      </div>

      {/* status + intelligence column */}
      <div className="cy-hero__head">
        <p className="cy-eyebrow flex flex-wrap items-center gap-x-2.5 gap-y-1">
          Cycle · live model
          {model ? (
            <span
              className="mono rounded-full border px-2 py-[3px] text-[8.5px] normal-case tracking-[0.04em] text-muted-foreground"
              style={{
                borderColor: "color-mix(in oklab, var(--border-strong) 70%, transparent)",
              }}
            >
              {model.lastPeriodStart && model.confidence !== "assumed"
                ? "estimated from your logs"
                : model.lastPeriodStart
                  ? "estimated · general pattern"
                  : "nothing logged yet"}
            </span>
          ) : null}
        </p>
        <h1 className="cy-title mt-2.5 text-[34px] leading-[1.06] tracking-[-0.024em] text-balance sm:text-[42px]">
          {headline}
        </h1>
        <p
          className="cy-title mt-1 text-[19px] leading-snug"
          style={{
            color: model?.currentPhase
              ? `var(--cycle-${model.currentPhase === "ovulation" ? "ovulation" : model.currentPhase})`
              : "var(--faint)",
          }}
        >
          {phaseLine}
        </p>
        <p className="mt-3 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-foreground">
          {contextLine}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={onQuickLog} className="cy-btn cy-btn--primary">
            Log today
          </button>
          <a href="#cycle-calendar" className="cy-btn cy-btn--quiet no-underline">
            <CalendarDays className="size-3.5" aria-hidden />
            Calendar
          </a>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("cycle-history")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="mono text-[10px] uppercase tracking-[0.08em] text-faint underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Your history
          </button>
        </div>

        {model ? (
          <>
            <UpcomingIntelligence
              className="mt-6"
              model={model}
              onOpenMethod={onOpenMethod}
              onViewAll={onViewAll}
              onLogStart={onQuickLog}
            />
            <QuickLogStrip
              model={model}
              entry={todayEntry}
              disabled={loading}
              onSave={onStripSave}
              onOpenAdvanced={onOpenAdvanced}
            />
          </>
        ) : null}
      </div>
    </header>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
