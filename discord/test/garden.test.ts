import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dayKey,
  daysBetween,
  gardenBar,
  isMidnightOpen,
  isMilestone,
  nextRank,
  rankForDays,
  shiftDay,
  summarize,
  weekKey,
} from "../src/garden.ts";

test("dayKey respects the garden timezone", () => {
  const d = new Date("2026-09-23T23:30:00Z");
  assert.equal(dayKey(d, "UTC"), "2026-09-23");
  assert.equal(dayKey(d, "Asia/Tokyo"), "2026-09-24");
  assert.equal(dayKey(d, "America/Los_Angeles"), "2026-09-23");
});

test("day arithmetic crosses months and years", () => {
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDay("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2026-02-27", "2026-03-02"), 3);
});

test("ISO weeks start on Monday", () => {
  assert.equal(weekKey("2026-09-21"), "2026-W39"); // Monday
  assert.equal(weekKey("2026-09-27"), "2026-W39"); // Sunday
  assert.equal(weekKey("2026-09-28"), "2026-W40");
  assert.equal(weekKey("2027-01-01"), "2026-W53");
  assert.equal(weekKey("2021-01-03"), "2020-W53");
});

test("midnight garden is open 22:00–05:00 local", () => {
  const at = (iso: string) => isMidnightOpen(new Date(iso), "UTC");
  assert.equal(at("2026-09-23T21:59:00Z"), false);
  assert.equal(at("2026-09-23T22:00:00Z"), true);
  assert.equal(at("2026-09-24T04:59:00Z"), true);
  assert.equal(at("2026-09-24T05:00:00Z"), false);
  // 22:00 in Tokyo is 13:00 UTC
  assert.equal(isMidnightOpen(new Date("2026-09-23T13:00:00Z"), "Asia/Tokyo"), true);
});

test("a streak stays alive until the day ends", () => {
  const s = summarize(["2026-09-20", "2026-09-21", "2026-09-22"], "2026-09-23");
  assert.deepEqual(s, { current: 3, longest: 3, total: 3, checkedInToday: false });
});

test("a missed day resets the current run but not the total", () => {
  const s = summarize(["2026-09-10", "2026-09-11", "2026-09-12", "2026-09-20"], "2026-09-23");
  assert.equal(s.current, 0);
  assert.equal(s.longest, 3);
  assert.equal(s.total, 4);
});

test("duplicates and order don't matter", () => {
  const s = summarize(["2026-09-23", "2026-09-22", "2026-09-23"], "2026-09-23");
  assert.deepEqual(s, { current: 2, longest: 2, total: 2, checkedInToday: true });
});

test("no data is honestly zero", () => {
  assert.deepEqual(summarize([], "2026-09-23"), { current: 0, longest: 0, total: 0, checkedInToday: false });
});

test("ranks count days shown up", () => {
  assert.equal(rankForDays(0).name, "Seedling");
  assert.equal(rankForDays(6).name, "Seedling");
  assert.equal(rankForDays(7).name, "Sprout");
  assert.equal(rankForDays(30).name, "Budding");
  assert.equal(rankForDays(100).name, "In Bloom");
  assert.equal(rankForDays(1000).name, "Evergreen");
  assert.equal(nextRank(8)?.name, "Budding");
  assert.equal(nextRank(400), undefined);
});

test("milestones", () => {
  assert.ok(isMilestone(7));
  assert.ok(!isMilestone(8));
  assert.ok(isMilestone(730));
});

test("garden bar", () => {
  assert.equal(gardenBar(5, 10, 10), "🌸".repeat(5) + "🌱".repeat(5));
  assert.equal(gardenBar(50, 10, 4), "🌸🌸🌸🌸");
  assert.equal(gardenBar(3, 0, 2), "🌱🌱");
});
