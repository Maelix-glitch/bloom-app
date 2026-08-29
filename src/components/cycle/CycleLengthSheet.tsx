/**
 * Adjust cycle — the compact identity editor beside the wheel.
 * Two honest tools only: set the working length until personal cycles exist
 * (a labeled assumption, never "your average"), and fix the anchor — the
 * first day of the current period. Both flow through the real save path so
 * the whole page recomputes like any other log.
 */

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { localDateKey } from "@/lib/cycle/engine";
import type { CycleEntry, CycleModel } from "@/lib/cycle/types";

export function CycleLengthSheet({
  open,
  onClose,
  model,
  defaultCycle,
  onSaveLength,
  onSaveStart,
}: {
  open: boolean;
  onClose: () => void;
  model: CycleModel | null;
  defaultCycle: number | null;
  onSaveLength: (days: number | null) => Promise<void> | void;
  onSaveStart: (date: string) => Promise<void> | void;
}) {
  const [days, setDays] = useState(28);
  const [start, setStart] = useState(localDateKey());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !model) return;
    setDays(defaultCycle ?? Math.round(model.average ?? 28));
    setStart(model.lastPeriodStart ?? localDateKey());
    setErr(null);
  }, [open, model, defaultCycle]);

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (model?.usesDefaultAssumption) await onSaveLength(days);
      await onSaveStart(start);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save that just now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-border bg-background p-0 sm:max-w-[400px]"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border px-5 py-4">
            <SheetTitle className="display text-[17px]">Adjust cycle</SheetTitle>
            <SheetDescription className="mt-0.5 text-[12px] text-muted-foreground">
              {model && model.completed.length > 0
                ? `Your own history is in charge now — average ${model.average?.toFixed(1)} days from ${model.completed.length} cycle${model.completed.length === 1 ? "" : "s"}. You can still correct the anchor.`
                : "Until two cycles are logged, estimates run on this working length — clearly labeled as a guess until your history replaces it."}
            </SheetDescription>
          </div>
          <div className="flex flex-col gap-6 px-5 py-5">
            {model?.usesDefaultAssumption ? (
              <label className="flex flex-col gap-2">
                <span className="eyebrow">Working length — {days} days</span>
                <input
                  type="range"
                  min={20}
                  max={45}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full accent-[var(--profile-accent,var(--violet))]"
                />
                <span className="text-[11px] leading-relaxed text-faint">
                  Only the calendar assumption. It retires the moment two real cycles are logged.
                </span>
              </label>
            ) : (
              <p className="rounded-xl border border-border/70 bg-surface/40 px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
                Personal average active — nothing to set. {Math.round(model?.ovulationDay ?? 14)}d
                follicular-side estimate, {model?.lutealLength ?? 14}d luteal, recalculated from
                your last {Math.min(6, model?.completed.length ?? 0)} cycles each time you log.
              </p>
            )}

            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">Current period started on</span>
              <input
                type="date"
                value={start}
                max={localDateKey()}
                onChange={(e) => setStart(e.target.value)}
                className="mono rounded-lg border border-border bg-surface/60 px-3 py-2 text-[13px] outline-none [color-scheme:dark] focus:border-border-strong"
              />
              <span className="text-[11px] leading-relaxed text-faint">
                Marks that day as a period start so day-counting, the ring and every estimate
                re-anchor to it.
              </span>
            </label>

            {err ? (
              <p
                role="alert"
                className="rounded-lg border border-rose/40 bg-rose/5 px-3 py-2 text-[12px] text-rose"
              >
                {err}
              </p>
            ) : null}

            <div className="mt-1 flex items-center justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="rounded-full px-5 py-2 text-[13px] font-medium text-[var(--primary-foreground)] transition-transform enabled:hover:scale-[1.02] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--violet), var(--sky))" }}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type { CycleEntry };
