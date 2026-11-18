/**
 * Lab reports — the values from a person's own printed lab reports,
 * stored faithfully and shown back with exactly one comparison: the
 * reference range printed on that same report.
 *
 * The discipline, end to end:
 *
 *   · Bloom stores what the person copies off their report — test
 *     name, value, unit, date, and the reference range AS PRINTED.
 *     Nothing is normalised, converted or completed.
 *   · A flag is pure arithmetic against the person's OWN entered
 *     range: below it, within it, above it. If no range was entered
 *     there is NO flag — Bloom never substitutes a textbook range,
 *     because a range it invented would be medical advice wearing a
 *     number's clothes.
 *   · The wording stays factual ("Above the range printed on your
 *     report"). Bloom does not interpret results, never says "normal"
 *     or "abnormal", and never diagnoses — the section carries a
 *     standing line saying so.
 *   · Trends group by test name AND unit. The same test reported in
 *     a different unit is a separate series: units are never
 *     converted or merged, because a conversion Bloom chose would
 *     silently rewrite the person's record.
 *
 * Storage is a versioned prefs key, `health.labs.v1`, in the shared
 * preferences document — sync, export (`loadDoc()` wholesale) and
 * erasure (device wipe + `erase_my_data()` on `user_prefs`) are
 * inherited by construction, the same pattern the assessment
 * history and the target adjustment use.
 *
 * Everything here is pure except the thin pref wrappers at the
 * bottom.
 */

import { clearPref, getPref, setPref } from "@/lib/prefs";

export const LABS_KEY = "health.labs.v1";
export const LABS_VERSION = 1;
/** At most this many results are kept; adding beyond it drops the
 *  oldest by report date. A decade of quarterly panels fits easily. */
export const LAB_RESULTS_CAP = 200;

/** The standing honesty line, shown wherever results are shown. */
export const LABS_DISCLAIMER =
  "Bloom does not interpret your results. It only shows each value against the range printed on your own report — talk to your doctor about what your results mean.";

export interface LabResult {
  id: string;
  /** The test name, exactly as the person entered it. */
  testName: string;
  value: number;
  /** The unit, exactly as entered (e.g. "mg/dL"). Never converted. */
  unit: string;
  /** The date printed on the report, YYYY-MM-DD. */
  reportDate: string;
  /** Reference range AS PRINTED on the person's own report. Either
   *  bound may be absent; both absent means no flag, ever. */
  refLow?: number;
  refHigh?: number;
  /** The lab's name, if the person entered it. */
  labName?: string;
  /** When the result was typed into Bloom (ISO). */
  recordedAt: string;
}

export interface LabsValue {
  version: typeof LABS_VERSION;
  results: LabResult[];
}

export const EMPTY_LABS: LabsValue = { version: LABS_VERSION, results: [] };

/** below / within / above the person's own range — or "none" when no
 *  range was entered, in which case no comparison exists to make. */
export type LabFlag = "below" | "within" | "above" | "none";

/** Factual labels only — where the value sits against the range on
 *  the person's own report. Never "normal"/"abnormal". */
export const LAB_FLAG_LABELS: Record<Exclude<LabFlag, "none">, string> = {
  below: "Below the range printed on your report",
  within: "Within the range printed on your report",
  above: "Above the range printed on your report",
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanDate(value: unknown): string | null {
  const text = cleanText(value);
  if (!text || !DATE_RE.test(text)) return null;
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  /* Reject rollovers like 2026-02-31, which Date silently moves. */
  return parsed.toISOString().slice(0, 10) === text ? text : null;
}

export function parseLabResult(raw: unknown): LabResult | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = cleanText(r["id"]);
  const testName = cleanText(r["testName"]);
  const unit = cleanText(r["unit"]);
  const reportDate = cleanDate(r["reportDate"]);
  const recordedAt = cleanText(r["recordedAt"]);
  if (!id || !testName || !unit || !reportDate || !recordedAt) return null;
  if (!finite(r["value"])) return null;

  const refLow = finite(r["refLow"]) ? r["refLow"] : undefined;
  const refHigh = finite(r["refHigh"]) ? r["refHigh"] : undefined;
  /* An inverted range is a copying slip, not a range: refuse the
   * entry rather than flag against nonsense. */
  if (refLow !== undefined && refHigh !== undefined && refLow > refHigh) return null;

  const labName = cleanText(r["labName"]) ?? undefined;
  return {
    id,
    testName,
    value: r["value"],
    unit,
    reportDate,
    ...(refLow !== undefined ? { refLow } : {}),
    ...(refHigh !== undefined ? { refHigh } : {}),
    ...(labName !== undefined ? { labName } : {}),
    recordedAt,
  };
}

export function parseLabsValue(raw: unknown): LabsValue | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (r["version"] !== LABS_VERSION) return null;
  if (!Array.isArray(r["results"])) return null;
  const results: LabResult[] = [];
  for (const entry of r["results"]) {
    const parsed = parseLabResult(entry);
    if (parsed) results.push(parsed);
  }
  return { version: LABS_VERSION, results: capResults(results) };
}

/** Keep the newest LAB_RESULTS_CAP results by report date (ties by
 *  recorded order); the rest are the oldest history. */
export function capResults(results: LabResult[]): LabResult[] {
  if (results.length <= LAB_RESULTS_CAP) return results;
  return [...results]
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate) || a.recordedAt.localeCompare(b.recordedAt))
    .slice(results.length - LAB_RESULTS_CAP);
}

/**
 * The one comparison Bloom makes: the value against the reference
 * range the person copied from their own report. No range → "none".
 * Bounds are inclusive — a value exactly on a printed bound is
 * within the range the report printed.
 */
export function flagForResult(result: LabResult): LabFlag {
  const { value, refLow, refHigh } = result;
  if (refLow === undefined && refHigh === undefined) return "none";
  if (refLow !== undefined && value < refLow) return "below";
  if (refHigh !== undefined && value > refHigh) return "above";
  return "within";
}

/** The flag's factual label, or null when there is no flag to show. */
export function flagLabel(result: LabResult): string | null {
  const flag = flagForResult(result);
  return flag === "none" ? null : LAB_FLAG_LABELS[flag];
}

export interface LabSeriesPoint {
  result: LabResult;
  /** This value minus the previous result in the same name+unit
   *  series. Arithmetic only; null for the first point. */
  changeFromPrevious: number | null;
}

export interface LabGroup {
  /** Display name — the spelling on the most recent result. */
  testName: string;
  unit: string;
  /** Oldest first. */
  points: LabSeriesPoint[];
  latest: LabResult;
  latestFlag: LabFlag;
}

const groupKey = (result: LabResult): string =>
  `${result.testName.trim().toLowerCase()}\u0000${result.unit.trim()}`;

/**
 * Group results into trend series: same test name (case-insensitive)
 * AND same unit. A different unit is a different series — never
 * converted, never merged. Groups are ordered by their latest
 * report date, newest first.
 */
export function groupLabResults(results: LabResult[]): LabGroup[] {
  const byKey = new Map<string, LabResult[]>();
  for (const result of results) {
    const key = groupKey(result);
    const list = byKey.get(key);
    if (list) list.push(result);
    else byKey.set(key, [result]);
  }
  const groups: LabGroup[] = [];
  for (const list of byKey.values()) {
    const sorted = [...list].sort(
      (a, b) => a.reportDate.localeCompare(b.reportDate) || a.recordedAt.localeCompare(b.recordedAt),
    );
    const points: LabSeriesPoint[] = sorted.map((result, i) => ({
      result,
      changeFromPrevious: i === 0 ? null : result.value - sorted[i - 1]!.value,
    }));
    const latest = sorted[sorted.length - 1]!;
    groups.push({
      testName: latest.testName,
      unit: latest.unit,
      points,
      latest,
      latestFlag: flagForResult(latest),
    });
  }
  return groups.sort((a, b) => b.latest.reportDate.localeCompare(a.latest.reportDate));
}

/* ------------------------------------------------------------------ */
/* Pref wrappers                                                       */
/* ------------------------------------------------------------------ */

export function readLabResults(): LabResult[] {
  return getPref(LABS_KEY, parseLabsValue, EMPTY_LABS).results;
}

/** Store a result the person typed in. The value is re-parsed on the
 *  way in: what cannot survive the strict parser is never written. */
export function addLabResult(result: LabResult): boolean {
  if (!parseLabResult(result)) return false;
  const current = readLabResults();
  if (current.some((r) => r.id === result.id)) return false;
  const next = capResults([...current, result]);
  setPref(LABS_KEY, { version: LABS_VERSION, results: next } satisfies LabsValue);
  return true;
}

export function removeLabResult(id: string): void {
  const current = readLabResults();
  const next = current.filter((r) => r.id !== id);
  if (next.length === current.length) return;
  if (next.length === 0) clearPref(LABS_KEY);
  else setPref(LABS_KEY, { version: LABS_VERSION, results: next } satisfies LabsValue);
}
