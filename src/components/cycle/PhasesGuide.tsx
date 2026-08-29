/**
 * Cycle Phases — the educational strip. Textbook-general on purpose: what
 * each phase usually means, ranges only when personal data can back them,
 * expandable deeper notes, and an honest "your mileage varies" line.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CycleModel, PhaseKey } from "@/lib/cycle/types";
import { PHASE_COLOR } from "@/lib/cycle/palette";

const PHASE_INFO: Record<
  PhaseKey,
  { blurb: string; deeper: string; art: "waves" | "rise" | "peak" | "tide" }
> = {
  menstrual: {
    blurb: "Bleeding days. Many people feel inward — rest isn't slacking, it's the phase.",
    deeper:
      "Iron needs and sleep pressure both tick up for some people here. Warmth, easier training, lower-key plans — general tendencies from textbooks, not instructions for you.",
    art: "waves",
  },
  follicular: {
    blurb: "The build-up. Estrogen climbs and the body is recruiting this cycle's lead follicle.",
    deeper:
      "Energy and verbal fluency often (not always) drift upward as the week goes. It's the phase most people find easiest for demanding work — until their own data says otherwise.",
    art: "rise",
  },
  ovulation: {
    blurb: "The brief peak. Usually a day or two around mid-cycle, when an egg is released.",
    deeper:
      "Cervical fluid, LH surges and a small temperature shift are the observable signs — a calendar 'prediction' of this day is the least precise estimate on the whole page.",
    art: "peak",
  },
  luteal: {
    blurb: "The long wait. Progesterone runs the show; PMS, if it comes, lives at the end of this.",
    deeper:
      "Metabolic rate rises slightly and mood can ebb for some people in the late week. The second half of your cycle is the most variable stretch for nearly everyone.",
    art: "tide",
  },
};

const ART: Record<string, React.ReactNode> = {
  waves: (
    <path
      d="M4 26c4-7 8-7 12 0s8 7 12 0 8-7 12 0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ),
  rise: (
    <path
      d="M4 30C10 30 12 10 20 8c6-1.4 8 6 18 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  ),
  peak: (
    <>
      <path
        d="M4 30c6 0 10-18 16-18s10 18 16 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="20" cy="10.5" r="3" fill="currentColor" />
    </>
  ),
  tide: (
    <>
      <path
        d="M4 14c8 0 10 12 16 12s8-12 16-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 26c8 0 10 6 16 6s8-6 16-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </>
  ),
};

export function PhasesGuide({
  model,
  selectedPhase,
  onSelectPhase,
}: {
  model: CycleModel;
  selectedPhase?: PhaseKey | null;
  onSelectPhase?: (p: PhaseKey | null) => void;
}) {
  const personal = model.average !== null;
  const flowLen = Math.max(2, Math.round(model.periodLengthAverage ?? 4));
  const ovu = model.ovulationDay ?? 14;
  const total = Math.round(model.average ?? 28);

  const ranges: Record<PhaseKey, string> = {
    menstrual: `bleeding estimate days 1–${flowLen}`,
    follicular: `reproductive days 1–${ovu - 2}`,
    ovulation: `around day ${ovu}`,
    luteal: `day ${ovu + 2}–${personal ? total : 28}`,
  };

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col">
      {(Object.keys(PHASE_INFO) as PhaseKey[]).map((p) => (
        <PhaseCard
          key={p}
          phase={p}
          range={ranges[p]}
          personal={personal && p !== "ovulation"}
          current={model.currentPhase === p || model.currentReproductivePhase === p}
          focused={selectedPhase === p}
          onFocus={() => {
            onSelectPhase?.(selectedPhase === p ? null : p);
            document
              .getElementById("cycle-orbit")
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />
      ))}
      <p className="mt-4 max-w-[64ch] text-[11.5px] leading-relaxed text-faint">
        Bleeding and reproductive phase are separate layers: follicular starts on cycle day 1 and
        can overlap menstruation. Every body writes its own calendar — these are textbook outlines,
        and yours is the data on this page.
        {personal
          ? " The ranges above are drawn from your logged cycles."
          : " Typical ranges shown are general until your history accumulates."}
      </p>
    </div>
  );
}

function PhaseCard({
  phase,
  range,
  personal,
  current,
  focused,
  onFocus,
}: {
  phase: PhaseKey;
  range: string;
  personal: boolean;
  current: boolean;
  focused: boolean;
  onFocus: () => void;
}) {
  const [open, setOpen] = useState(false);
  const info = PHASE_INFO[phase];
  const color = PHASE_COLOR[phase];
  return (
    <article
      className={cn("cy-phase", current && "cy-phase--active")}
      style={{ "--phase-c": color } as React.CSSProperties}
    >
      <svg
        viewBox="0 0 40 36"
        className="mt-1 h-9 w-10 shrink-0 opacity-70"
        style={{ color }}
        aria-hidden
      >
        {ART[info.art]}
      </svg>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <button
            type="button"
            onClick={onFocus}
            aria-pressed={focused}
            className="group/focus flex w-fit items-center gap-1.5 rounded-full text-left"
            title={
              focused
                ? "Release the focus on the cycle orbit"
                : "Focus this phase on the cycle orbit"
            }
          >
            <span
              className="mono flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em]"
              style={{ color }}
            >
              <span
                className="inline-block size-1.5 rounded-full"
                style={{ background: color }}
                aria-hidden
              />
              {phase}
            </span>
            <span
              className="mono text-[8.5px] uppercase tracking-[0.08em] text-faint opacity-0 transition-opacity group-hover/focus:opacity-100 group-aria-pressed/focus:opacity-100"
              aria-hidden
            >
              focus on the ring →
            </span>
          </button>
          {current ? (
            <span className="mono rounded-full border border-border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">
              you are here
            </span>
          ) : null}
        </div>
        <h3 className="display mt-1 text-[15px] leading-tight capitalize">
          {phase} phase · <span className="text-muted-foreground">{range}</span>
        </h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{info.blurb}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mono inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-faint transition-colors hover:text-foreground"
          >
            {open ? "less" : "deeper note"}{" "}
            <ChevronDown
              className={cn(
                "size-3 transition-transform duration-[var(--motion-med)]",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          <span className="mono text-[9px] uppercase tracking-[0.07em] text-faint">
            {personal ? "from your cycles" : "general range"}
          </span>
        </div>
        {open ? (
          <p className="mt-2 border-t border-[var(--cycle-hair)] pt-2 text-[11.5px] leading-relaxed text-muted-foreground">
            {info.deeper}
          </p>
        ) : null}
      </div>
    </article>
  );
}
