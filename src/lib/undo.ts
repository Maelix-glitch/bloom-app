/**
 * Undo — shared shape for "that delete can still be taken back".
 *
 * Every record in Bloom that can be cleared (period entries, daily cycle
 * log, tracker days) keeps a snapshot for a few seconds and shows the same
 * strip. The hooks own the snapshot; this is just the contract the strip
 * renders and the one window length, so every page behaves identically.
 */

/** A deletion that can still be taken back. */
export interface Undoable {
  id: number;
  message: string;
  /** Epoch ms after which the snapshot is dropped. */
  until: number;
}

/** How long a delete / clear can be undone for. */
export const UNDO_WINDOW_MS = 8000;

/**
 * Put removed items back into the current list — unless the same key was
 * re-logged in the meantime, in which case the newer entry wins and the old
 * one stays gone. Returns the merged list and exactly what came back, so the
 * caller can re-queue those for the account instead of the delete.
 */
export function restoreRemoved<T>(
  current: readonly T[],
  removed: readonly T[],
  keyOf: (item: T) => string,
): { merged: T[]; restored: T[] } {
  const have = new Set(current.map(keyOf));
  const restored = removed.filter((item) => !have.has(keyOf(item)));
  return { merged: [...current, ...restored], restored };
}
