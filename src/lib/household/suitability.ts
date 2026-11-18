/**
 * One-Kitchen Family — who can eat what, judged for the whole table.
 *
 * The question this answers: "which dishes suit EVERYONE at the
 * table?" A dish suits everyone exactly when:
 *   1. it suits every member's dietary pattern — judged by the repo's
 *      own rules, reused, never forked: `dishPatterns` (dishes.ts)
 *      derives the patterns a dish suits from its ingredient lines,
 *      and `planPatternOf` (plan.ts) maps a stated pattern to the
 *      plan pattern it must satisfy; and
 *   2. it contains no ingredient any member is allergic to — matched
 *      with the plan's own name-matching discipline (`eligiblePool`
 *      in plan.ts): the person's words, trimmed and lowercased, terms
 *      under 3 characters ignored, matched as a substring of the
 *      ingredient food's name.
 *
 * The honesty rule, pinned in tests: a free-text allergy that cannot
 * be matched — too short for the matching rule, or matching no food
 * name anywhere in the reference set — is NEVER silently treated as
 * safe. It is reported as an unmatched allergy ("check manually"),
 * and while any unmatched allergy exists the summary says plainly
 * that its count covers only the checks Bloom could actually run.
 *
 * Dislikes never block a dish (they are taste, not safety); a dish
 * containing a disliked ingredient is flagged so the cook knows.
 */

import { DIETARY_LABEL } from "@/lib/assessment/questions";
import { dishPatterns, type Dish } from "@/lib/nutrition/dishes";
import type { Food } from "@/lib/nutrition/types";
import { planPatternOf } from "@/lib/nutrition/plan";
import { USDA_REFERENCE_FOODS } from "@/lib/nutrition/usdaReference";
import type { DietaryPattern } from "@/lib/vitalis/domain/profile";
import type { HouseholdMember } from "./household";

/** A person at the table, resolved for computation. The account
 *  holder is a table member too — built from their own record by
 *  `ownerAsMember`, never stored in the household list. */
export interface TableMember {
  id: string;
  name: string;
  /** True for the account holder (member #1). */
  self: boolean;
  pattern: DietaryPattern | null;
  allergies: string[];
  dislikes: string[];
}

/** Member #1: the account holder, from their own stored Assessment
 *  answers — their pattern and allergies are read, never re-asked. */
export function ownerAsMember(input: {
  pattern: DietaryPattern | null;
  allergies: readonly string[];
  dislikes: readonly string[];
}): TableMember {
  return {
    id: "self",
    name: "You",
    self: true,
    pattern: input.pattern,
    allergies: [...input.allergies],
    dislikes: [...input.dislikes],
  };
}

export function tableMemberOf(member: HouseholdMember): TableMember {
  return {
    id: member.id,
    name: member.name,
    self: false,
    pattern: member.pattern,
    allergies: member.allergies,
    dislikes: member.dislikes,
  };
}

/* ------------------------- allergy name-matching ------------------------ */

/** The plan's matching discipline (plan.ts `eligiblePool`): a term
 *  participates only when its trimmed, lowercased form is at least
 *  3 characters. Shorter words are too ambiguous to judge a dish by. */
export const MIN_ALLERGY_TERM_CHARS = 3;

export function normaliseTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function isMatchableTerm(term: string): boolean {
  return normaliseTerm(term).length >= MIN_ALLERGY_TERM_CHARS;
}

/** Does this term match any food name in the set? A term matching
 *  nothing anywhere cannot be verified against any dish. */
function termMatchesAnyFood(term: string, foods: readonly Food[]): boolean {
  const t = normaliseTerm(term);
  return foods.some((f) => f.name.toLowerCase().includes(t));
}

export interface UnmatchedAllergy {
  memberId: string;
  memberName: string;
  /** The term as the person wrote it. */
  term: string;
  reason: "too_short" | "no_matching_food";
}

/** Every allergy term at the table that Bloom cannot honestly check:
 *  too short for the matching rule, or matching no ingredient name
 *  in the reference set. These are surfaced, never dropped. */
export function unmatchedAllergies(
  members: readonly TableMember[],
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): UnmatchedAllergy[] {
  const out: UnmatchedAllergy[] = [];
  for (const member of members) {
    for (const term of member.allergies) {
      if (!isMatchableTerm(term)) {
        out.push({ memberId: member.id, memberName: member.name, term, reason: "too_short" });
      } else if (!termMatchesAnyFood(term, foods)) {
        out.push({
          memberId: member.id,
          memberName: member.name,
          term,
          reason: "no_matching_food",
        });
      }
    }
  }
  return out;
}

/* ------------------------------ dish judging ---------------------------- */

export interface DishBlock {
  memberName: string;
  kind: "pattern" | "allergy";
  detail: string;
}

export interface DishHouseholdResult {
  dish: Dish;
  suitsEveryone: boolean;
  blockedBy: DishBlock[];
  /** Non-blocking notes: disliked ingredients at the table. */
  warnings: string[];
}

function dishFoods(dish: Dish, foods: readonly Food[]): Food[] {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const out: Food[] = [];
  for (const line of dish.lines) {
    const food = byId.get(line.foodId);
    if (food) out.push(food);
  }
  return out;
}

/** Judge one dish for the whole table. Pattern suitability comes
 *  from `dishPatterns` — the same derivation the Dishes tab and the
 *  plan engine use. Allergy and dislike checks match member terms
 *  against the dish's ingredient food names, the plan's way. */
export function judgeDishForHousehold(
  dish: Dish,
  members: readonly TableMember[],
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): DishHouseholdResult {
  const patterns = dishPatterns(dish, foods);
  const ingredients = dishFoods(dish, foods);
  const blockedBy: DishBlock[] = [];
  const warnings: string[] = [];

  for (const member of members) {
    const planPattern = planPatternOf(member.pattern);
    if (planPattern !== null && !patterns.includes(planPattern)) {
      blockedBy.push({
        memberName: member.name,
        kind: "pattern",
        detail: `does not suit ${member.name}'s pattern (${DIETARY_LABEL[member.pattern!]})`,
      });
    }
    for (const term of member.allergies) {
      if (!isMatchableTerm(term)) continue; // reported via unmatchedAllergies
      const t = normaliseTerm(term);
      const hit = ingredients.find((f) => f.name.toLowerCase().includes(t));
      if (hit) {
        blockedBy.push({
          memberName: member.name,
          kind: "allergy",
          detail: `contains ${hit.name}, which ${member.name} is allergic to ("${term}")`,
        });
      }
    }
    for (const term of member.dislikes) {
      if (!isMatchableTerm(term)) continue;
      const t = normaliseTerm(term);
      const hit = ingredients.find((f) => f.name.toLowerCase().includes(t));
      if (hit) {
        warnings.push(`Contains ${hit.name} — ${member.name} dislikes "${term}".`);
      }
    }
  }

  return { dish, suitsEveryone: blockedBy.length === 0, blockedBy, warnings };
}

export interface HouseholdSuitability {
  /** One result per dish judged, in library order. */
  results: DishHouseholdResult[];
  /** The dishes that suit everyone, in library order. */
  suiting: Dish[];
  totalDishes: number;
  suitingCount: number;
  /** Allergy terms Bloom could not verify — check manually. While
   *  this is non-empty, `suitingCount` covers only the checks that
   *  could actually run; it is never presented as a safety proof. */
  unmatched: UnmatchedAllergy[];
}

/** Judge the whole library for the whole table. */
export function householdSuitability(
  members: readonly TableMember[],
  dishes: readonly Dish[],
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): HouseholdSuitability {
  const results = dishes.map((dish) => judgeDishForHousehold(dish, members, foods));
  const suiting = results.filter((r) => r.suitsEveryone).map((r) => r.dish);
  return {
    results,
    suiting,
    totalDishes: dishes.length,
    suitingCount: suiting.length,
    unmatched: unmatchedAllergies(members, foods),
  };
}

/* ----------------------------- caregiver view --------------------------- */

/** Per-member "what to watch" lines, derived only from what is
 *  stored for that person: their pattern, their allergies (with the
 *  checkable ones distinguished from the check-manually ones) and
 *  their dislikes. Nothing is inferred beyond the record. */
export function caregiverLines(
  member: TableMember,
  foods: readonly Food[] = USDA_REFERENCE_FOODS,
): string[] {
  const lines: string[] = [];
  lines.push(
    member.pattern
      ? `${member.name} eats ${DIETARY_LABEL[member.pattern]}.`
      : `${member.name} has no dietary pattern stated — no pattern filter is applied.`,
  );
  if (member.allergies.length > 0) {
    const checkable: string[] = [];
    const manual: string[] = [];
    for (const term of member.allergies) {
      if (isMatchableTerm(term) && termMatchesAnyFood(term, foods)) checkable.push(term);
      else manual.push(term);
    }
    if (checkable.length > 0) {
      lines.push(
        `Allergic to: ${checkable.join(", ")} — every dish below is checked against these.`,
      );
    }
    if (manual.length > 0) {
      lines.push(
        `Allergic to: ${manual.join(", ")} — Bloom could not match ${
          manual.length === 1 ? "this" : "these"
        } to an ingredient name, so check ${
          manual.length === 1 ? "it" : "them"
        } manually. Never assume a dish is safe for ${member.name} on this point.`,
      );
    }
  }
  if (member.dislikes.length > 0) {
    lines.push(`Dislikes: ${member.dislikes.join(", ")}.`);
  }
  return lines;
}
