import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { todayLocal } from "@/lib/localDay";
import { COACH_ESTIMATE_LABEL } from "@/lib/nutrition/entries";
import {
  logCoachEstimate,
  mealForTimeOfDay,
  parseEditedTotals,
  type CoachPhotoEstimate,
} from "@/lib/nutrition/coachLog";
import { MEALS, type Meal } from "@/lib/nutrition/types";
import { cn } from "@/lib/utils";

import { CoachSheet } from "./CoachSheet";

const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/**
 * The "Log this" confirm sheet (W4-3 N5, design §4.4).
 *
 * Coach proposed; this sheet is where the user disposes. It opens
 * pre-filled with exactly what Coach said — the recorded dish name and
 * the ≈ totals, digit for digit — and every field is editable, because
 * the user may know the portion better than the photo shows. Edits are
 * the user's own numbers, but the entry they land in is still the
 * estimate entry: labelled an estimate forever, never a sourced food.
 * Confirm is the only write, and it goes through the lib's estimate
 * path — this sheet creates nothing on open, on render, or on close.
 */
export function CoachLogSheet({
  open,
  onClose,
  messageId,
  estimate,
}: {
  open: boolean;
  onClose: () => void;
  messageId: string;
  estimate: CoachPhotoEstimate;
}) {
  const [name, setName] = useState(estimate.name);
  const [kcal, setKcal] = useState(String(estimate.totals.kcal));
  const [proteinG, setProteinG] = useState(String(estimate.totals.proteinG));
  const [carbsG, setCarbsG] = useState(String(estimate.totals.carbsG));
  const [fatG, setFatG] = useState(String(estimate.totals.fatG));
  const [meal, setMeal] = useState<Meal>(() => mealForTimeOfDay());
  const [saveError, setSaveError] = useState<string | null>(null);

  /* Every open starts from the estimate as Coach stated it — a
     half-edited sheet from an earlier open never leaks into this one. */
  useEffect(() => {
    if (!open) return;
    setName(estimate.name);
    setKcal(String(estimate.totals.kcal));
    setProteinG(String(estimate.totals.proteinG));
    setCarbsG(String(estimate.totals.carbsG));
    setFatG(String(estimate.totals.fatG));
    setMeal(mealForTimeOfDay());
    setSaveError(null);
  }, [open, estimate]);

  const totals = parseEditedTotals({ kcal, proteinG, carbsG, fatG });
  const nameOk = name.trim().length > 0;
  const canConfirm = totals !== null && nameOk;

  const confirm = () => {
    if (!totals || !nameOk) return;
    const entry = logCoachEstimate({
      messageId,
      name: name.trim(),
      totals,
      meal,
      day: todayLocal(),
      now: new Date().toISOString(),
    });
    if (!entry) {
      setSaveError(
        "Bloom couldn't log that — the numbers may be beyond what one meal can carry. Try a smaller portion.",
      );
      return;
    }
    onClose();
  };

  return (
    <CoachSheet open={open} onClose={onClose} title="Log this meal">
      <div className="coach-log-form">
        <p className="coach-log-note">
          <span className="coach-log-note-label">{COACH_ESTIMATE_LABEL}</span>
          Bloom estimated this from your photo. Check the numbers and change
          anything that looks off — it stays labelled an estimate in your log.
        </p>

        <div className="coach-log-field">
          <label className="coach-log-label" htmlFor="coach-log-name">
            Name
          </label>
          <input
            id="coach-log-name"
            className="coach-log-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="coach-log-grid">
          <div className="coach-log-field">
            <label className="coach-log-label" htmlFor="coach-log-kcal">
              kcal
            </label>
            <input
              id="coach-log-kcal"
              className="coach-log-input"
              type="text"
              inputMode="decimal"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="coach-log-field">
            <label className="coach-log-label" htmlFor="coach-log-protein">
              Protein (g)
            </label>
            <input
              id="coach-log-protein"
              className="coach-log-input"
              type="text"
              inputMode="decimal"
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="coach-log-field">
            <label className="coach-log-label" htmlFor="coach-log-carbs">
              Carbs (g)
            </label>
            <input
              id="coach-log-carbs"
              className="coach-log-input"
              type="text"
              inputMode="decimal"
              value={carbsG}
              onChange={(e) => setCarbsG(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="coach-log-field">
            <label className="coach-log-label" htmlFor="coach-log-fat">
              Fat (g)
            </label>
            <input
              id="coach-log-fat"
              className="coach-log-input"
              type="text"
              inputMode="decimal"
              value={fatG}
              onChange={(e) => setFatG(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <p className="coach-log-parse" aria-live="polite">
          {totals
            ? `≈ ${totals.kcal} kcal · ${totals.proteinG} g protein · ${totals.carbsG} g carbs · ${totals.fatG} g fat`
            : "Numbers need to be plain values — kcal above zero, protein, carbs and fat zero or more."}
        </p>

        <div className="coach-log-field">
          <span className="coach-log-label" id="coach-log-meal-label">
            Meal
          </span>
          <div className="coach-log-meals" role="group" aria-labelledby="coach-log-meal-label">
            {MEALS.map((m) => (
              <button
                key={m}
                type="button"
                className={cn("coach-log-chip", meal === m && "is-on")}
                aria-pressed={meal === m}
                onClick={() => setMeal(m)}
              >
                {MEAL_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        {saveError ? (
          <p className="coach-log-error" role="alert">
            {saveError}
          </p>
        ) : null}

        <div className="coach-log-confirm-row">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={!canConfirm}>
            Log it
          </Button>
        </div>
      </div>
    </CoachSheet>
  );
}
