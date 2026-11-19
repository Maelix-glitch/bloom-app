/**
 * GettingStartedCard — Profile's ONE first-steps card (empty-state
 * slice, diagnosis §C).
 *
 * A new account used to meet a stack of separate empty cards, each
 * with its own paragraph. This card collects the three first steps in
 * one place — assessment, first habit, first food log — and every
 * step's state is read from the person's real record: the Assessment's
 * own status, the habits list, the food log. Nothing here is seeded,
 * sampled or assumed; a step is done only when the record says so.
 *
 * When all three are done the card renders nothing at all — and while
 * the habits store is still settling it also renders nothing, so the
 * card can never flash a wrong "not done" at a returning person.
 *
 * The actions are the real doors that exist today: the assessment
 * section further down this page (an in-page anchor), Today (where
 * habits are added) and Nutrition (where food is logged).
 */

import type { ReactNode } from "react";
import { Check, ClipboardList, ListPlus, UtensilsCrossed } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useAssessment } from "@/hooks/useAssessment";
import { useHabits } from "@/hooks/useHabits";
import { useNutrition } from "@/hooks/useNutrition";

interface Step {
  id: string;
  icon: typeof ClipboardList;
  title: string;
  line: string;
  done: boolean;
  action: ReactNode;
}

export function GettingStartedCard() {
  const { state } = useAssessment();
  const habits = useHabits();
  const nutrition = useNutrition();

  /* Never show progress that might still be wrong: the habits store
     is the one source here that settles asynchronously. */
  if (habits.loading) return null;

  const assessmentDone = state.status === "complete";
  const steps: Step[] = [
    {
      id: "assessment",
      icon: ClipboardList,
      title:
        state.status === "in_progress"
          ? "Continue your assessment"
          : "Take your assessment",
      line: "Your body, your goal, your safety answers — everything Bloom computes starts here.",
      done: assessmentDone,
      action: (
        <Button type="button" size="sm" variant="secondary" asChild>
          <a href="#pf-assessment">{state.status === "in_progress" ? "Continue" : "Begin"}</a>
        </Button>
      ),
    },
    {
      id: "habit",
      icon: ListPlus,
      title: "Add your first habit",
      line: "One small routine you tick each day — it earns points and builds your record.",
      done: habits.habits.length > 0,
      action: (
        <Button type="button" size="sm" variant="secondary" asChild>
          <Link to="/">Open Today</Link>
        </Button>
      ),
    },
    {
      id: "food",
      icon: UtensilsCrossed,
      title: "Log your first food",
      line: "One meal is enough — every value arrives labelled with its source.",
      done: nutrition.entries.length > 0,
      action: (
        <Button type="button" size="sm" variant="secondary" asChild>
          <Link to="/nutrition">Open Nutrition</Link>
        </Button>
      ),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <div className="pf-card pf-card--pad" data-testid="getting-started-card">
      <div className="pf-section-head">
        <div>
          <p className="pf-eyebrow">Getting started</p>
          <h2 className="pf-title">Three first steps</h2>
        </div>
        <p className="text-[length:var(--text-caption)] text-faint tabular-nums">
          {doneCount} of {steps.length} done
        </p>
      </div>
      <ul className="mt-2 divide-y divide-border-subtle">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.id} className="flex items-center gap-3 py-3">
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full"
                style={
                  step.done
                    ? {
                        background: "color-mix(in oklab, var(--sage) 16%, transparent)",
                        color: "var(--sage)",
                      }
                    : { background: "var(--surface-2)", color: "var(--gold)" }
                }
              >
                {step.done ? <Check className="size-4" /> : <Icon className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[length:var(--text-callout)] font-medium text-foreground">
                  {step.title}
                </p>
                <p className="mt-0.5 text-[length:var(--text-caption)] leading-snug text-muted-foreground">
                  {step.line}
                </p>
              </div>
              {step.done ? (
                <span className="shrink-0 text-[length:var(--text-caption)] font-medium text-[color:var(--sage)]">
                  Done
                </span>
              ) : (
                <span className="shrink-0">{step.action}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
