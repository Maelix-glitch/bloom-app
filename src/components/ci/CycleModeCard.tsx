/**
 * CycleModeCard — "Are you expecting periods right now?"
 *
 * Pregnancy, postpartum, hormonal contraception with no bleed, menopause, a
 * break, or simply not menstruating: without this the engine counts up
 * forever ("due 61 days ago") and every page keeps asking. Three answers:
 *
 *   tracking — the default; predictions, phases, late logic.
 *   paused   — history and the daily log stay; nothing is predicted and
 *              nothing is ever late. Optionally until a date. Reason optional.
 *   off      — no cycle at all: the Cycle ring, focus items, nav entry and
 *              coach topic disappear. History is kept.
 *
 * Collapsed to one quiet line while tracking; opens into a small card when
 * paused/off so the state is never a mystery.
 */

import { useState } from "react";
import { PauseCircle, PlayCircle, Power } from "lucide-react";

import { Button } from "./primitives";
import { formatDate } from "@/lib/cycle/predict";
import type { CycleMode, CyclePause, CycleSettings } from "@/lib/cycle/periodStore";

const REASONS = ["Pregnant", "Postpartum", "Contraception", "Menopause", "A break"] as const;

export function CycleModeCard({
  mode,
  settings,
  today,
  disabled = false,
  onChange,
}: {
  /** The mode as it applies today. */
  mode: CycleMode;
  settings: CycleSettings;
  today: string;
  disabled?: boolean;
  onChange: (mode: CycleMode, pause?: Partial<Omit<CyclePause, "since">>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [until, setUntil] = useState<string>(settings.pause?.until ?? "");
  const [reason, setReason] = useState<string>(settings.pause?.reason ?? "");

  if (mode === "tracking" && !open) {
    return (
      <p className="mt-3 text-[11.5px] ci-muted" data-testid="cycle-mode">
        Expecting periods — predictions on.{" "}
        <button
          type="button"
          className="underline underline-offset-2 hover:text-[var(--ci-text)]"
          onClick={() => setOpen(true)}
          disabled={disabled}
          data-testid="cycle-mode-open"
        >
          Not right now?
        </button>
      </p>
    );
  }

  const apply = (next: CycleMode) => {
    if (next === "paused") {
      onChange("paused", {
        until: until.trim() === "" ? null : until,
        reason: reason.trim() === "" ? null : reason.trim(),
      });
    } else {
      onChange(next);
    }
    setOpen(false);
  };

  const status =
    mode === "paused"
      ? `Paused${settings.pause?.reason ? ` · ${settings.pause.reason}` : ""}${
          settings.pause?.until ? ` · until ${formatDate(settings.pause.until)}` : ""
        }${settings.pause?.since && settings.pause.since !== "1970-01-01" ? ` · since ${formatDate(settings.pause.since)}` : ""}`
      : mode === "off"
        ? "Cycle tracking is off"
        : "Expecting periods";

  return (
    <div
      className="ci-card ci-card--pad mt-5"
      style={{ borderColor: "color-mix(in oklab, var(--ci-ovulation) 40%, transparent)" }}
      data-testid="cycle-mode"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="ci-eyebrow">Expecting periods?</p>
          <p className="mt-1.5 text-[14px] font-medium" data-testid="cycle-mode-status">
            {status}
          </p>
          <p className="mt-1 max-w-[58ch] text-[12.5px] leading-relaxed ci-soft">
            {mode === "tracking"
              ? "Pregnancy, postpartum, contraception with no bleed, menopause, or just a break — tell Bloom and it stops predicting and never calls anything late. Your history stays."
              : mode === "paused"
                ? "Nothing is predicted and nothing is late. Your history and the daily log are still here; turn tracking back on whenever periods return."
                : "The cycle is out of Today, the sidebar and the coach. Your history is kept — switch it back on any time."}
          </p>
        </div>
        {mode !== "tracking" ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => apply("tracking")}
            disabled={disabled}
            data-testid="cycle-mode-resume"
          >
            <PlayCircle size={14} aria-hidden /> Periods are back
          </Button>
        ) : null}
      </div>

      {mode !== "off" ? (
        <div className="mt-4 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid items-start gap-3 sm:grid-cols-2">
            <label className="ci-field block">
              <span className="ci-label">Until (optional)</span>
              <span className="mt-1.5 block">
                <input
                  type="date"
                  className="ci-input"
                  value={until}
                  min={today}
                  disabled={disabled}
                  onChange={(e) => setUntil(e.target.value)}
                  data-testid="cycle-mode-until"
                />
              </span>
              <span className="ci-hint mt-1.5 block">Tracking resumes on its own that day.</span>
            </label>
            <label className="ci-field block">
              <span className="ci-label">Why (optional, only for you)</span>
              <span className="mt-1.5 block">
                <input
                  type="text"
                  className="ci-input"
                  list="cycle-mode-reasons"
                  maxLength={80}
                  placeholder="e.g. pregnant"
                  value={reason}
                  disabled={disabled}
                  onChange={(e) => setReason(e.target.value)}
                  data-testid="cycle-mode-reason"
                />
              </span>
              <datalist id="cycle-mode-reasons">
                {REASONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <span className="ci-hint mt-1.5 block">Never required — a note to yourself.</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:pt-[26px]">
            <Button
              onClick={() => apply("paused")}
              disabled={disabled}
              data-testid="cycle-mode-pause"
            >
              <PauseCircle size={14} aria-hidden />
              {mode === "paused" ? "Update pause" : "Pause predictions"}
            </Button>
            {mode === "tracking" ? (
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={disabled}>
                Keep tracking
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {mode !== "off" ? (
        <p className="mt-3 text-[11.5px] ci-muted">
          Don't track a cycle at all?{" "}
          <button
            type="button"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[var(--ci-text)]"
            onClick={() => apply("off")}
            disabled={disabled}
            data-testid="cycle-mode-off"
          >
            <Power size={11} aria-hidden /> Turn cycle tracking off
          </button>
        </p>
      ) : null}
    </div>
  );
}
