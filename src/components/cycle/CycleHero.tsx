/**
 * CycleHero — the first viewport as one composed scene, not a split of text
 * and donut. The orbit leads; beside it, a single contextual narrative
 * ("your cycle right now") written from the live model: phase, the day in
 * its cycle, what's closest, how much Bloom actually knows — then the
 * today-surface, right where the information it changes lives. Selecting a
 * day elsewhere moves the orbit's focus and the narrative follows. No
 * marketing paragraph, no centered emptiness, no fake warmth.
 */

import type { CycleEntry, CycleModel } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";
import { PHASE_COLOR } from "@/lib/cycle/palette";
import type { PhaseKey } from "@/lib/cycle/types";
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
  onViewForecast,
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
  onViewForecast: () => void;
}) {
  return (
    <header className="cy-hero">
      <div className="relative">
        {model ? (
          <>
            <div className="cy-orbit-wrap">
              <CycleOrbit model={model} entries={entries} inspect={inspect} />
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={onAdjust}
                className="mono rounded-full border border-border px-3 py-1 text-[9px] uppercase tracking-[0.08em] text-faint transition-colors hover:border-[var(--border-strong)] hover:text-foreground"
              >
                adjust cycle
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
            className="cy-orbit-wrap animate-pulse rounded-full border border-[var(--cycle-hair)]"
            style={{ background: "var(--cy-fill)", aspectRatio: "1" }}
            role="status"
            aria-label={loading ? "Reading your cycle record" : "Cycle visualization"}
          />
        )}
      </div>

      <div className="min-w-0">
        <p className="cy-eyebrow">Your cycle right now</p>
        {model?.currentPhase ? (
          <>
            <h1
              className="cy-title mt-2 text-[38px] leading-[1.05] tracking-[-0.025em] text-balance sm:text-[44px]"
              style={{ color: PHASE_COLOR[model.currentPhase as PhaseKey] }}
            >
              {model.currentPhase === "ovulation"
                ? "Ovulation window"
                : `${cap(model.currentPhase)} phase`}
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
              {model.currentDay
                ? `Day ${model.currentDay} of your ${model.confidence === "assumed" ? "general " : "estimated "}${Math.round(model.average ?? 28)}-day cycle`
                : "Counting begins with your first logged period start"}
              {model.currentPhase === "ovulation"
                ? " — the brief, estimate-shaped peak of the cycle. Your own signs (tests, temperature, mucus) are the only things that can firm it up, and you can log those anytime."
                : model.currentPhase === "menstrual"
                  ? " — bleeding days. Rest isn't slacking here; log what the days are actually like and Bloom learns your version."
                  : model.currentPhase === "follicular"
                    ? " — the build-up. Quiet, useful days to log the small stuff: energy, sleep, what shows up when it shows up."
                    : " — the long wait after ovulation. The most variable stretch for nearly everyone; your logs are what make it personal."}
            </p>
            <div className="mt-4 border-t border-[var(--cycle-hair)] pt-3">
              <NarrativeRow model={model} />
            </div>
          </>
        ) : (
          <>
            <h1 className="cy-title mt-2 text-[34px] leading-[1.08] tracking-[-0.022em] text-balance sm:text-[40px]">
              Your first cycle starts here.
            </h1>
            <p className="mt-3 max-w-[50ch] text-[13.5px] leading-relaxed text-muted-foreground">
              Log the day your period begins and Bloom can start building your personal cycle model
              — phases, windows, patterns, all computed from what you actually record. Nothing is
              invented to make the page look busy.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button type="button" onClick={onOpenFull} className="cy-btn cy-btn--primary">
                Log period
              </button>
              <button type="button" onClick={onOpenMethod} className="cy-link">
                How predictions work →
              </button>
            </div>
          </>
        )}

        {model?.currentPhase ? (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href="#cycle-forecast"
              onClick={(e) => {
                e.preventDefault();
                onViewForecast();
              }}
              className="cy-link no-underline hover:underline"
            >
              View forecast →
            </a>
            <span className="text-[10px]" aria-hidden />
            <button type="button" onClick={onOpenMethod} className="cy-link">
              Confidence & method
            </button>
          </div>
        ) : null}

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
      </div>
    </header>
  );
}

/** the contextual mini-narrative — one line each, on hairlines, not cards */
function NarrativeRow({ model }: { model: CycleModel }) {
  const next = model.events.find((e) => e.id === "next-period");
  const lines: { label: string; value: string; tone?: string }[] = [];
  if (next?.date || next?.rangeEnd) {
    lines.push({
      label: "Next period",
      value: `${next.date ? fmtShort(next.date) : `~${fmtShort(next.rangeEnd!)}`}${next.plusMinusDays ? ` · ±${next.plusMinusDays}d` : ""} · ${next.daysAway >= 0 ? `in ~${next.daysAway}d` : "past estimate"}`,
      tone: "var(--cycle-menstrual)",
    });
  }
  lines.push({
    label: "Confidence",
    value:
      model.confidence === "assumed"
        ? "general pattern — nothing personal yet"
        : model.confidence === "early"
          ? "learning — 1 completed cycle so far"
          : model.confidence === "fair"
            ? `building baseline — ${model.completed.length} cycles`
            : `your own history — ${model.completed.length} cycles`,
    tone: "var(--cycle-accent)",
  });
  return (
    <dl className="flex flex-col gap-0">
      {lines.map((l) => (
        <div
          key={l.label}
          className="flex items-baseline gap-3 border-b border-[var(--cycle-hair)] py-1.5 last:border-b-0"
        >
          <dt className="mono w-[104px] shrink-0 text-[9px] uppercase tracking-[0.1em] text-faint">
            {l.label}
          </dt>
          <dd
            className="min-w-0 flex-1 truncate text-[12.5px]"
            style={l.tone ? { color: "var(--muted-foreground)" } : undefined}
          >
            <span
              className="mr-2 inline-block size-[6px] self-center rounded-full align-[1px]"
              style={{ background: l.tone }}
              aria-hidden
            />
            {l.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
