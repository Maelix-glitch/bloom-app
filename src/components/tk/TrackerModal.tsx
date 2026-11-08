/**
 * The logging modal — one number, one category.
 *
 * The dashboard is a reading surface: the compass and six territories,
 * nothing that can be typed into. Everything that writes happens here, in
 * a panel that mounts only when a territory is opened and unmounts the
 * moment it closes.
 *
 * The field takes the *total* for the category, not an increment — you type
 * 1750 for water because that's what you've drunk, not +250 on top of
 * something you have to remember.
 *
 * Sleep, study and movement let the person pick hours or minutes — typing 8
 * hours beats typing 480 minutes. The store always keeps minutes; the switch
 * only changes what the field shows and accepts.
 *
 * The store is passed in rather than created here: useTrackers holds its own
 * state per instance, so a fresh one inside the modal would write to a copy
 * the compass never sees.
 *
 * U6: the panel is BloomSheet (the one overlay pattern, plan §2.4) with the
 * kit Input and Button inside it. It used to be a hand-rolled portal whose
 * box, curtain and save pill were set inline — including a neon
 * pink-to-violet gradient on Save that belonged to no other screen in the
 * app. All of that is gone; the sheet's chrome and the kit carry it now.
 */

import { useEffect, useRef, useState } from "react";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TrackerStore } from "@/hooks/useTrackers";
import { usualDay } from "@/lib/smart/usual";
import { trackerDef, type TrackerId } from "@/lib/trackers/core";

import { readTrackerValue, setTrackerValue } from "./shared";

/** The word under the field, so nobody has to guess what the number means. */
const PROMPT: Record<TrackerId, string> = {
  sleep: "Enter total minutes slept",
  water: "Enter total millilitres",
  study: "Enter total minutes studied",
  movement: "Enter total minutes moved",
  energy: "Enter energy out of five",
  screen: "Enter total minutes on screen",
};

/** The hours wording, for the three trackers with a unit switch. */
const PROMPT_HRS: Partial<Record<TrackerId, string>> = {
  sleep: "Enter total hours slept",
  study: "Enter total hours studied",
  movement: "Enter total hours moved",
};

/** The three durations stored in minutes but typed either way. */
const UNIT_CHOICE: TrackerId[] = ["sleep", "study", "movement"];

type Unit = "min" | "hrs";

/** Sleep and study open in hours, movement in minutes — one tap flips either. */
const defaultUnit = (id: TrackerId): Unit => (id === "movement" ? "min" : "hrs");

/** 2dp arithmetic, printed without trailing zeros ("8", "1.5", never "8.00"). */
const stripNum = (v: number): string => String(Math.round(v * 100) / 100);

export function TrackerModal({
  store,
  tracker,
  onClose,
  onSaved,
}: {
  store: TrackerStore;
  tracker: TrackerId | null;
  onClose: () => void;
  onSaved?: (id: TrackerId) => void;
}) {
  const [draft, setDraft] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit>("min");
  const inputRef = useRef<HTMLInputElement>(null);

  const def = tracker ? trackerDef(tracker) : null;
  const hasChoice = tracker !== null && UNIT_CHOICE.includes(tracker);
  const prompt =
    unit === "hrs" && tracker && PROMPT_HRS[tracker]
      ? PROMPT_HRS[tracker]!
      : tracker
        ? PROMPT[tracker]
        : "";

  /* Their own recent pattern — offered, never imposed (see smart/usual.ts). */
  const usualDay_ = tracker ? usualDay(store.days, store.today) : null;
  const usualValue = (() => {
    if (!tracker || !usualDay_) return null;
    switch (tracker) {
      case "sleep":
        return usualDay_.sleep?.value.minutes ?? null;
      case "water":
        return usualDay_.water?.value ?? null;
      case "study":
        return usualDay_.study?.value.minutes ?? null;
      case "movement":
        return usualDay_.movement?.value ?? null;
      case "energy":
        return usualDay_.energy?.value ?? null;
      default:
        return usualDay_.screen?.value ?? null;
    }
  })();
  const usualSamples = (() => {
    if (!tracker || !usualDay_) return 0;
    switch (tracker) {
      case "sleep":
        return usualDay_.sleep?.samples ?? 0;
      case "water":
        return usualDay_.water?.samples ?? 0;
      case "study":
        return usualDay_.study?.samples ?? 0;
      case "movement":
        return usualDay_.movement?.samples ?? 0;
      case "energy":
        return usualDay_.energy?.samples ?? 0;
      default:
        return usualDay_.screen?.samples ?? 0;
    }
  })();
  const todayValue = tracker ? readTrackerValue(store, tracker) : null;
  const usualEmpty = todayValue === null || todayValue === 0;
  const usualDraft =
    usualValue !== null
      ? hasChoice && unit === "hrs"
        ? stripNum(usualValue / 60)
        : String(usualValue)
      : "";

  /* start from what's already logged, so the field is a correction not a blank */
  useEffect(() => {
    if (!tracker) return;
    const choice = UNIT_CHOICE.includes(tracker);
    const startUnit = defaultUnit(tracker);
    setUnit(choice ? startUnit : "min");
    const current = readTrackerValue(store, tracker);
    if (current == null || current === 0) {
      setDraft("");
    } else {
      setDraft(choice && startUnit === "hrs" ? stripNum(current / 60) : String(current));
    }
    setError(null);
  }, [tracker, store.days, store.today]);

  /* focus lands in the field so typing works straight away (escape and the
     focus trap are BloomSheet's — Radix carries them) */
  useEffect(() => {
    if (!tracker) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [tracker]);

  if (!tracker || !def) return null;

  /** Flipping the switch converts what's typed — nothing is ever lost. */
  const switchUnit = (next: Unit) => {
    if (next === unit) return;
    const cur = Number(draft);
    if (draft.trim() !== "" && Number.isFinite(cur)) {
      const stored = unit === "hrs" ? cur * 60 : cur;
      setDraft(stripNum(next === "hrs" ? stored / 60 : stored));
    }
    setError(null);
    setUnit(next);
  };

  const commit = (value: string) => {
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isFinite(parsed) || parsed < 0) {
      setError("Type a number first.");
      return;
    }
    const stored = hasChoice && unit === "hrs" ? Math.round(parsed * 60) : parsed;
    const message = setTrackerValue(store, tracker, stored);
    if (message) {
      setError(message);
      return;
    }
    onSaved?.(tracker);
    onClose();
  };

  return (
    /* Geometry (polish slice): the family's default sheet, not the centred
       pop — a centred card on desktop, a bottom sheet with the grab handle
       on phones. The tk2-log-* classes in trackers.css narrow the card to
       a form's width and make the panel solid: the sheet family's glass
       let the compass ghost through and read as dialog content. */
    <BloomSheet
      open
      onClose={onClose}
      title={`Log ${def.name}`}
      description={prompt}
      className="tk2-log-sheet"
      panelClassName="tk2-log-panel"
    >
      <div className="relative px-5 pb-5 pt-5">
        {/* The sheet family's visible way out — the same round × the mood
            composer and the snapshot sheet carry. Escape and the backdrop
            already closed this pop, but on desktop nothing on screen said
            so; closing here only dismisses, it never saves. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="bsheet-icon absolute right-0 top-0"
        >
          <BloomIcon name="close" size={16} />
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Log {def.name}
        </p>
        <p className="mt-2 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Target · {def.format(store.goals[def.goalKey])}
        </p>

        {usualValue !== null && usualEmpty && tracker !== "energy" ? (
          <Button
            type="button"
            variant="secondary"
            className="mt-4 w-full justify-between"
            onClick={() => {
              setError(null);
              setDraft(usualDraft);
              window.setTimeout(() => inputRef.current?.focus(), 30);
            }}
            title={`Your usual ${def.name.toLowerCase()} — from your last ${usualSamples} logs. Tap to fill, then adjust.`}
          >
            <span>Your usual · {def.format(usualValue)}</span>
            <span className="font-normal opacity-60">from {usualSamples} logs · tap to use</span>
          </Button>
        ) : null}

        {hasChoice ? (
          <div
            className="mt-3 flex justify-center gap-2"
            role="group"
            aria-label="Hours or minutes"
          >
            {(["hrs", "min"] as const).map((u) => (
              <Button
                key={u}
                type="button"
                size="sm"
                variant={unit === u ? "default" : "outline"}
                aria-pressed={unit === u}
                onClick={() => switchUnit(u)}
                className="rounded-full px-[18px] text-xs font-bold uppercase tracking-[0.08em]"
              >
                {u === "hrs" ? "Hours" : "Min"}
              </Button>
            ))}
          </div>
        ) : null}

        {tracker === "energy" ? (
          <div className="tk2-numbers mt-4" role="group" aria-label="Energy out of five">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="tk2-number"
                data-active={Number(draft) === n ? "true" : "false"}
                data-usual={
                  usualValue !== null && usualEmpty && usualValue === n ? "true" : undefined
                }
                aria-pressed={Number(draft) === n}
                title={
                  usualValue !== null && usualEmpty && usualValue === n ? "Your usual" : undefined
                }
                onClick={() => {
                  setError(null);
                  setDraft(String(n));
                }}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}

        {usualValue !== null && usualEmpty && tracker === "energy" ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Usually a {usualValue} — from your last {usualSamples} logs.
          </p>
        ) : null}

        <Input
          ref={inputRef}
          type="number"
          inputMode={unit === "hrs" ? "decimal" : "numeric"}
          min={0}
          max={hasChoice && unit === "hrs" ? stripNum(def.max / 60) : def.max}
          step="any"
          placeholder="0"
          aria-label={prompt}
          value={draft}
          onChange={(event) => {
            setError(null);
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit(draft);
          }}
          className="mt-4 h-[60px] text-center font-mono text-[28px] font-light"
        />
        <p className="mt-2 text-center text-xs text-muted-foreground">{prompt}</p>

        {error ? (
          <p className="mt-3 text-center text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="button" size="lg" className="mt-5 w-full" onClick={() => commit(draft)}>
          Save &amp; close
        </Button>
      </div>
    </BloomSheet>
  );
}
