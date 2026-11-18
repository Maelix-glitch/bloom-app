/**
 * FoodCaptureSheet — Food Capture in the Nutrition tab (SYSTEM 7).
 *
 * A meal photo becomes a log entry here, through the same honest
 * pipeline the Coach uses — never a second vision system:
 *
 *   pick a photo → Coach's vision reads it (lib/capture/analyse, a
 *   thin wrapper over the Coach edge invocation) → the estimate is
 *   shown exactly as returned, labelled an estimate → the user
 *   confirms or edits it → only then is anything written, through the
 *   estimate-entry path (lib/capture/log).
 *
 * The flow is driven by the capture session machine (lib/capture/
 * session): this sheet renders states and dispatches events, and the
 * machine is what guarantees nothing can be confirmed before an
 * estimate exists — the sheet creates nothing on open, on render, on
 * analysis, or on close. Discarding drops the estimate with the
 * session. A failed analysis says so plainly, with the reason, and
 * stores nothing.
 *
 * The shell is the Nutrition dialog shell — the mobile sheet rule:
 * capped at 88dvh on a solid surface, the page still visible above,
 * never a full-screen takeover.
 */

import { useEffect, useReducer, useRef, useState } from "react";
import { Camera, Check, ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { analyseCapturePhoto } from "@/lib/capture/analyse";
import { logCaptureEstimate } from "@/lib/capture/log";
import {
  canConfirm,
  captureReducer,
  initialCaptureState,
  type CaptureFailureReason,
} from "@/lib/capture/session";
import { COACH_ESTIMATE_LABEL } from "@/lib/nutrition/entries";
import { mealForTimeOfDay, parseEditedTotals } from "@/lib/nutrition/coachLog";
import { MEALS, type Meal } from "@/lib/nutrition/types";

import { MEAL_LABEL } from "./input";

/** Honest copy per failure reason — what happened, and the one fact
 *  that matters in every case: nothing was logged. Billing refusals
 *  get no retry (the machine marks them non-retryable), so their copy
 *  points at the real blocker instead. */
const FAILURE_COPY: Record<CaptureFailureReason, string> = {
  unreadable_photo: "Bloom couldn't read that photo file. Try a different one — nothing was logged.",
  no_estimate:
    "Coach looked at the photo but couldn't give a usable estimate for it, so nothing was logged. A clearer photo of the dish can help.",
  unconfigured: "Coach isn't connected right now, so the photo couldn't be analysed. Nothing was logged.",
  timeout: "The analysis took too long and was given up on. Nothing was logged — you can try again.",
  error: "Coach couldn't analyse that photo just now. Nothing was logged — you can try again.",
  aborted: "The analysis was stopped. Nothing was logged.",
  insufficient_credits:
    "You're out of AI credits, so photo estimates are paused for now. Nothing was logged.",
  premium_required:
    "Food-photo estimates are a Premium feature, so this photo wasn't analysed. Nothing was logged.",
};

const SAVE_ERROR_COPY =
  "Bloom couldn't log that — the numbers may be beyond what one meal can carry. Try a smaller portion.";

export function FoodCaptureSheet({
  open,
  onClose,
  day,
}: {
  open: boolean;
  onClose: () => void;
  /** The local day the confirmed entry lands on (the day being viewed). */
  day: string;
}) {
  const [state, dispatch] = useReducer(captureReducer, initialCaptureState);
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* The confirm form — seeded from the estimate the moment one is
     ready, so what the user sees first is digit-for-digit what the
     analysis returned. */
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [meal, setMeal] = useState<Meal>("lunch");

  const clearPhoto = () => {
    fileRef.current = null;
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  /* Every open starts a fresh session; closing abandons any in-flight
     analysis rather than letting it land in a closed sheet. */
  useEffect(() => {
    if (open) {
      dispatch({ type: "RESET" });
      clearPhoto();
      return;
    }
    abortRef.current?.abort();
    abortRef.current = null;
  }, [open ]);

  useEffect(() => () => abortRef.current?.abort(), []);

  /* Seed on the estimate's identity, not on the state object: a
     LOG_FAILED spreads the state to add its saveError, and re-seeding
     then would wipe the numbers the user just edited. The estimate
     object itself only changes when a new analysis lands. */
  const readyEstimate = state.status === "estimateReady" ? state.estimate : null;
  useEffect(() => {
    if (!readyEstimate) return;
    setName(readyEstimate.name);
    setKcal(String(readyEstimate.totals.kcal));
    setProteinG(String(readyEstimate.totals.proteinG));
    setCarbsG(String(readyEstimate.totals.carbsG));
    setFatG(String(readyEstimate.totals.fatG));
    setMeal(mealForTimeOfDay());
  }, [readyEstimate]);

  if (!open) return null;

  const choosePhoto = (file: File | undefined) => {
    if (!file) return;
    fileRef.current = file;
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return URL.createObjectURL(file);
    });
    dispatch({ type: "PHOTO_CHOSEN", photoName: file.name });
  };

  const analyse = async () => {
    const file = fileRef.current;
    if (!file) return;
    dispatch({ type: "ANALYSIS_STARTED" });
    const controller = new AbortController();
    abortRef.current = controller;
    const result = await analyseCapturePhoto(file, controller.signal);
    if (controller.signal.aborted) return;
    if (abortRef.current === controller) abortRef.current = null;
    dispatch(
      result.ok
        ? { type: "ANALYSIS_SUCCEEDED", estimate: result.estimate }
        : { type: "ANALYSIS_FAILED", reason: result.reason },
    );
  };

  const totals = parseEditedTotals({ kcal, proteinG, carbsG, fatG });
  const nameOk = name.trim().length > 0;
  const confirmReady = canConfirm(state) && totals !== null && nameOk;

  const confirm = () => {
    if (!confirmReady || !totals) return;
    const entry = logCaptureEstimate({
      name: name.trim(),
      totals,
      meal,
      day,
      now: new Date().toISOString(),
    });
    if (!entry) {
      dispatch({ type: "LOG_FAILED", message: SAVE_ERROR_COPY });
      return;
    }
    dispatch({ type: "CONFIRMED", entryId: entry.id });
  };

  const discard = () => {
    clearPhoto();
    dispatch({ type: "DISCARDED" });
  };

  return (
    <div
      className="nut-dialog-backdrop nut-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log a meal from a photo"
        className="nut-dialog-panel nut-pop"
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5 sm:px-7">
          <div>
            <p className="eyebrow">Nutrition</p>
            <h2 className="mt-1.5 font-display text-[28px] leading-tight text-foreground">
              Log from a photo
            </h2>
          </div>
          <button type="button" className="nut-icon-btn" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="nut-dialog-scroll px-5 pb-6 pt-2 sm:px-7">
          <p className="text-[length:var(--text-callout)] leading-[var(--leading-body)] text-muted-foreground">
            <span className="font-medium text-foreground">{COACH_ESTIMATE_LABEL}</span> — Coach
            reads the photo and estimates the portion. You check the numbers and confirm before
            anything is logged; it stays labelled an estimate in your log.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Choose a meal photo"
            onChange={(e) => choosePhoto(e.target.files?.[0])}
          />

          {state.status === "done" ? (
            <div className="mt-6 text-center">
              <Check className="mx-auto size-6 text-[var(--gold)]" aria-hidden />
              <p className="mt-3 font-display text-[length:var(--text-title)] text-foreground">
                Logged as an estimate
              </p>
              <p className="mx-auto mt-1.5 max-w-[46ch] text-[length:var(--text-callout)] leading-[var(--leading-body)] text-muted-foreground">
                It is in this day's log with its estimate label attached — you can edit or remove
                it there like any entry.
              </p>
              <Button type="button" className="mt-5" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <>
              {previewUrl ? (
                <div className="mt-5">
                  <img
                    src={previewUrl}
                    alt="Your meal photo"
                    className="max-h-56 w-full rounded-[var(--radius-control)] object-cover"
                  />
                  <p className="mt-2 truncate text-[length:var(--text-caption)] text-muted-foreground">
                    {"photoName" in state ? state.photoName : null}
                  </p>
                </div>
              ) : null}

              {state.status === "idle" || state.status === "photoChosen" ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => inputRef.current?.click()}>
                    <ImagePlus className="size-4" aria-hidden />
                    {state.status === "photoChosen" ? "Choose a different photo" : "Choose a photo"}
                  </Button>
                  {state.status === "photoChosen" ? (
                    <Button type="button" variant="secondary" onClick={() => void analyse()}>
                      <Camera className="size-4" aria-hidden /> Analyse photo
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {state.status === "analysing" ? (
                <p
                  className="mt-6 text-[length:var(--text-callout)] text-muted-foreground"
                  aria-live="polite"
                >
                  Coach is reading your photo — naming the dish first, then estimating the
                  portion…
                </p>
              ) : null}

              {state.status === "error" ? (
                <div className="mt-5">
                  <p role="alert" className="text-[length:var(--text-callout)] text-foreground">
                    {FAILURE_COPY[state.reason]}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {state.retryable && state.photoName !== null ? (
                      <Button type="button" onClick={() => void analyse()}>
                        Try again
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => inputRef.current?.click()}
                    >
                      <ImagePlus className="size-4" aria-hidden /> Choose a different photo
                    </Button>
                  </div>
                </div>
              ) : null}

              {state.status === "estimateReady" ? (
                <div className="mt-5">
                  <div>
                    <label
                      className="text-[length:var(--text-caption)] font-medium text-muted-foreground"
                      htmlFor="capture-name"
                    >
                      Name
                    </label>
                    <input
                      id="capture-name"
                      className="nut-grams-input mt-1 w-full"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="off"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(
                      [
                        ["capture-kcal", "kcal", kcal, setKcal],
                        ["capture-protein", "Protein (g)", proteinG, setProteinG],
                        ["capture-carbs", "Carbs (g)", carbsG, setCarbsG],
                        ["capture-fat", "Fat (g)", fatG, setFatG],
                      ] as const
                    ).map(([id, label, value, set]) => (
                      <div key={id}>
                        <label
                          className="text-[length:var(--text-caption)] font-medium text-muted-foreground"
                          htmlFor={id}
                        >
                          {label}
                        </label>
                        <input
                          id={id}
                          className="nut-grams-input mt-1 w-full"
                          type="text"
                          inputMode="decimal"
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    ))}
                  </div>

                  <p
                    className="mt-3 text-[length:var(--text-callout)] text-muted-foreground"
                    aria-live="polite"
                  >
                    {totals
                      ? `≈ ${totals.kcal} kcal · ${totals.proteinG} g protein · ${totals.carbsG} g carbs · ${totals.fatG} g fat`
                      : "Numbers need to be plain values — kcal above zero, each macro zero or more."}
                  </p>

                  <div className="mt-4">
                    <span
                      className="text-[length:var(--text-caption)] font-medium text-muted-foreground"
                      id="capture-meal-label"
                    >
                      Meal
                    </span>
                    <div
                      className="mt-2 flex flex-wrap gap-2"
                      role="group"
                      aria-labelledby="capture-meal-label"
                    >
                      {MEALS.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="nut-chip"
                          data-selected={meal === m || undefined}
                          aria-pressed={meal === m}
                          onClick={() => setMeal(m)}
                        >
                          {MEAL_LABEL[m]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {state.saveError ? (
                    <p role="alert" className="mt-3 text-[length:var(--text-callout)] text-foreground">
                      {state.saveError}
                    </p>
                  ) : null}

                  <div className="mt-6 flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={discard}>
                      Discard
                    </Button>
                    <Button type="button" onClick={confirm} disabled={!confirmReady}>
                      Log it
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
