/**
 * UndoToast — a delete or clear can be taken back for a few seconds.
 * Lives above the phone tab bar; sits centred in the content area on desktop.
 */

import { Undo2, X } from "lucide-react";

import { UNDO_WINDOW_MS, type Undoable } from "@/lib/undo";

export function UndoToast({
  undoable,
  onUndo,
  onDismiss,
  testId = "cycle-undo",
}: {
  undoable: Undoable | null;
  onUndo: () => void;
  onDismiss: () => void;
  /** Test id prefix — the button gets `${testId}-button`. */
  testId?: string | undefined;
}) {
  if (!undoable) return null;
  return (
    <div
      key={undoable.id}
      className="ci-undo"
      role="status"
      aria-live="polite"
      data-testid={testId}
      style={{ ["--ci-undo-ms" as string]: `${UNDO_WINDOW_MS}ms` }}
    >
      <span className="min-w-0 truncate">{undoable.message}</span>
      <button
        type="button"
        className="ci-btn ci-btn--sm ci-btn--primary"
        onClick={onUndo}
        data-testid={`${testId}-button`}
      >
        <Undo2 size={13} aria-hidden />
        Undo
      </button>
      <button
        type="button"
        className="ci-btn ci-btn--sm ci-btn--ghost"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <X size={13} aria-hidden />
      </button>
      <span className="ci-undo__bar" aria-hidden />
    </div>
  );
}
