/**
 * StartCycleSheet — the one deliberate cycle-start action.
 * Keeps it to the two things a new cycle genuinely needs: the start date and
 * a quick flow read. Saving goes through the same real save path as every
 * other log, so the ring, phase arcs, predictions and calendar all re-anchor
 * together.
 */

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

import { localDateKey } from "@/lib/cycle/engine";
import type { CycleEntry } from "@/lib/cycle/types";

type StartFlow = Extract<
  NonNullable<CycleEntry["flow"]>,
  "spotting" | "light" | "medium" | "heavy"
>;

const FLOWS: { v: StartFlow; label: string }[] = [
  { v: "spotting", label: "Spotting" },
  { v: "light", label: "Light" },
  { v: "medium", label: "Medium" },
  { v: "heavy", label: "Heavy" },
];

export function StartCycleSheet({
  open,
  onClose,
  initialDate,
  onSaveStart,
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: string | null;
  onSaveStart: (date: string, flow: StartFlow) => Promise<void> | void;
}) {
  const [date, setDate] = useState(localDateKey());
  const [flow, setFlow] = useState<StartFlow>("medium");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDate(initialDate ?? localDateKey());
    setFlow("medium");
    setErr(null);
  }, [open, initialDate]);

  const save = async () => {
    setErr(null);
    if (!date) {
      setErr("Choose the day your period started.");
      return;
    }
    setBusy(true);
    try {
      await onSaveStart(date, flow);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start the cycle just now.");
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
            <SheetTitle className="display text-[17px]">Start new cycle</SheetTitle>
            <SheetDescription className="mt-0.5 text-[12px] text-muted-foreground">
              Set the first day of your current period. Bloom re-anchors the ring, phase arcs and
              every estimate to that date.
            </SheetDescription>
          </div>
          <div className="flex flex-col gap-6 px-5 py-5">
            <label className="flex flex-col gap-1.5">
              <span className="eyebrow">First day of your period</span>
              <input
                type="date"
                value={date}
                max={localDateKey()}
                onChange={(e) => setDate(e.target.value)}
                className="mono rounded-lg border border-border bg-surface/60 px-3 py-2 text-[13px] outline-none [color-scheme:dark] focus:border-border-strong"
              />
              <span className="text-[11px] leading-relaxed text-faint">
                This becomes cycle day 1. If you already have a cycle running, starting a new one
                advances the count from here.
              </span>
            </label>

            <div>
              <p className="eyebrow mb-1.5">Flow on that day</p>
              <div
                className="flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label="Flow on that day"
              >
                {FLOWS.map((o) => {
                  const on = flow === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setFlow(o.v)}
                      className="rounded-full border px-3 py-1.5 text-[12.5px] transition-all duration-[var(--motion-fast)]"
                      style={{
                        borderColor: on ? "var(--cycle-menstrual)" : "var(--border)",
                        background: on
                          ? "color-mix(in oklab, var(--cycle-menstrual) 12%, transparent)"
                          : "transparent",
                        color: on ? "var(--foreground)" : "var(--muted-foreground)",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

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
                {busy ? "Starting…" : "Start cycle"}
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
