import { describe, expect, it } from "vitest";

import {
  fmtCount,
  fmtDate,
  fmtDuration,
  fmtGrams,
  fmtKcalApprox,
  fmtLitres,
  fmtShoppingQty,
  plural,
} from "./format";

describe("fmtDate", () => {
  it("renders a day key in the house format, never ISO", () => {
    expect(fmtDate("2026-11-18")).toBe("18 Nov 2026");
    expect(fmtDate("2026-08-13")).toBe("13 Aug 2026");
  });
});

describe("fmtCount", () => {
  it("groups thousands the en-IN way", () => {
    expect(fmtCount(1202)).toBe("1,202");
    expect(fmtCount(80)).toBe("80");
  });
});

describe("fmtGrams", () => {
  it("never prints a decimal gram", () => {
    expect(fmtGrams(206.25)).toBe("206");
    expect(fmtGrams(206.5)).toBe("207");
    expect(fmtGrams(400)).toBe("400");
  });
});

describe("fmtShoppingQty — rulebook v2 §7 (M-58, M-59)", () => {
  it("never prints 0 g for something the plan needs — under 5 g is a pinch", () => {
    expect(fmtShoppingQty(0.4)).toBe("a pinch");
    expect(fmtShoppingQty(4.9)).toBe("a pinch");
    expect(fmtShoppingQty(0)).toBe("a pinch");
  });

  it("rounds to the step a shopper can act on, per band", () => {
    expect(fmtShoppingQty(12)).toBe("~10 g");
    expect(fmtShoppingQty(48)).toBe("~50 g");
    expect(fmtShoppingQty(103)).toBe("~100 g");
    expect(fmtShoppingQty(358)).toBe("~350 g");
    expect(fmtShoppingQty(263)).toBe("~275 g");
    expect(fmtShoppingQty(600)).toBe("~600 g");
  });

  it("prints a kilo or more as kilos", () => {
    expect(fmtShoppingQty(999)).toBe("~1 kg");
    expect(fmtShoppingQty(1250)).toBe("~1.25 kg");
    expect(fmtShoppingQty(1500)).toBe("~1.5 kg");
  });
});

describe("fmtKcalApprox", () => {
  it("rounds an approximate target to the nearest 50, grouped, with the tilde", () => {
    expect(fmtKcalApprox(2964)).toBe("~2,950 kcal");
    expect(fmtKcalApprox(2974)).toBe("~2,950 kcal");
    expect(fmtKcalApprox(2975)).toBe("~3,000 kcal");
    expect(fmtKcalApprox(3288)).toBe("~3,300 kcal");
  });
});

/* Brief v6 §1.4 — the five expectations, verbatim, plus the grouping the
   house grouper (fmtCount, en-IN) lends plural(). */
describe("fmtDuration / fmtLitres / plural (v6 §1.4)", () => {
  it("renders durations in human units", () => {
    expect(fmtDuration(480)).toBe("8 h");
    expect(fmtDuration(90)).toBe("1 h 30 min");
    expect(fmtDuration(45)).toBe("45 min");
    expect(fmtDuration(60)).toBe("1 h");
    expect(fmtDuration(0)).toBe("0 min");
  });

  it("renders volumes in litres at a litre or more", () => {
    expect(fmtLitres(2200)).toBe("2.2 L");
    expect(fmtLitres(1000)).toBe("1 L");
    expect(fmtLitres(800)).toBe("800 ml");
  });

  it("pluralises with the grouped count", () => {
    expect(plural(1, "day")).toBe("1 day");
    expect(plural(0, "day")).toBe("0 days");
    expect(plural(2, "day")).toBe("2 days");
    expect(plural(1202, "day")).toBe("1,202 days");
    expect(plural(1, "weigh-in")).toBe("1 weigh-in");
  });
});
