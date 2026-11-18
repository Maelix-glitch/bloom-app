/**
 * The pantry hook — the Grocery section's door into `health.pantry.v1`.
 *
 * Reads ride the shared prefs store (the same `usePrefValue` every
 * other prefs-backed hook uses, so a write anywhere re-renders here);
 * writes go through the lib's pure add/remove and the real prefs
 * document, read fresh inside the callback so two quick taps can
 * never act on a stale list.
 */

import { useCallback } from "react";

import { usePrefValue } from "@/lib/prefsStore";
import {
  PANTRY_KEY,
  addPantryItem,
  parsePantryValue,
  readPantry,
  removePantryItem,
  writePantry,
  type PantryItem,
  type PantryItemDraft,
} from "@/lib/grocery/pantry";

const NO_ITEMS: PantryItem[] = [];

export interface PantryStore {
  items: PantryItem[];
  add: (draft: PantryItemDraft) => void;
  remove: (id: string) => void;
}

export function usePantry(): PantryStore {
  const items = usePrefValue(PANTRY_KEY, parsePantryValue, NO_ITEMS);

  const add = useCallback((draft: PantryItemDraft) => {
    writePantry(addPantryItem(readPantry(), draft, new Date().toISOString()));
  }, []);

  const remove = useCallback((id: string) => {
    writePantry(removePantryItem(readPantry(), id));
  }, []);

  return { items, add, remove };
}
