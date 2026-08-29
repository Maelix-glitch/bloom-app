/**
 * Your Patterns + Lifestyle links — observation first, interpretation on
 * request, causation never. Every card names its sample ("seen in 3 of your
 * 6 cycles"), and the whole section explains itself through one method note.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { isTallyMeaningful, phaseTally, sleepVsLength, symptomTimings } from "@/lib/cycle/patterns";
import type { CycleEntry, CycleModel, PhaseKey } from "@/lib/cycle/types";
import { PHASE_COLOR } from "@/lib/cycle/palette";

const PHASE_LABEL: Record<PhaseKey, string> = {
  menstrual: "period",
  follicular: "follicular",
  ovulation: "fertile",
  luteal: "luteal",
};

export function PatternInsights({
  model,
  entries,
  onOpenMethod,
}: {
  model: CycleModel;
  entries: CycleEntry[];
  onOpenMethod: () => void;
}) {
  const symptoms = symptomTimings(entries, model);
  const energy = phaseTally(entries, model, "energy");
  const mood = phaseTally(entries, model, "mood");
  const sleep = sleepVsLength(entries, model);

  const cards: {
    key: string;
    title: string;
    body: React.ReactNode;
    evidence?: { seen: number; total: number } | undefined;
  }[] = [];

  for (const s of symptoms) {
    cards.push({
      key: `sym-${s.symptom}`,
      title: `${s.symptom} shows up early`,
      evidence: { seen: s.seenInCycles, total: s.totalCycles },
      body: (
        <Observation
          found={`Seen around cycle day ${s.medianCycleDay} on ${s.seenInCycles} of your ${s.totalCycles} logged cycles.`}
          reading={`That's a pattern worth expecting — ${s.symptom.toLowerCase()} tending to appear near the start rather than the middle of your month.`}
        />
      ),
    });
  }
  if (isTallyMeaningful(energy)) {
    cards.push({
      key: "energy-phase",
      title: "Energy leans on one side of the cycle",
      body: (
        <PhaseBars
          tally={energy}
          scale={5}
          unit="/5"
          reading="Your average energy differs noticeably between phases — an observation across your own logs, not a rule."
        />
      ),
    });
  }
  if (isTallyMeaningful(mood)) {
    cards.push({
      key: "mood-phase",
      title: "Mood has a seasonal feel to it",
      body: (
        <PhaseBars
          tally={mood}
          scale={5}
          unit="/5"
          reading="Mood scores (Low→Energized) group differently by phase across your entries. Yours may shift differently — that's normal."
        />
      ),
    });
  }
  if (sleep.shortAvg !== null && sleep.longAvg !== null) {
    const delta = sleep.shortAvg - sleep.longAvg;
    cards.push({
      key: "sleep-length",
      title: "Sleep and cycle length, side by side",
      body: (
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          On shorter cycles you logged ~{sleep.shortAvg.toFixed(1)} h of sleep vs ~
          {sleep.longAvg.toFixed(1)} h on longer ones ({sleep.pairs} cycles compared). A link
          visible in {sleep.pairs} cycles isn't a cause — it's a thread you might enjoy noticing.
        </p>
      ),
    });
  }

  if (cards.length === 0) {
    return (
      <div className="cy-ghost max-w-[760px] px-5 py-6">
        <p className="cy-eyebrow">Still taking shape</p>
        <p className="cy-title mt-2 text-[19px] leading-snug">
          Your personal rhythm is still becoming familiar.
        </p>
        <p className="mt-2 max-w-[56ch] text-[13px] leading-relaxed text-muted-foreground">
          Once two or three cycles carry symptom, mood or energy notes, this section shows what
          recurs — with counts and sample sizes, never guesses. The shape below is what it will look
          like; the values only exist when your logs bring them.
        </p>
        <div className="cy-ghost-bars mt-5 max-w-[420px]" aria-hidden>
          {[46, 62, 38, 56, 44, 60, 40, 54].map((h, i) => (
            <i key={i} style={{ height: h }} />
          ))}
        </div>
        <p className="mono mt-2 text-[8.5px] uppercase tracking-[0.1em] text-faint">
          preview of the shape · no invented values
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {cards.slice(0, 4).map((c) => (
        <PatternCard
          key={c.key}
          title={c.title}
          evidence={c.evidence}
          cycles={model.completed.length}
          onMethod={onOpenMethod}
        >
          {c.body}
        </PatternCard>
      ))}
    </div>
  );
}

function PatternCard({
  title,
  children,
  evidence,
  cycles,
  onMethod,
}: {
  title: string;
  children: React.ReactNode;
  evidence?: { seen: number; total: number } | undefined;
  cycles: number;
  onMethod: () => void;
}) {
  const [open, setOpen] = useState(false);
  const strength = evidence ? evidence.seen : Math.min(cycles, 2);
  const tier =
    strength >= 5 ? "repeated pattern" : strength >= 3 ? "emerging pattern" : "early signal";
  return (
    <article className="rounded-2xl border border-border/70 bg-surface/45 px-4 py-3.5 transition-colors hover:border-border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="cy-tierchip">{tier}</span>
        {evidence ? (
          <span className="flex items-center gap-2 text-[11px] text-faint">
            <span className="cy-evi" aria-hidden>
              {Array.from({ length: Math.min(evidence.total, 8) }, (_, i) => (
                <i key={i} className={i < Math.min(evidence.seen, 8) ? "on" : undefined} />
              ))}
            </span>
            seen in {evidence.seen} of {evidence.total} cycles
          </span>
        ) : (
          <span className="text-[11px] text-faint">from your logged history</span>
        )}
      </div>
      <h3 className="display mt-1.5 text-[15.5px] leading-snug">{title}</h3>
      <div className="mt-2">{children}</div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mono inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-faint transition-colors hover:text-foreground"
        >
          How this reads{" "}
          <ChevronDown
            className={cn(
              "size-3 transition-transform duration-[var(--motion-med)]",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={onMethod}
          className="mono text-[9px] uppercase tracking-[0.08em] text-faint underline underline-offset-2 hover:text-foreground"
        >
          method
        </button>
      </div>
      {open ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
          We group every day you logged into the phase your model puts it in, average the values,
          and only call it a pattern when at least two phases hold two-plus observations. It is
          observation, not cause — and it only reflects the days you actually logged.
        </p>
      ) : null}
    </article>
  );
}

function Observation({ found, reading }: { found: string; reading: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">{found}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mono mt-1.5 text-[9px] uppercase tracking-[0.08em] text-faint underline underline-offset-2 hover:text-foreground"
      >
        {open ? "hide the gentle read" : "the gentle read"}
      </button>
      {open ? <p className="mt-1 text-[11.5px] leading-relaxed text-faint">{reading}</p> : null}
    </div>
  );
}

function PhaseBars({
  tally,
  scale,
  unit,
  reading,
}: {
  tally: ReturnType<typeof phaseTally>;
  scale: number;
  unit: string;
  reading: string;
}) {
  return (
    <Observation
      found={`Across ${tally.n} logged days: ${tally.byPhase
        .filter((p) => p.n >= 2 && p.avg !== null)
        .map((p) => `${PHASE_LABEL[p.phase]} ${p.avg!.toFixed(1)}${unit} (${p.n})`)
        .join(" · ")}`}
      reading={reading}
    />
  );
}
