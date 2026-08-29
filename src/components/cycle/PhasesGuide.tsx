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

export function PhasesGuide({ model }: { model: CycleModel }) {
  const personal = model.average !== null;
  const flowLen = Math.max(2, Math.round(model.periodLengthAverage ?? 4));
  const ovu = model.ovulationDay ?? 14;
  const total = Math.round(model.average ?? 28);

  const ranges: Record<PhaseKey, string> = {
    menstrual: `days 1–${flowLen}`,
    follicular: `days ${flowLen + 1}–${ovu - 2}`,
    ovulation: `around day ${ovu}`,
    luteal: `day ${ovu + 2}–${personal ? total : 28}`,
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(PHASE_INFO) as PhaseKey[]).map((p) => (
          <PhaseCard
            key={p}
            phase={p}
            range={ranges[p]}
            personal={personal && p !== "ovulation"}
            current={model.currentPhase === p}
          />
        ))}
      </div>
      <p className="text-center text-[11px] leading-relaxed text-faint">
        Every body writes its own calendar — these are textbook outlines, and yours is the data on
        this page.
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
}: {
  phase: PhaseKey;
  range: string;
  personal: boolean;
  current: boolean;
}) {
  const [open, setOpen] = useState(false);
  const info = PHASE_INFO[phase];
  const color = PHASE_COLOR[phase];
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border px-4 py-3.5 transition-colors",
        current
          ? "border-[color:var(--border-strong)] bg-surface"
          : "border-border/70 bg-surface/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="mono flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em]"
            style={{ color }}
          >
            <span
              className="inline-block size-1.5 rounded-full"
              style={{ background: color }}
              aria-hidden
            />
            {phase}
          </p>
          <h3 className="display mt-1 text-[15px] leading-tight capitalize">
            {phase} phase
            {current ? (
              <span className="mono ml-2 rounded-full border border-border px-1.5 py-0.5 align-middle text-[8px] uppercase tracking-[0.08em] text-faint">
                you are here
              </span>
            ) : null}
          </h3>
        </div>
        <svg
          viewBox="0 0 40 36"
          className="h-9 w-10 shrink-0 opacity-60"
          style={{ color }}
          aria-hidden
        >
          {ART[info.art]}
        </svg>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{info.blurb}</p>
      <p className="mono mt-2 text-[9px] uppercase tracking-[0.07em] text-faint">
        {range} · {personal ? "from your cycles" : "general range"}
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mono mt-1.5 inline-flex items-center gap-1 self-start text-[9px] uppercase tracking-[0.08em] text-faint transition-colors hover:text-foreground"
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
      {open ? (
        <p className="mt-1.5 border-t border-border/50 pt-2 text-[11.5px] leading-relaxed text-muted-foreground">
          {info.deeper}
        </p>
      ) : null}
    </article>
  );
}
