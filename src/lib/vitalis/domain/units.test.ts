import { describe, expect, it } from "vitest";

import {
  UnitConversionError,
  canonicalUnitOf,
  convert,
  formatQuantity,
  inUnit,
  quantity,
  roundTo,
  sumQuantities,
  toCanonical,
  toCanonicalQuantity,
  tryConvert,
} from "./units";

describe("units", () => {
  it("converts mass with exact definitions", () => {
    expect(convert(1, "lb", "kg")).toBe(0.453592);
    expect(convert(2.20462262, "lb", "kg")).toBeCloseTo(1, 6);
    expect(toCanonical(500, "g")).toBe(0.5);
  });

  it("converts length, energy, time and volume", () => {
    expect(convert(175, "cm", "in")).toBe(68.897638);
    expect(convert(1, "kcal", "kJ")).toBe(4.184);
    expect(convert(1, "h", "min")).toBe(60);
    expect(convert(1, "l", "ml")).toBe(1000);
  });

  it("knows the canonical unit for each dimension", () => {
    expect(canonicalUnitOf("lb")).toBe("kg");
    expect(canonicalUnitOf("in")).toBe("cm");
    expect(canonicalUnitOf("kJ")).toBe("kcal");
    expect(canonicalUnitOf("h")).toBe("min");
  });

  it("refuses to convert across dimensions instead of returning the input", () => {
    expect(() => convert(80, "kg", "cm")).toThrow(UnitConversionError);
    try {
      convert(80, "kg", "cm");
    } catch (error) {
      expect(error).toBeInstanceOf(UnitConversionError);
      expect((error as UnitConversionError).reason).toBe("unit_mismatch");
    }
  });

  it("reports non-finite input rather than coercing it", () => {
    expect(tryConvert(Number.NaN, "kg", "kg")).toEqual({
      ok: false,
      reason: "not_finite",
      message: "Value is not a finite number.",
    });
    expect(tryConvert(Number.POSITIVE_INFINITY, "kg", "lb").ok).toBe(false);
  });

  it("round-trips without drift beyond six decimals", () => {
    const kg = convert(72.4, "kg", "lb");
    expect(convert(kg, "lb", "kg")).toBeCloseTo(72.4, 6);
  });

  it("builds canonical quantities and converts them back for display", () => {
    const canonical = toCanonicalQuantity(quantity(500, "g"));
    expect(canonical).toEqual({ value: 0.5, unit: "kg" });
    expect(inUnit(canonical, "lb")).toEqual({ value: 1.102311, unit: "lb" });
  });

  it("formats with the unit it was given", () => {
    expect(formatQuantity(quantity(72.4, "kg"))).toBe("72.4 kg");
    expect(formatQuantity(quantity(0.5, "kg"), { unit: "lb", decimals: 1 })).toBe("1.1 lb");
    expect(formatQuantity(quantity(18.5, "percent"))).toBe("18.5%");
    expect(formatQuantity(quantity(7, "count"))).toBe("7");
  });

  it("rejects non-finite quantities", () => {
    expect(() => quantity(Number.NaN, "kg")).toThrow(RangeError);
  });

  it("sums mixed units of one dimension", () => {
    expect(sumQuantities([quantity(500, "g"), quantity(1, "kg")], "kg")).toEqual({ value: 1.5, unit: "kg" });
    expect(() => sumQuantities([quantity(1, "kg"), quantity(1, "min")], "kg")).toThrow(UnitConversionError);
  });

  it("never returns negative zero", () => {
    expect(Object.is(roundTo(-0.0001, 2), -0)).toBe(false);
    expect(roundTo(-0.0001, 2)).toBe(0);
  });
});
