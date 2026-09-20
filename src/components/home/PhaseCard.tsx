/**
 * PhaseCard — Today's cycle read.
 *
 * The one place a daily user meets the cycle science without opening the
 * Cycle page: which phase the record says today sits in, one hedged line
 * about what that phase tends to do (never what *you* will feel), a planning
 * hint, and — behind one tap — the science for every phase, so the curious
 * never have to leave Today to see the whole map. Rendered only when the
 * person tracks a cycle with real entries and predictions on — otherwise the
 * card doesn't exist, exactly like every other cycle surface in Bloom.
 *
 * During the estimated pre-period days the card also offers "Ease this week":
 * the person's own opt-in that lets Today's focus suggest one habit instead
 * of two. A preference, never a rule — it lives in their cycle settings and
 * says so.
 *
 * Every line cites its honesty: the phase label comes from the engine with
 * its confidence, and the science line admits when the phase is from the
 * general pattern rather than the person's logs.
 */

import { useEffect, useState } from "react";
import { ChevronDown, Droplets } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Switch } from "@/components/ui/switch";
import type { CycleAnalysis } from "@/lib/cycle/predict";
import { describeNextPeriodShort } from "@/lib/cycle/predict";
import { pickStable } from "@/lib/voice/messages";
import {
  CYCLE_SETTINGS_CHANGED,
  loadCycleSettings,
  saveCycleSettings,
} from "@/lib/cycle/periodStore";
import { phaseBrief, phaseKeyOf, phaseScienceLine } from "@/lib/cycle/phaseScience";

/** Planning hints per phase — preference-shaped, never a rule. Keyed by the
    canonical phase key so the label's exact wording can never orphan a pool. */
const PHASE_HINTS: Record<string, string[]> = {
  menstrual: [
    "A softer week is a strategy, not a retreat — put the gentlest plan on the hardest days.",
    "Keep one small comfort prepped — heat pad, easy dinner — and let the plan bend around it.",
  ],
  follicular: [
    "Energy tends to climb from here — a good stretch to point at the thing you've been postponing.",
    "If there's a habit to start, this is the window where starting is cheapest.",
  ],
  ovulation: [
    "Some people feel their strongest days here — worth spending on what matters most to you.",
  ],
  luteal: [
    "Lower the bar, not the plan — pre-period weeks reward smaller, finished things.",
    "If the afternoons dip, front-load the day; the record says this week forgives it.",
  ],
};

export function PhaseCard({ analysis, today }: { analysis: CycleAnalysis; today: string }) {
  /* All hooks run before the existence guard — the card is allowed to decide
     it doesn't exist, but never allowed to change its hook count mid-flight. */
  const [settings, setSettings] = useState(() => loadCycleSettings());
  const [scienceOpen, setScienceOpen] = useState(false);

  /* Another tab or the Cycle page changed the settings — stay honest. */
  useEffect(() => {
    const reread = () => setSettings(loadCycleSettings());
    window.addEventListener(CYCLE_SETTINGS_CHANGED, reread);
    return () => window.removeEventListener(CYCLE_SETTINGS_CHANGED, reread);
  }, []);

  /* The card only exists for a live, evidenced cycle — paused tracking,
     nothing logged, or an unplaced day all mean no card, like every other
     cycle surface in Bloom. */
  if (!analysis.expecting || analysis.entryCount === 0) return null;
  if (analysis.cycleDay === null || analysis.phaseLabel === "Unknown") return null;

  const science = phaseScienceLine(
    analysis.phaseLabel,
    analysis.confidence,
    `${analysis.phaseLabel}-${today}`,
  );
  const hintPool = PHASE_HINTS[phaseKeyOf(analysis.phaseLabel) ?? ""];
  const hint = hintPool ? pickStable(hintPool, `phase-hint-${today}`) : null;
  const next = describeNextPeriodShort(analysis);
  const brief = scienceOpen ? phaseBrief() : null;

  /* The ease offer lives in the estimated pre-period window — early enough
     to matter, rare enough to stay a gentle exception. */
  const daysTo = analysis.daysUntilNext;
  const easeAvailable = daysTo !== null && daysTo >= 0 && daysTo <= 3;
  const easeOn = settings.easeBeforePeriod === true;

  return (
    <section className="home-panel home-phase p-5 sm:p-6" aria-labelledby="home-phase-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Your cycle</p>
          <h2 id="home-phase-title" className="mt-1 font-display text-xl leading-tight sm:text-2xl">
            Day {analysis.cycleDay}
            {analysis.phaseLabel ? (
              <span className="home-phase-sep" aria-hidden>
                {" · "}
              </span>
            ) : null}
            {analysis.phaseLabel ? (
              <em className="home-text-gradient not-italic">{analysis.phaseLabel}</em>
            ) : null}
          </h2>
        </div>
        <span
          className="mt-1 inline-flex size-9 flex-none items-center justify-center rounded-full border"
          style={{
            borderColor: "color-mix(in oklab, var(--home-cycle, var(--gold)) 32%, transparent)",
            color: "var(--home-cycle, var(--gold))",
          }}
          aria-hidden
        >
          <Droplets className="size-4" />
        </span>
      </div>

      {science ? (
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">{science}</p>
      ) : null}

      {easeAvailable ? (
        <div className="home-phase-ease mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-2/40 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Ease this week</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              Pre-period days ahead — Today will suggest one habit instead of two.
            </p>
          </div>
          <Switch
            checked={easeOn}
            onCheckedChange={(checked) => {
              const updated = { ...settings, easeBeforePeriod: checked };
              setSettings(updated);
              saveCycleSettings(updated);
            }}
            aria-label="Ease this week — one habit is enough on pre-period days"
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {next ? (
          <span className="home-chip text-[11px]" title="Estimated from your own record">
            {next}
          </span>
        ) : null}
        {hint ? <span className="home-chip text-[11px]">{hint}</span> : null}
        <Link to="/cycle" className="home-chip text-[11px]">
          Open Cycle
        </Link>
      </div>

      {science ? (
        <div className="mt-3">
          <button
            type="button"
            className="home-phase-science-toggle inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            aria-expanded={scienceOpen}
            onClick={() => setScienceOpen((open) => !open)}
          >
            The science, in full
            <ChevronDown
              className={`size-3.5 transition-transform duration-300 ${scienceOpen ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {brief ? (
            <dl className="home-phase-science mt-3 space-y-2.5 border-l border-border/70 pl-3.5">
              {brief.map((row) => (
                <div key={row.key}>
                  <dt
                    className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      phaseKeyOf(analysis.phaseLabel) === row.key
                        ? "text-[var(--home-cycle,var(--gold))]"
                        : "text-muted-foreground/80"
                    }`}
                  >
                    {row.label}
                    {phaseKeyOf(analysis.phaseLabel) === row.key ? " — today" : ""}
                  </dt>
                  <dd className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                    {row.line}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
