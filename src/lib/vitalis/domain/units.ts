/**
 * Explicit measurement units for Bloom Vitalis.
 *
 * Every health number in Vitalis carries the unit it was recorded in. Nothing
 * is stored as a bare number, because "82" means nothing without knowing
 * whether it is kilograms or pounds. Values are converted to a canonical unit
 * (kg, cm, kcal, ml, min) at the boundary and converted back for display, so
 * the storage layer never has to guess.
 *
 * Conversions use exact definitions where they exist:
 *   1 lb = 0.45359237 kg, 1 in = 2.54 cm, 1 kcal = 4.184 kJ.
 * Rounding happens only when a value is produced, never mid-chain.
 */

export type Dimension =
  | "mass"
  | "length"
  | "energy"
  | "volume"
  | "time"
  | "mass_rate"
  | "ratio"
  | "count"
  | "heart_rate";

export type Unit =
  | "kg"
  | "g"
  | "lb"
  | "cm"
  | "m"
  | "in"
  | "kcal"
  | "kJ"
  | "ml"
  | "l"
  | "min"
  | "h"
  | "kg_per_week"
  | "lb_per_week"
  | "percent"
  | "count"
  | "bpm";

export interface UnitSpec {
  readonly dimension: Dimension;
  /** Multiply a value expressed in this unit by `factor` to reach the canonical unit. */
  readonly factor: number;
  readonly label: string;
  readonly decimals: number;
}

export const UNITS: Record<Unit, UnitSpec> = {
  kg: { dimension: "mass", factor: 1, label: "kg", decimals: 1 },
  g: { dimension: "mass", factor: 0.001, label: "g", decimals: 0 },
  lb: { dimension: "mass", factor: 0.45359237, label: "lb", decimals: 1 },
  cm: { dimension: "length", factor: 1, label: "cm", decimals: 1 },
  m: { dimension: "length", factor: 100, label: "m", decimals: 2 },
  in: { dimension: "length", factor: 2.54, label: "in", decimals: 1 },
  kcal: { dimension: "energy", factor: 1, label: "kcal", decimals: 0 },
  kJ: { dimension: "energy", factor: 1 / 4.184, label: "kJ", decimals: 0 },
  ml: { dimension: "volume", factor: 1, label: "ml", decimals: 0 },
  l: { dimension: "volume", factor: 1000, label: "l", decimals: 2 },
  min: { dimension: "time", factor: 1, label: "min", decimals: 0 },
  h: { dimension: "time", factor: 60, label: "h", decimals: 1 },
  kg_per_week: { dimension: "mass_rate", factor: 1, label: "kg/week", decimals: 2 },
  lb_per_week: { dimension: "mass_rate", factor: 0.45359237, label: "lb/week", decimals: 2 },
  percent: { dimension: "ratio", factor: 1, label: "%", decimals: 1 },
  count: { dimension: "count", factor: 1, label: "", decimals: 0 },
  bpm: { dimension: "heart_rate", factor: 1, label: "bpm", decimals: 0 },
};

export const UNIT_CODES = Object.keys(UNITS) as Unit[];

export const CANONICAL_UNIT: Record<Dimension, Unit> = {
  mass: "kg",
  length: "cm",
  energy: "kcal",
  volume: "ml",
  time: "min",
  mass_rate: "kg_per_week",
  ratio: "percent",
  count: "count",
  heart_rate: "bpm",
};

export function isUnit(value: unknown): value is Unit {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(UNITS, value);
}

export function dimensionOf(unit: Unit): Dimension {
  return UNITS[unit].dimension;
}

export function canonicalUnitOf(unit: Unit): Unit {
  return CANONICAL_UNIT[UNITS[unit].dimension];
}

export function isSameDimension(a: Unit, b: Unit): boolean {
  return dimensionOf(a) === dimensionOf(b);
}

/** Deterministic rounding. Never returns negative zero, so display is stable. */
export function roundTo(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export type ConversionFailure = "not_finite" | "unit_mismatch";

export type ConversionResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: ConversionFailure; readonly message: string };

export class UnitConversionError extends Error {
  readonly reason: ConversionFailure;
  readonly from: Unit;
  readonly to: Unit;

  constructor(reason: ConversionFailure, from: Unit, to: Unit) {
    super(
      reason === "unit_mismatch"
        ? `Cannot convert ${from} to ${to}: different dimensions`
        : `Cannot convert ${from} to ${to}: value is not a finite number`,
    );
    this.name = "UnitConversionError";
    this.reason = reason;
    this.from = from;
    this.to = to;
  }
}

export function tryConvert(value: number, from: Unit, to: Unit): ConversionResult {
  if (!Number.isFinite(value)) {
    return { ok: false, reason: "not_finite", message: "Value is not a finite number." };
  }
  if (from !== to && !isSameDimension(from, to)) {
    return {
      ok: false,
      reason: "unit_mismatch",
      message: `Cannot convert ${UNITS[from].label || from} to ${UNITS[to].label || to}.`,
    };
  }
  const canonical = value * UNITS[from].factor;
  return { ok: true, value: roundTo(canonical / UNITS[to].factor, 6) };
}

/**
 * Convert between units of the same dimension. Throws on a dimension mismatch
 * instead of quietly returning the original number, because a silent mismatch
 * is how 82 kg becomes 82 lb in a report.
 */
export function convert(value: number, from: Unit, to: Unit): number {
  const result = tryConvert(value, from, to);
  if (!result.ok) throw new UnitConversionError(result.reason, from, to);
  return result.value;
}

export function toCanonical(value: number, unit: Unit): number {
  return convert(value, unit, canonicalUnitOf(unit));
}

export interface Quantity {
  readonly value: number;
  readonly unit: Unit;
}

export function quantity(value: number, unit: Unit): Quantity {
  if (!Number.isFinite(value)) {
    throw new RangeError("A quantity needs a finite numeric value.");
  }
  if (!isUnit(unit)) {
    throw new RangeError(`Unknown measurement unit: ${String(unit)}`);
  }
  return { value, unit };
}

export function inUnit(q: Quantity, unit: Unit): Quantity {
  return quantity(q.unit === unit ? q.value : convert(q.value, q.unit, unit), unit);
}

export function toCanonicalQuantity(q: Quantity): Quantity {
  return inUnit(q, canonicalUnitOf(q.unit));
}

export function formatQuantity(
  q: Quantity,
  options: { readonly unit?: Unit; readonly decimals?: number } = {},
): string {
  const unit = options.unit ?? q.unit;
  const value = unit === q.unit ? q.value : convert(q.value, q.unit, unit);
  const decimals = options.decimals ?? UNITS[unit].decimals;
  const text = value.toFixed(decimals);
  const label = UNITS[unit].label;
  if (label === "%") return `${text}%`;
  return label ? `${text} ${label}` : text;
}

/** Sum quantities, converting each into `unit` first. Throws across dimensions. */
export function sumQuantities(items: readonly Quantity[], unit: Unit): Quantity {
  let total = 0;
  for (const item of items) total += convert(item.value, item.unit, unit);
  return quantity(roundTo(total, 6), unit);
}
