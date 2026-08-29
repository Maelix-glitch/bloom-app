/**
 * TodaySurface — logging that takes seconds, not a medical form. The first
 * view asks one question ("What would you like to log today?") and offers
 * flow and mood as calm pills; "More details" expands energy, sleep,
 * temperature, an LH result, symptoms and a note — inline, never a modal.
 * Every pill selection persists immediately through the page's real save
 * path (merged with whatever is already on the day — nothing is clobbered)
 * and answers with a quiet "Saving… / Saved" indicator, not a toast. When
 * the user is inspecting another date, the surface follows the selection.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { CycleEntry, CycleModel, FlowValue, MoodValue } from "@/lib/cycle/types";
import { fmtShort } from "@/lib/cycle/engine";
import { PHASE_COLOR } from "@/lib/cycle/palette";
import type { PhaseKey } from "@/lib/cycle/types";

const FLOWS: { v: FlowValue; label: string }[] = [
  { v: "none", label: "No flow" },
  { v: "spotting", label: "Spotting" },
  { v: "light", label: "Light" },
  { v: "medium", label: "Medium" },
  { v: "heavy", label: "Heavy" },
];
const MOODS: MoodValue[] = ["Low", "Flat", "Okay", "Good", "Energized"];
const SYMPTOMS = [
  "Cramps",
  "Headache",
  "Fatigue",
  "Bloating",
  "Cravings",
  "Tender breasts",
  "Acne",
  "Mood swings",
];

export type TodayPatch = {
  flow?: FlowValue | null;
  mood?: MoodValue | null;
  energy?: number | null;
  sleep_hours?: number | null;
  temperature?: number | null;
  lh_test?: "negative" | "positive" | null;
  symptoms?: string[];
  notes?: string;
};

export function TodaySurface({
  model,
  date,
  entry,
  disabled,
  onPatch,
  onOpenFull,
  className,
}: {
  model: CycleModel | null;
  date: string;
  entry: CycleEntry | null;
  disabled?: boolean;
  onPatch: (patch: TodayPatch) => Promise<void>;
  onOpenFull: () => void;
  className?: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [more, setMore] = useState(false);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const savedTimer = useRef<number | null>(null);
  const firstEntry = useRef(true);

  // reflect date/entry changes (e.g. returning to today) without clobbering typing
  useEffect(() => {
    if (firstEntry.current) {
      firstEntry.current = false;
      return;
    }
    setNotes(entry?.notes ?? "");
  }, [date, entry?.notes]);

  const save = async (patch: TodayPatch) => {
    if (disabled) return;
    setStatus("saving");
    try {
      await onPatch(patch);
      setStatus("saved");
      if (savedTimer.current) window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setStatus("idle"), 2200);
    } catch {
      setStatus("idle"); // the route surfaces the failure itself
    }
  };

  const toggle = <T,>(cur: T | null, v: T): T | null => (cur === v ? null : v);
  const dayNum = model?.currentDay && model.lastPeriodStart ? dayFor(model, date) : null;
  const phase = dayNum ? model!.dayPhase(dayNum) : null;
  const isToday = date === (model?.today ?? "");

  return (
    <section
      className={cn("cy-today", className)}
      aria-label={`Log what today was like — ${fmtShort(date)}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="cy-eyebrow flex items-center gap-2">
          {isToday ? "Today" : "Selected day"}
          <span className="text-muted-foreground normal-case tracking-[0.02em]">
            {fmtShort(date)}
          </span>
          {dayNum ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground normal-case tracking-[0.02em]">
              <span
                className="size-[7px] rounded-full"
                style={{ background: phase ? PHASE_COLOR[phase as PhaseKey] : "var(--faint)" }}
                aria-hidden
              />
              {isToday ? "cycle day" : "day"} {dayNum}
            </span>
          ) : null}
        </p>
        <span className="cy-saved" data-on={status !== "idle" ? "1" : "0"} aria-live="polite">
          {status === "saving" ? "saving…" : "saved just now"}
        </span>
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          className="cy-link ml-auto no-underline"
        >
          {more ? "less" : "More details"}
          <ChevronDown
            className={cn(
              "ml-1 inline size-3 align-[-2px] transition-transform duration-[var(--cy-med)]",
              more && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </div>

      <p className="cy-title mt-1 text-[15px] text-muted-foreground">
        What would you like to log today?
      </p>

      <div
        className="mt-3 flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Flow today"
      >
        <span className="mono mr-1 text-[9px] uppercase tracking-[0.08em] text-faint">flow</span>
        {FLOWS.map((f) => (
          <button
            key={f.v}
            type="button"
            disabled={disabled}
            aria-pressed={entry?.flow === f.v}
            onClick={() => save({ flow: toggle(entry?.flow ?? null, f.v) })}
            className="cy-pill"
          >
            {f.label}
          </button>
        ))}
        <span className="mono mr-1 text-[9px] uppercase tracking-[0.08em] text-faint">mood</span>
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            aria-pressed={entry?.mood === m}
            onClick={() => save({ mood: toggle(entry?.mood ?? null, m) })}
            className="cy-pill"
          >
            {m}
          </button>
        ))}
      </div>

      {more ? (
        <div className="cy-focus-in mt-3.5 grid gap-4 border-t border-[var(--cycle-hair)] pt-3.5 md:grid-cols-2">
          <div>
            <p className="mono mb-1.5 text-[9px] uppercase tracking-[0.08em] text-faint">
              energy · 1 to 5
            </p>
            <div className="flex gap-1.5" role="group" aria-label="Energy today, 1 to 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  aria-pressed={(entry?.energy ?? 0) >= n}
                  aria-label={`Energy ${n} of 5`}
                  onClick={() => save({ energy: entry?.energy === n ? null : n })}
                  className={cn(
                    "cy-pill min-h-[30px] !px-0 w-9 justify-center",
                    (entry?.energy ?? 0) >= n && "!text-foreground",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mono mt-3 mb-1.5 text-[9px] uppercase tracking-[0.08em] text-faint">
              sleep · hours
            </p>
            <input
              type="number"
              min={0}
              max={14}
              step={0.5}
              defaultValue={entry?.sleep_hours ?? ""}
              disabled={disabled}
              aria-label="Hours of sleep"
              onBlur={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                if (v === null || (Number.isFinite(v) && v >= 0 && v <= 14))
                  save({ sleep_hours: v });
              }}
              className="w-24 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[13px] text-foreground transition-colors focus:border-[var(--border-strong)] focus:outline-none"
            />
            <p className="mono mt-3 mb-1.5 text-[9px] uppercase tracking-[0.08em] text-faint">
              temperature · °C, only if measured
            </p>
            <input
              type="number"
              min={35}
              max={38.5}
              step={0.01}
              defaultValue={entry?.temperature ?? ""}
              disabled={disabled}
              aria-label="Basal temperature in Celsius"
              onBlur={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                if (v === null || (Number.isFinite(v) && v >= 35 && v <= 38.5))
                  save({ temperature: v });
              }}
              className="w-24 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[13px] text-foreground transition-colors focus:border-[var(--border-strong)] focus:outline-none"
            />
            <p className="mono mt-3 mb-1.5 text-[9px] uppercase tracking-[0.08em] text-faint">
              lh test, if you took one
            </p>
            <div className="flex gap-1.5">
              {(["negative", "positive"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={disabled}
                  aria-pressed={entry?.lh_test === v}
                  onClick={() => save({ lh_test: toggle(entry?.lh_test ?? null, v) })}
                  className="cy-pill"
                >
                  {v === "positive" ? "positive — surge" : "negative"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mono mb-1.5 text-[9px] uppercase tracking-[0.08em] text-faint">
              symptoms, tap any that fit
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Symptoms today">
              {SYMPTOMS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  aria-pressed={(entry?.symptoms ?? []).includes(s)}
                  onClick={() => {
                    const cur = entry?.symptoms ?? [];
                    save({ symptoms: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
                  }}
                  className="cy-pill"
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="mono mt-3 mb-1.5 text-[9px] uppercase tracking-[0.08em] text-faint">
              a note, if you want one
            </p>
            <textarea
              rows={3}
              value={notes}
              disabled={disabled}
              placeholder="Anything worth remembering about today…"
              aria-label="Note for this day"
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== (entry?.notes ?? "") && save({ notes })}
              className="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-[12.5px] leading-relaxed text-foreground placeholder:text-faint focus:border-[var(--border-strong)] focus:outline-none"
            />
            <button type="button" onClick={onOpenFull} className="cy-link mt-2">
              or open the full log →
            </button>
          </div>
        </div>
      ) : null}

      <p className="mono mt-2 text-[8.5px] uppercase tracking-[0.09em] text-faint">
        one tap saves · tap again to clear · everything else on this day stays untouched
      </p>
    </section>
  );
}

function dayFor(model: CycleModel, date: string): number {
  if (!model.lastPeriodStart) return 0;
  const d = new Date(`${date}T00:00:00`).getTime();
  const s = new Date(`${model.lastPeriodStart}T00:00:00`).getTime();
  return Math.floor((d - s) / 86_400_000) + 1;
}
