import { describe, expect, it } from "vitest";

import {
  MAX_HOUSEHOLD_MEMBERS,
  addHouseholdMember,
  parseHouseholdValue,
  removeHouseholdMember,
  splitTerms,
  type HouseholdValue,
} from "./household";

const MEMBER = {
  id: "m-1",
  name: "Amma",
  pattern: "vegetarian" as const,
  allergies: ["Peanut"],
  dislikes: ["Bitter gourd"],
};

describe("parseHouseholdValue", () => {
  it("accepts a well-formed household", () => {
    expect(parseHouseholdValue({ version: 1, members: [MEMBER] })).toEqual({
      version: 1,
      members: [MEMBER],
    });
  });

  it("rejects a wrong version and non-objects", () => {
    expect(parseHouseholdValue({ version: 2, members: [] })).toBeNull();
    expect(parseHouseholdValue(null)).toBeNull();
    expect(parseHouseholdValue("household")).toBeNull();
    expect(parseHouseholdValue({ version: 1, members: "nope" })).toBeNull();
  });

  it("drops members without an id or a name, keeps the rest", () => {
    const value = parseHouseholdValue({
      version: 1,
      members: [MEMBER, { id: "", name: "No id" }, { id: "m-2", name: "  " }, null],
    });
    expect(value?.members).toEqual([MEMBER]);
  });

  it("a pattern outside the app's vocabulary reads as unstated, never invented", () => {
    const value = parseHouseholdValue({
      version: 1,
      members: [{ ...MEMBER, pattern: "keto" }],
    });
    expect(value?.members[0]?.pattern).toBeNull();
  });

  it("keeps the first of duplicate ids and caps the list", () => {
    const many = Array.from({ length: MAX_HOUSEHOLD_MEMBERS + 4 }, (_, i) => ({
      ...MEMBER,
      id: `m-${i}`,
    }));
    const value = parseHouseholdValue({
      version: 1,
      members: [MEMBER, { ...MEMBER, name: "Duplicate" }, ...many],
    });
    expect(value?.members).toHaveLength(MAX_HOUSEHOLD_MEMBERS);
    expect(value?.members[0]?.name).toBe("Amma");
  });

  it("cleans terms: trims, collapses space, dedupes case-insensitively", () => {
    const value = parseHouseholdValue({
      version: 1,
      members: [{ ...MEMBER, allergies: ["  Peanut ", "peanut", "", "Milk  powder"] }],
    });
    expect(value?.members[0]?.allergies).toEqual(["Peanut", "Milk powder"]);
  });
});

describe("add / remove", () => {
  const empty: HouseholdValue = { version: 1, members: [] };

  it("adds a member with a generated id", () => {
    const next = addHouseholdMember(empty, {
      name: "Ravi",
      pattern: "eggetarian",
      allergies: [],
      dislikes: [],
    });
    expect(next?.members).toHaveLength(1);
    expect(next?.members[0]?.name).toBe("Ravi");
    expect(next?.members[0]?.id.length).toBeGreaterThan(0);
  });

  it("refuses past the cap instead of silently dropping someone", () => {
    let value: HouseholdValue = empty;
    for (let i = 0; i < MAX_HOUSEHOLD_MEMBERS; i++) {
      value = addHouseholdMember(value, {
        name: `Person ${i}`,
        pattern: null,
        allergies: [],
        dislikes: [],
      })!;
    }
    expect(
      addHouseholdMember(value, { name: "One more", pattern: null, allergies: [], dislikes: [] }),
    ).toBeNull();
  });

  it("removes by id and leaves the others", () => {
    const value: HouseholdValue = { version: 1, members: [MEMBER, { ...MEMBER, id: "m-2", name: "Ravi" }] };
    const next = removeHouseholdMember(value, "m-1");
    expect(next.members.map((m) => m.id)).toEqual(["m-2"]);
  });
});

describe("splitTerms", () => {
  it("splits a typed comma line into clean terms", () => {
    expect(splitTerms("peanut, Milk ,,  egg ")).toEqual(["peanut", "Milk", "egg"]);
    expect(splitTerms("")).toEqual([]);
  });
});
