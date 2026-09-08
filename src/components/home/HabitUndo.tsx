/**
 * HabitUndo — "Archived 'Gym'. Undo" for a few seconds after archiving or
 * deleting a habit on Today. Same contract as the Cycle/Trackers strip.
 */

import { Undo2, X } from "lucide-react";

import { UNDO_WINDOW_MS, type Undoable } from "@/lib/undo";

export function HabitUndo({
  undoable,
  onUndo,
  onDismiss,
}: {
  undoable: Undoable | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  if (!undoable) return null;
  return (
    <div
      key={undoable.id}
      className="home-undo"
      role="status"
      aria-live="polite"
      data-testid="home-undo"
      style={{ ["--home-undo-ms" as string]: `${UNDO_WINDOW_MS}ms` }}
    >
      <span className="min-w-0 truncate">{undoable.message}</span>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
        onClick={onUndo}
        data-testid="home-undo-button"
      >
        <Undo2 className="size-3.5" aria-hidden />
        Undo
      </button>
      <button
        type="button"
        className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <X className="size-3.5" aria-hidden />
      </button>
      <span className="home-undo__bar" aria-hidden />
    </div>
  );
}
