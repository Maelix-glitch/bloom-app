/**
 * NutritionPage — the Nutrition tab's day view (design §4.2).
 *
 * One day at a time: a totals header measured against the targets engine
 * when it offers targets, and totals standing as totals when it doesn't —
 * a safety refusal shows no target and no deficit framing, and an
 * incomplete profile explains plainly what would unlock one (§4.5).
 * Entries group by meal; every entry's numbers render from the lib's
 * labelled bundle beside its provenance badge. Deleting an entry is
 * undoable for the shared undo window, and yesterday's meals can be
 * copied into today in one tap.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BloomIcon } from "@/components/icons/BloomIcon";
import { useNutrition, yesterdayOf } from "@/hooks/useNutrition";
import { shiftDay } from "@/lib/localDay";
import { UNDO_WINDOW_MS, type Undoable } from "@/lib/undo";
import {
  MEALS,
  labelledEntryNutrients,
  sumNutrients,
  type LogEntry,
} from "@/lib/nutrition";
import { AddFoodSheet } from "./AddFoodSheet";
import { NutritionPlanSection } from "./NutritionPlanSection";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { MEAL_LABEL, amountLabel, formatGrams, nutrientLine } from "./input";

function formatDayTitle(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === yesterdayOf(today)) return "Yesterday";
  const d = new Date(`${day}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export function NutritionPage() {
  const nutrition = useNutrition();
  const [day, setDay] = useState(nutrition.today);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [undoable, setUndoable] = useState<(Undoable & { entry: LogEntry }) | null>(null);

  const dayLog = nutrition.dayLog(day);
  const comparison = nutrition.comparison(day);
  const yesterday = yesterdayOf(day);
  const yesterdayCount = nutrition.dayLog(yesterday).entries.length;
  const isToday = day === nutrition.today;

  const byMeal = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const entry of dayLog.entries) {
      const list = map.get(entry.meal) ?? [];
      list.push(entry);
      map.set(entry.meal, list);
    }
    return map;
  }, [dayLog.entries]);

  /* The undo snapshot dies with its window, like every Bloom undo. */
  useEffect(() => {
    if (!undoable) return;
    const t = window.setTimeout(() => setUndoable(null), UNDO_WINDOW_MS);
    return () => window.clearTimeout(t);
  }, [undoable]);

  const remove = (entry: LogEntry) => {
    nutrition.removeEntry(entry);
    setUndoable({
      id: Date.now(),
      message: `Removed “${entry.name}”.`,
      until: Date.now() + UNDO_WINDOW_MS,
      entry,
    });
  };

  const undo = () => {
    if (!undoable) return;
    nutrition.restoreEntry(undoable.entry);
    setUndoable(null);
  };

  const { totals, targets } = comparison;

  return (
    <div className="nut-wrap">
      <header>
        <p className="home-eyebrow">Nutrition</p>
        <h1 className="mt-2 font-display text-[length:var(--text-page)] leading-tight text-foreground">
          What you eat, honestly labelled
        </h1>
        <p className="mt-2 max-w-[56ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          Every value carries its source — USDA reference data, your own packet labels, or a
          clearly marked estimate. Nothing is presented as more certain than it is.
        </p>
      </header>

      {/* Day navigation */}
      <div className="mt-6 flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label="Previous day"
          onClick={() => setDay((d) => shiftDay(d, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <h2 className="min-w-0 flex-1 text-center font-display text-[length:var(--text-section)] text-foreground">
          {formatDayTitle(day, nutrition.today)}
        </h2>
        {!isToday ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setDay(nutrition.today)}>
            Today
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          aria-label="Next day"
          disabled={isToday}
          onClick={() => setDay((d) => shiftDay(d, 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      {/* Totals vs targets */}
      <section className="nut-day-card" aria-label="Day totals">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="nut-big-number">
            {Math.round(totals.kcal)}
            <span className="nut-big-unit">kcal</span>
          </p>
          {targets ? (
            <p className="text-[length:var(--text-support)] text-muted-foreground">
              of your ~{Math.round(targets.kcal)} kcal target
            </p>
          ) : null}
        </div>
        {targets && comparison.kcalFraction !== null ? (
          <div
            className="nut-bar mt-3"
            role="progressbar"
            aria-label="Calories against target"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, Math.round(comparison.kcalFraction * 100))}
          >
            <span
              className="nut-bar-fill"
              style={{ width: `${Math.min(100, comparison.kcalFraction * 100)}%` }}
            />
          </div>
        ) : null}
        <p className="mt-3 text-[length:var(--text-callout)] tabular-nums text-foreground">
          Protein {formatGrams(totals.proteinG)} g
          {targets ? (
            <span className="text-muted-foreground"> of ~{formatGrams(targets.proteinG)} g</span>
          ) : null}
          <span className="text-muted-foreground">
            {"  ·  "}Carbs {formatGrams(totals.carbsG)} g{"  ·  "}Fat {formatGrams(totals.fatG)} g
          </span>
        </p>
        {nutrition.targetState.kind === "ready" ? (
          <p className="nut-note">
            Targets are estimates from your body numbers (Mifflin–St Jeor) — a guide for the
            day, not a prescription.
          </p>
        ) : nutrition.targetState.kind === "blocked" ? (
          <p className="nut-note">
            Your safety answers mean Bloom doesn't set calorie targets for you. These totals
            are simply your record — logging still works exactly the same.
          </p>
        ) : (
          <p className="nut-note">
            No target yet: targets come from your body numbers.{" "}
            <Link to="/trackers" className="nut-inline-link">
              Add them on Trackers
            </Link>{" "}
            or take the assessment, and this day will measure against one.
          </p>
        )}
      </section>

      {/* Today's plan — a plan is built for a day, so it belongs to the
          today view; other days are the record, not the plan. */}
      {isToday ? <NutritionPlanSection /> : null}

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => { setEditing(null); setAddOpen(true); }}>
          <Plus className="size-4" aria-hidden /> Add food
        </Button>
        {isToday && yesterdayCount > 0 ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => nutrition.copyDayInto(yesterday, day)}
          >
            Copy yesterday's meals
          </Button>
        ) : null}
      </div>

      {/* Entries by meal */}
      {dayLog.entries.length === 0 ? (
        <div className="nut-day-card mt-5">
          <EmptyState
            glyph={<BloomIcon name="nutrition" size={28} />}
            title={<>Nothing logged {isToday ? "today" : "this day"} yet</>}
            description="When you log a food, it lands here with its source attached — and your totals above start to move."
            action={
              <Button type="button" onClick={() => { setEditing(null); setAddOpen(true); }}>
                Log your first food
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-2">
          {MEALS.map((meal) => {
            const entries = byMeal.get(meal);
            if (!entries || entries.length === 0) return null;
            const mealTotals = sumNutrients(entries.map((e) => e.nutrients));
            return (
              <section key={meal} aria-label={MEAL_LABEL[meal]} className="nut-meal">
                <div className="nut-meal-head">
                  <h3 className="nut-meal-title">{MEAL_LABEL[meal]}</h3>
                  <span className="text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
                    {Math.round(mealTotals.kcal)} kcal
                  </span>
                </div>
                <ul className="divide-y divide-border-subtle">
                  {entries.map((entry) => {
                    const labelled = labelledEntryNutrients(entry);
                    return (
                      <li key={entry.id} className="nut-entry">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[length:var(--text-callout)] font-medium text-foreground">
                              {entry.name}
                            </p>
                            <ProvenanceBadge
                              kind={entry.provenance.kind}
                              label={labelled.label}
                              estimate={labelled.estimate}
                            />
                          </div>
                          <p className="mt-0.5 text-[length:var(--text-caption)] tabular-nums text-muted-foreground">
                            {amountLabel(entry.amount)} · {nutrientLine(labelled.nutrients)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Edit ${entry.name}`}
                            onClick={() => { setEditing(entry); setAddOpen(true); }}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Remove ${entry.name}`}
                            onClick={() => remove(entry)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <AddFoodSheet
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditing(null); }}
        day={day}
        editing={editing}
      />

      {undoable ? (
        <div
          key={undoable.id}
          className="nut-undo"
          role="status"
          aria-live="polite"
          data-testid="nutrition-undo"
          style={{ ["--nut-undo-ms" as string]: `${UNDO_WINDOW_MS}ms` }}
        >
          <span className="min-w-0 truncate">{undoable.message}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={undo}
          >
            <Undo2 className="size-3.5" aria-hidden /> Undo
          </button>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss"
            onClick={() => setUndoable(null)}
          >
            <X className="size-3.5" aria-hidden />
          </button>
          <span className="nut-undo__bar" aria-hidden />
        </div>
      ) : null}
    </div>
  );
}
