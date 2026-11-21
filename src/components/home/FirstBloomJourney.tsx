/**
 * FirstBloomJourney — Today's First Bloom path (mobile only).
 *
 * The lead section of the rebuilt mobile Today for anyone who hasn't
 * finished it: a visible path of seven steps, ONE current step as the
 * single clear action, each step introducing one part of Bloom with
 * one small real action. The model (lib/home/journey) derives every
 * step's state from the record itself; this component only reads the
 * same hooks the page already reads and wires the step actions to the
 * doors the page already owns (the metrics sheet, the mood composer,
 * the habit toggle/add, the orb's open bus, Nutrition, Profile's
 * assessment card).
 *
 * The discipline, matching the Profile Getting Started card:
 *   · while the record hasn't settled it renders nothing — a wrong
 *     "not done" must never flash at a returning person;
 *   · when every step is done it renders nothing — the path retires
 *     and the day itself leads the page;
 *   · it never blocks anything: navigation and every feature stay
 *     open, and "Explore freely" folds the path away for the session.
 *
 * Presentation is the house system only — one home-panel, the eyebrow
 * and band-title classes, the meter, token text sizes — so a surface
 * pass can restyle it centrally. Desktop never sees it (lg:hidden);
 * the desktop stack is untouched.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ClipboardList,
  Droplets,
  Heart,
  ListChecks,
  MoonStar,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GOAL_LABEL } from "@/lib/assessment/questions";
import { useAssessment } from "@/hooks/useAssessment";
import { useHabits } from "@/hooks/useHabits";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { usePlan } from "@/hooks/usePlan";
import { useTrackers } from "@/hooks/useTrackers";
import { journeyStateOf, type JourneyStepId } from "@/lib/home/journey";
import { formatPoints } from "@/lib/progression/format";
import { onVitalisOpened, requestVitalisOpen } from "@/lib/vitalis-ai/openRequest";
import { cn } from "@/lib/utils";

const STEP_ICON: Record<JourneyStepId, typeof Droplets> = {
  water: Droplets,
  habit: ListChecks,
  vitalis: Sparkles,
  dish: UtensilsCrossed,
  sleep: MoonStar,
  mood: Heart,
  assessment: ClipboardList,
};

export interface FirstBloomJourneyProps {
  /** The page's latched settled flag — the path never renders on an
      unsettled record. */
  ready: boolean;
  /** The metrics sheet door (water and sleep both log there). */
  onLogMetrics: () => void;
  /** The mood composer door. */
  onOpenMood: () => void;
  /** Tick a habit by id (the page's own toggle path). */
  onToggleHabit: (id: string) => void;
  /** The add-habit door. */
  onAddHabit: () => void;
}

export function FirstBloomJourney({
  ready,
  onLogMetrics,
  onOpenMood,
  onToggleHabit,
  onAddHabit,
}: FirstBloomJourneyProps) {
  const trackers = useTrackers();
  const habits = useHabits();
  const mood = useMoodSystem();
  const assessment = useAssessment();
  const plan = usePlan();

  /* Vitalis's only signal: its window opened in this session. The orb
     persists nothing by design, so this is session state, held here
     and never written anywhere. */
  const [vitalisMet, setVitalisMet] = useState(false);
  useEffect(() => onVitalisOpened(() => setVitalisMet(true)), []);

  /* "Explore freely" folds the path for this session only. */
  const [folded, setFolded] = useState(false);

  const journey = useMemo(
    () =>
      journeyStateOf({
        waterDaysLogged: trackers.analysis.trackers.water.daysLogged,
        habitTicks: habits.logs.length,
        vitalisMet,
        planExists: plan.state.kind === "ready" || plan.state.kind === "outdated",
        todayDish:
          plan.state.kind === "ready"
            ? (plan.state.plan.meals[0]?.dishes.find((d) => d.role === "anchor")?.name ??
              plan.state.plan.meals[0]?.dishes[0]?.name ??
              null)
            : null,
        sleepDaysLogged: trackers.analysis.trackers.sleep.daysLogged,
        moodEntries: mood.entries.length,
        assessmentStatus: assessment.state.status,
        goal: assessment.state.answers.goal,
      }),
    [
      trackers.analysis,
      habits.logs.length,
      vitalisMet,
      plan.state,
      mood.entries.length,
      assessment.state.status,
      assessment.state.answers.goal,
    ],
  );

  if (!ready || journey.complete) return null;

  const current = journey.steps[journey.current]!;
  const upcoming = journey.steps.slice(journey.current + 1);
  const CurrentIcon = STEP_ICON[current.id];

  /* The current step's one action, wired to the page's own doors. */
  const action = (() => {
    switch (current.id) {
      case "water":
        return (
          <Button type="button" size="sm" className="home-press" onClick={onLogMetrics}>
            {current.actionLabel}
          </Button>
        );
      case "habit": {
        const open = habits.todayHabits.find((h) => !h.done);
        if (open) {
          return (
            <Button
              type="button"
              size="sm"
              className="home-press"
              onClick={() => onToggleHabit(open.id)}
            >
              Tick {open.name}
            </Button>
          );
        }
        return (
          <Button type="button" size="sm" className="home-press" onClick={onAddHabit}>
            {habits.habits.length === 0 ? "Add your first habit" : current.actionLabel}
          </Button>
        );
      }
      case "vitalis":
        return (
          <Button type="button" size="sm" className="home-press" onClick={requestVitalisOpen}>
            {current.actionLabel}
          </Button>
        );
      case "dish":
        return (
          <Button type="button" size="sm" className="home-press" asChild>
            <Link to="/nutrition">{current.actionLabel}</Link>
          </Button>
        );
      case "sleep":
        return (
          <Button type="button" size="sm" className="home-press" onClick={onLogMetrics}>
            {current.actionLabel}
          </Button>
        );
      case "mood":
        return (
          <Button type="button" size="sm" className="home-press" onClick={onOpenMood}>
            {current.actionLabel}
          </Button>
        );
      case "assessment":
        return (
          <Button type="button" size="sm" className="home-press" asChild>
            <Link to="/profile" hash="pf-assessment">
              {current.actionLabel}
            </Link>
          </Button>
        );
    }
  })();

  if (folded) {
    return (
      <section
        className="home-panel home-rise flex items-center justify-between gap-3 p-4 lg:hidden"
        data-testid="first-bloom-journey-folded"
        aria-label="First Bloom path, folded"
      >
        <p className="text-[length:var(--text-support)] text-muted-foreground">
          <span className="font-medium text-foreground">First Bloom</span> · {journey.doneCount} of{" "}
          {journey.steps.length} steps
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="home-press"
          onClick={() => setFolded(false)}
        >
          Show the path
        </Button>
      </section>
    );
  }

  return (
    <section
      className="home-panel home-rise p-5 lg:hidden"
      data-testid="first-bloom-journey"
      aria-labelledby="first-bloom-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="home-eyebrow">First Bloom</p>
          <h2 id="first-bloom-title" className="home-band-title mt-1">
            One step at a time
          </h2>
          <p className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            {assessment.state.answers.goal
              ? `Seven small steps toward ${GOAL_LABEL[assessment.state.answers.goal].toLowerCase()} — each one opens a part of Bloom.`
              : "Seven small steps — each one opens a part of Bloom."}
          </p>
        </div>
        <p className="shrink-0 text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
          {journey.doneCount} of {journey.steps.length}
        </p>
      </div>

      {/* The path itself: stations on a hairline, the LevelCard
          stepper's language — done is gold-filled, the current step
          is ringed, what's ahead is an outline. Pure progress; the
          one action lives below, not on the dots. */}
      <ol
        className="mt-5 grid"
        style={{ gridTemplateColumns: `repeat(${journey.steps.length}, minmax(0, 1fr))` }}
        aria-label="Your First Bloom progress"
      >
        {journey.steps.map((step, i) => (
          <li key={step.id} className="relative flex flex-col items-center">
            {i > 0 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute right-1/2 top-[9px] h-px w-full",
                  step.done ? "bg-gold/50" : "bg-white/10",
                )}
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "relative grid size-[19px] place-items-center rounded-full",
                step.done
                  ? "bg-gold text-background shadow-[0_0_12px_rgba(220,192,143,0.55)]"
                  : i === journey.current
                    ? "border-2 border-gold bg-gold/15"
                    : "border border-white/20 bg-transparent",
              )}
            >
              {step.done ? <Check className="size-3" strokeWidth={3} /> : null}
            </span>
            <span className="sr-only">
              Step {i + 1} of {journey.steps.length}: {step.title} —{" "}
              {step.done ? "done" : i === journey.current ? "current step" : "ahead"}
            </span>
          </li>
        ))}
      </ol>

      {/* The ONE current step: icon, its line, its single action, and
          the points the progression system itself pays for it. */}
      <div className="mt-5 border-t border-white/[0.06] pt-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/10 text-gold"
          >
            <CurrentIcon className="size-4.5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[length:var(--text-body)] font-medium text-foreground">
              {current.title}
            </h3>
            <p className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
              {current.line}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              {action}
              {current.points !== null ? (
                <span className="text-[length:var(--text-support)] font-medium text-gold">
                  +{formatPoints(current.points)} points
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* What's ahead, quietly — titles only, no boxes within the box. */}
      {upcoming.length > 0 ? (
        <ul className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-3">
          {upcoming.map((step) => {
            const Icon = STEP_ICON[step.id];
            return (
              <li
                key={step.id}
                className="flex items-center gap-2.5 text-[length:var(--text-support)] text-muted-foreground"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden strokeWidth={1.75} />
                <span>{step.title}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
          Bloom is open — every tab works. This path just shows you around.
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="home-press shrink-0"
          onClick={() => setFolded(true)}
        >
          Explore freely
        </Button>
      </div>
    </section>
  );
}
