/**
 * One-Kitchen Family — the household store.
 *
 * Composes three things the surfaces need: the stored household
 * (other people at the table, `health.household.v1`), the account
 * holder as member #1 (read from their own Assessment answers —
 * never re-asked, never stored in the household list), and the
 * whole-library suitability judgement for that table, computed from
 * the real dish library.
 */

import { useCallback, useMemo } from "react";

import { useAssessment } from "@/hooks/useAssessment";
import {
  EMPTY_HOUSEHOLD,
  HOUSEHOLD_KEY,
  addHouseholdMember,
  parseHouseholdValue,
  readHouseholdValue,
  removeHouseholdMember,
  writeHouseholdValue,
  type HouseholdMember,
} from "@/lib/household/household";
import {
  caregiverLines,
  householdSuitability,
  ownerAsMember,
  tableMemberOf,
  type HouseholdSuitability,
  type TableMember,
} from "@/lib/household/suitability";
import { DISH_LIBRARY } from "@/lib/nutrition/data/dishLibrary";
import { usePrefValue } from "@/lib/prefsStore";

export interface HouseholdStore {
  /** The stored members — OTHER people; the owner is not in here. */
  members: HouseholdMember[];
  /** Everyone at the table: the owner first, then stored members. */
  table: TableMember[];
  suitability: HouseholdSuitability;
  caregiver: { member: TableMember; lines: string[] }[];
  /** False when the household is at its cap. */
  add: (draft: Omit<HouseholdMember, "id">) => boolean;
  remove: (memberId: string) => void;
}

export function useHousehold(): HouseholdStore {
  const value = usePrefValue(HOUSEHOLD_KEY, parseHouseholdValue, EMPTY_HOUSEHOLD);
  const assessment = useAssessment();

  const table = useMemo<TableMember[]>(() => {
    const answers = assessment.state.answers;
    const owner = ownerAsMember({
      pattern: answers.dietaryPattern,
      allergies: answers.allergies,
      dislikes: answers.dislikedFoods,
    });
    return [owner, ...value.members.map(tableMemberOf)];
  }, [assessment.state.answers, value.members]);

  const suitability = useMemo(
    () => householdSuitability(table, DISH_LIBRARY),
    [table],
  );

  const caregiver = useMemo(
    () => table.map((member) => ({ member, lines: caregiverLines(member) })),
    [table],
  );

  const add = useCallback((draft: Omit<HouseholdMember, "id">): boolean => {
    const next = addHouseholdMember(readHouseholdValue(), draft);
    if (!next) return false;
    writeHouseholdValue(next);
    return true;
  }, []);

  const remove = useCallback((memberId: string): void => {
    writeHouseholdValue(removeHouseholdMember(readHouseholdValue(), memberId));
  }, []);

  return { members: value.members, table, suitability, caregiver, add, remove };
}
