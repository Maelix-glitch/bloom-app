/**
 * NutritionPage — the Nutrition tab (W4-3 N4), rebuilt to the owner's
 * prototype composition (N-UI): header + gold Add food, the date strip,
 * the rings hero with its provenance ledger, the meal timeline beside
 * the week panel and the micronutrient spectrum, today's plan, and the
 * pattern lab over real mood check-ins.
 *
 * Every number on this page comes from the nutrition lib over the
 * user's real log — totals, the target comparison (safety-gated: a
 * substantive safety block means no targets and no deficit framing
 * anywhere on the page), provenance shares, week aggregates, spectrum
 * floors. The page assembles and arranges; it derives nothing itself.
 * Deleting an entry is undoable for the shared undo window, and
 * yesterday's meals can be copied into today in one tap.
 */

import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles, Undo2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useBodyProfile } from "@/hooks/useBodyProfile";
import { useMoodSystem } from "@/hooks/useMoodSystem";
import { useNutrition, yesterdayOf } from "@/hooks/useNutrition";
import { shiftDay } from "@/lib/localDay";
import { aggregateDays } from "@/lib/mood/analytics";
import { UNDO_WINDOW_MS, type Undoable } from "@/lib/undo";
import {
  moodPatterns,
  spectrumForDay,
  sumNutrients,
  weekAggregates,
  type LogEntry,
  type Meal,
  type PatternDayInput,
} from "@/lib/nutrition";
import { AddFoodSheet } from "./AddFoodSheet";
import { DateNav, NutritionHero } from "./NutritionHero";
import { PatternLab, Spectrum, WeekPanel } from "./NutritionPanels";
import { NutritionPlanSection } from "./NutritionPlanSection";
import { NutritionTimeline } from "./NutritionTimeline";
import { PhotoCreditsSheet } from "./PhotoCreditsSheet";

interface SheetState {
  open: boolean;
  meal: Meal | null;
  editing: LogEntry | null;
}

export function NutritionPage() {
  const nutrition = useNutrition();
  const body = useBodyProfile();
  const { entries: moodEntries } = useMoodSystem();
  const [day, setDay] = useState(nutrition.today);
  const [sheet, setSheet] = useState<SheetState>({ open: false, meal: null, editing: null });
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [undoable, setUndoable] = useState<(Undoable & { entry: LogEntry }) | null>(null);

  const isToday = day === nutrition.today;
  const dayLog = nutrition.dayLog(day);
  const comparison = nutrition.comparison(day);
  const targets = nutrition.targetState.kind === "ready" ? nutrition.targetState.targets : null;

  const week = useMemo(
    () => weekAggregates(nutrition.entries, day, targets?.proteinG ?? null),
    [nutrition.entries, day, targets],
  );
  const spectrum = useMemo(
    () => spectrumForDay(dayLog.entries, nutrition.spectrumSex),
    [dayLog.entries, nutrition.spectrumSex],
  );

  /* PatternLab inputs: the last 28 days of real food logs joined with
     the mood module's own day aggregation (mean check-in, 1–10). Days
     without a check-in or without food simply take part in nothing —
     `moodPatterns` enforces the two-days-each-side minimum. */
  const patterns = useMemo(() => {
    const moodByDay = new Map(aggregateDays(moodEntries).map((agg) => [agg.date, agg.mood]));
    const days: PatternDayInput[] = [];
    for (let back = 27; back >= 0; back -= 1) {
      const d = shiftDay(nutrition.today, -back);
      const dayEntries = nutrition.entries.filter((e) => e.day === d);
      const totals = sumNutrients(dayEntries.map((e) => e.nutrients));
      days.push({
        day: d,
        mood: moodByDay.get(d) ?? null,
        hasFood: dayEntries.length > 0,
        proteinG: totals.proteinG,
        fibreG: dayEntries.length > 0 ? (totals.fibreG ?? null) : null,
        breakfastProteinG: sumNutrients(
          dayEntries.filter((e) => e.meal === "breakfast").map((e) => e.nutrients),
        ).proteinG,
      });
    }
    return moodPatterns(days, {
      proteinTargetG: targets?.proteinG ?? null,
      fibreReferenceG: 30,
    });
  }, [moodEntries, nutrition.entries, nutrition.today, targets]);

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

  const yesterday = yesterdayOf(day);
  const yesterdayCount = nutrition.dayLog(yesterday).entries.length;

  return (
    <div className="nut-wrap nut-page">
      <header className="nut-rise">
        <p className="eyebrow">Nutrition</p>
        <h1 className="mt-2 font-display text-[clamp(30px,4.6vw,44px)] leading-[1.05] text-foreground">
          What you eat, <em className="nut-gold-text">honestly labelled</em>
        </h1>
        <p className="mt-2.5 max-w-[58ch] text-[length:var(--text-body)] leading-[var(--leading-body)] text-muted-foreground">
          Every value carries its source — USDA reference data, your own packet labels, or a
          clearly marked estimate. Nothing is presented as more certain than it is.
        </p>
        <div className="mt-4">
          <button
            type="button"
            className="nut-btn nut-btn-gold"
            onClick={() => setSheet({ open: true, meal: null, editing: null })}
          >
            <Plus className="size-4" aria-hidden /> Add food
          </button>
        </div>
      </header>

      <div className="mt-6">
        <DateNav
          day={day}
          today={nutrition.today}
          onSelect={setDay}
          targets={targets}
          kcalOfDay={(d) => {
            const log = nutrition.dayLog(d);
            return log.entries.length > 0 ? log.totals.kcal : null;
          }}
        />
        {!isToday ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              className="nut-backlink"
              onClick={() => setDay(nutrition.today)}
            >
              Today
            </button>
          </div>
        ) : null}
      </div>

      <NutritionHero
        day={day}
        today={nutrition.today}
        log={dayLog}
        targetState={nutrition.targetState}
        comparison={comparison}
        bmr={body.targets?.bmr ?? null}
        tdee={body.targets?.tdee ?? null}
      />

      {dayLog.entries.length === 0 ? (
        <section className="nut-card nut-rise mt-4 text-center" aria-label="Nothing logged yet">
          <Sparkles className="mx-auto size-6 text-[var(--gold)]" aria-hidden />
          <h2 className="mt-3 font-display text-[length:var(--text-title)] text-foreground">
            Nothing logged yet
          </h2>
          <p className="mx-auto mt-1.5 max-w-[46ch] text-[length:var(--text-callout)] leading-[var(--leading-body)] text-muted-foreground">
            When you log a food, it will appear here with its source attached — and your
            totals above start to move.
          </p>
          <button
            type="button"
            className="nut-btn nut-btn-ghost nut-btn-sm mt-4"
            onClick={() => setSheet({ open: true, meal: null, editing: null })}
          >
            <Plus className="size-3.5" aria-hidden /> Log your first food
          </button>
        </section>
      ) : null}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.25fr_1fr]">
        <NutritionTimeline
          entries={dayLog.entries}
          onAdd={(meal) => setSheet({ open: true, meal, editing: null })}
          onEdit={(entry) => setSheet({ open: true, meal: null, editing: entry })}
          onRemove={remove}
        />
        <div className="space-y-4">
          <WeekPanel week={week} targets={targets} reportDay={day} />
          <Spectrum rows={spectrum} sex={nutrition.spectrumSex} />
        </div>
      </div>

      {isToday && yesterdayCount > 0 ? (
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => nutrition.copyDayInto(yesterday, nutrition.today)}
          >
            Copy yesterday's meals
          </Button>
        </div>
      ) : null}

      {/* Today's plan — a plan is built for a day, so it belongs to the
          today view; other days are the record, not the plan. */}
      {isToday ? <NutritionPlanSection /> : null}

      <PatternLab patterns={patterns} />

      {/* Photo credits — the reference foods' photographs are real
          photographs from Wikimedia Commons; their authors and licences
          are credited in full, one tap away (P3-R). */}
      <footer className="mt-8 border-t border-border-subtle pt-4">
        <Button type="button" variant="ghost" size="sm" onClick={() => setCreditsOpen(true)}>
          Photo credits
        </Button>
        <p className="nut-note">
          Food photographs are real photographs from Wikimedia Commons, used under free
          licences — each one credited to its photographer.
        </p>
      </footer>

      <PhotoCreditsSheet open={creditsOpen} onClose={() => setCreditsOpen(false)} />

      <AddFoodSheet
        open={sheet.open}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        day={day}
        editing={sheet.editing}
        initialMeal={sheet.meal}
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
