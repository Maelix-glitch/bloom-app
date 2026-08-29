/**
 * TodaySurface — the tray docked beneath the hero statement. "Today — how
 * are you feeling?" with the three fast fields exposed (flow, mood, a
 * five-level energy selector) as tactile pills: selected states carry a
 * dot as well as color, unselected stay quiet. Taps save inline through the
 * real persistence path — merged with whatever already sits on that day —
 * and answer with a small "saving / saved just now", never a modal or a
 * toast. "More details" unfolds sleep, temperature, symptoms, mucus, an LH
 * result, pain and a note; the full grouped workspace stays one click away.
 * When the page is inspecting another date, the tray follows it.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";

import { GROW, TAP } from "@/lib/cycle/motion";

import { cn } from "@/lib/utils";
import type { CycleEntry, CycleModel, FlowValue, MoodValue } from "@/lib/cycle/types";
import { diffDays, fmtShort } from "@/lib/cycle/engine";
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
const MUCUS = [
  { v: "dry", label: "Dry" },
  { v: "sticky", label: "Sticky" },
  { v: "creamy", label: "Creamy" },
  { v: "watery", label: "Watery" },
  { v: "egg-white", label: "Egg-white" },
] as const;

export type TodayPatch = {
  flow?: FlowValue | null;
  mood?: MoodValue | null;
  energy?: number | null;
  sleep_hours?: number | null;
  temperature?: number | null;
  pain?: number | null;
  cervical_mucus?: string | null;
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
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
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
      savedTimer.current = window.setTimeout(() => setStatus("idle"), 2400);
    } catch {
      setStatus("idle");
    }
  };

  const toggle = <T,>(cur: T | null, v: T): T | null => (cur === v ? null : v);
  const dayNum = model?.currentDay && model.lastPeriodStart ? dayFor(model, date) : null;
  const isToday = date === (model?.today ?? "");
  const phase = isToday
    ? (model?.currentPhase ?? model?.currentReproductivePhase ?? null)
    : dayNum && model
      ? model.reproductivePhaseFor(dayNum)
      : null;

  return (
    <section
      className={cn("cy-tray", className)}
      aria-label={`${isToday ? "Today" : "Selected day"} — ${fmtShort(date)}${dayNum ? `, cycle day ${dayNum}` : ""}`}
    >
      <div className="cy-tray__head">
        <p className="cy-tray__title">
          {isToday ? "Today" : fmtShort(date)}
          <em> — how are you feeling?</em>
          {dayNum ? (
            <span className="ml-2.5 inline-flex items-center gap-1.5 align-[1px] text-[11.5px] not-italic text-faint">
              <span
                className="size-[7px] rounded-full"
                style={{ background: phase ? PHASE_COLOR[phase as PhaseKey] : "var(--faint)" }}
                aria-hidden
              />
              day {dayNum}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          className="cy-link"
        >
          {more ? "fewer fields" : "more details"}
          <ChevronDown
            className={cn(
              "ml-1 inline size-3 align-[-2px] transition-transform duration-[var(--cy-med)]",
              more && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <span
          className="cy-saved shrink-0"
          data-on={status !== "idle" ? "1" : "0"}
          aria-live="polite"
          style={{ marginLeft: status !== "idle" ? "auto" : 0 }}
        >
          {status === "saving" ? "saving…" : status === "saved" ? "saved just now" : ""}
        </span>
      </div>

      <div className="cy-fieldrow">
        <span className="cy-fieldlabel">flow</span>
        <div className="cy-pills" role="group" aria-label="Flow today">
          {FLOWS.map((f) => (
            <button
              key={f.v}
              type="button"
              disabled={disabled}
              aria-pressed={entry?.flow === f.v}
              onClick={() => save({ flow: toggle(entry?.flow ?? null, f.v) })}
              className="cy-pill"
              style={{ ["--pill-c" as never]: "var(--cycle-menstrual)" }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cy-fieldrow">
        <span className="cy-fieldlabel">mood</span>
        <div className="cy-pills" role="group" aria-label="Mood today">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              aria-pressed={entry?.mood === m}
              onClick={() => save({ mood: toggle(entry?.mood ?? null, m) })}
              className="cy-pill"
              style={{ ["--pill-c" as never]: "var(--cycle-accent)" }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="cy-fieldrow">
        <span className="cy-fieldlabel">energy</span>
        <div className="cy-levels" role="group" aria-label="Energy today, one to five">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={disabled}
              aria-pressed={(entry?.energy ?? 0) >= n}
              data-on={(entry?.energy ?? 0) >= n ? "1" : "0"}
              aria-label={`Energy ${n} of 5`}
              data-tip={`${n}/5 — ${["depleted", "low", "steady", "good", "bright"][n - 1]}`}
              onClick={() => save({ energy: entry?.energy === n ? null : n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {more ? (
          <motion.div
            key="more"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={GROW}
            style={{ overflow: "hidden" }}
            className="mt-1.5"
          >
            <div className="border-t border-[var(--cycle-hair)] pt-2">
              <div className="cy-fieldrow">
                <span className="cy-fieldlabel">sleep</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={14}
                    step={0.5}
                    defaultValue={entry?.sleep_hours ?? ""}
                    disabled={disabled}
                    aria-label="Hours of sleep"
                    data-tip="only what you actually slept — nothing filled in"
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      if (v === null || (Number.isFinite(v) && v >= 0 && v <= 14))
                        save({ sleep_hours: v });
                    }}
                    className="w-20 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[13px] text-foreground transition-colors focus:border-[var(--border-strong)] focus:outline-none"
                  />
                  <span className="text-[12px] text-faint">hours</span>
                  <span
                    className="mx-2.5 inline-block h-4 w-px bg-[var(--cycle-hair-strong)]"
                    aria-hidden
                  />
                  <span className="cy-fieldlabel !w-auto">pain</span>
                  <div className="flex gap-1" role="group" aria-label="Pain level, zero to five">
                    {[0, 1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={disabled}
                        aria-pressed={(entry?.pain_level ?? null) === n}
                        data-tip={n === 0 ? "none" : `${n}/5`}
                        aria-label={`Pain ${n} of 5`}
                        onClick={() => save({ pain: entry?.pain_level === n ? null : n })}
                        className={cn(
                          "size-[13px] rounded-full border transition-colors",
                          (entry?.pain_level ?? null) === n
                            ? "border-[color:var(--cycle-accent)] bg-[color:var(--cycle-accent)]"
                            : "border-[var(--border-strong)] hover:border-[color:var(--cycle-accent)]",
                          n === 0 && "rounded-[3px]",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="cy-fieldrow">
                <span className="cy-fieldlabel">temp</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={35}
                    max={38.5}
                    step={0.01}
                    defaultValue={entry?.temperature ?? ""}
                    disabled={disabled}
                    aria-label="Basal temperature in Celsius"
                    data-tip="°C, only if you measured — observations, not guesses"
                    onBlur={(e) => {
                      const v = e.target.value === "" ? null : Number(e.target.value);
                      if (v === null || (Number.isFinite(v) && v >= 35 && v <= 38.5))
                        save({ temperature: v });
                    }}
                    className="w-20 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-[13px] text-foreground transition-colors focus:border-[var(--border-strong)] focus:outline-none"
                  />
                  <span className="text-[12px] text-faint">°C measured</span>
                  <span
                    className="mx-2.5 inline-block h-4 w-px bg-[var(--cycle-hair-strong)]"
                    aria-hidden
                  />
                  <span className="cy-fieldlabel !w-auto">mucus</span>
                  <div className="cy-pills" role="group" aria-label="Cervical mucus today">
                    {MUCUS.map((m) => (
                      <button
                        key={m.v}
                        type="button"
                        disabled={disabled}
                        aria-pressed={(entry?.cervical_mucus ?? null) === m.v}
                        onClick={() =>
                          save({
                            cervical_mucus: toggle(
                              (entry?.cervical_mucus ?? null) as string | null,
                              m.v,
                            ),
                          })
                        }
                        className="cy-pill !min-h-[28px] !px-3 !text-[12px]"
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="cy-fieldrow">
                <span className="cy-fieldlabel">lh test</span>
                <div className="cy-pills" role="group" aria-label="LH test result">
                  {(["negative", "positive"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={disabled}
                      aria-pressed={entry?.lh_test === v}
                      onClick={() => save({ lh_test: toggle(entry?.lh_test ?? null, v) })}
                      className="cy-pill !min-h-[30px] !text-[12.5px]"
                      style={{ ["--pill-c" as never]: "var(--cycle-ovulation)" }}
                    >
                      {v === "positive" ? "positive — surge" : "negative"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cy-fieldrow">
                <span className="cy-fieldlabel">symptoms</span>
                <div className="cy-pills" role="group" aria-label="Symptoms today">
                  {SYMPTOMS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={disabled}
                      aria-pressed={(entry?.symptoms ?? []).includes(s)}
                      onClick={() => {
                        const cur = entry?.symptoms ?? [];
                        save({
                          symptoms: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
                        });
                      }}
                      className="cy-pill !min-h-[28px] !px-3 !text-[12px]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cy-fieldrow items-start">
                <span className="cy-fieldlabel pt-2">note</span>
                <textarea
                  rows={2}
                  value={notes}
                  disabled={disabled}
                  placeholder="Anything worth remembering about this day…"
                  aria-label="Note for this day"
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => notes !== (entry?.notes ?? "") && save({ notes })}
                  className="w-full resize-none rounded-lg border border-border bg-transparent px-3 py-2 text-[12.5px] leading-relaxed text-foreground placeholder:text-faint focus:border-[var(--border-strong)] focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={onOpenFull} className="cy-link">
                  or open the full grouped log →
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function dayFor(model: CycleModel, date: string): number {
  if (!model.lastPeriodStart) return 0;
  return diffDays(model.lastPeriodStart, date) + 1;
}
