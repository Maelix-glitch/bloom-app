import { describe, expect, it } from "vitest";

import { fmtCount, fmtDate, fmtGrams, fmtKcalApprox } from "./format";

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

describe("fmtKcalApprox", () => {
  it("rounds an approximate target to the nearest 50, grouped, with the tilde", () => {
    expect(fmtKcalApprox(2964)).toBe("~2,950 kcal");
    expect(fmtKcalApprox(2974)).toBe("~2,950 kcal");
    expect(fmtKcalApprox(2975)).toBe("~3,000 kcal");
    expect(fmtKcalApprox(3288)).toBe("~3,300 kcal");
  });
});
