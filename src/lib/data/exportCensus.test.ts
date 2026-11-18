// @vitest-environment jsdom
/**
 * Audit #45 — the whole health record, proven end to end in one place.
 *
 * The per-key privacy suites (bodyDataPrivacy, labsPrivacy, …) each pin one
 * or two keys. What none of them could catch is a key that exists in the app
 * but was never given a suite — the export silently leaving it behind, or
 * the erase silently leaving it on the device. So this derives the census
 * from the codebase itself: every `health.*` prefs key named in non-test
 * source must round-trip through the real export flow and be gone after
 * the real device erase. A key added tomorrow joins the census the moment
 * its module names it, and fails here until export and erase carry it.
 *
 * The flow is the app's own: keys are written with `setPref` (the write
 * every health module makes), the bundle is built exactly as
 * `useExportBundle` builds it (`prefs: loadDoc()`), and the erase is
 * `eraseDevice()` — the device half of "Erase everything".
 *
 * It also pins three stores that are NOT in the prefs document and that
 * the device erase used to miss entirely:
 *   · the legacy cycle key `bloom_cycle_logs_advanced` — cycle day logs
 *     from the predecessor page, which `usePeriodLog` still falls back to
 *     when the current store is empty, so erased cycle days resurrected;
 *   · the error log `bloom:error-log:v1` (telemetry), a colon-style key
 *     the `bloom.` prefix rule never matched;
 *   · the Coach drafts in sessionStorage — the person's own typed words,
 *     which no localStorage wipe can reach.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ hasSupabaseConfig: false, supabase: {} }));

import { loadDoc, setPref } from "@/lib/prefs";
import { buildExport } from "./exportAll";
import { eraseDevice } from "./erase";

/* jsdom rewires import.meta.url, so — like the other guard suites — the
   source tree is located from the working directory vitest runs in. */
const SRC = join(process.cwd(), "src");

/** Every `health.*` prefs key the app defines, read out of the source. */
function healthKeyCensus(): string[] {
  const keys = new Set<string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        walk(path);
      } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
        const text = readFileSync(path, "utf8");
        for (const m of text.matchAll(/"(health\.[a-zA-Z]+\.v[0-9]+)"/g)) {
          if (m[1]) keys.add(m[1]);
        }
      }
    }
  };
  walk(SRC);
  return [...keys].sort();
}

const CENSUS = healthKeyCensus();
const marker = (key: string) => ({ censusMarker: key });

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("export census · every health key the app defines", () => {
  it("found the keys to check", () => {
    /* If this trips, the source scan stopped matching and the rest of this
       file is asserting nothing. The floor is the census at audit time. */
    expect(CENSUS.length).toBeGreaterThanOrEqual(19);
    expect(CENSUS).toContain("health.body.v1");
    expect(CENSUS).toContain("health.foodlog.v1");
    expect(CENSUS).toContain("health.labs.v1");
  });

  it("every key's data appears in the downloaded export file", () => {
    for (const key of CENSUS) setPref(key, marker(key));

    /* Built exactly as useExportBundle builds it: prefs is the live doc. */
    const bundle = buildExport({ exportedAt: "2026-11-18T00:00:00.000Z", prefs: loadDoc() });

    /* Assert against the JSON that is actually downloaded, not the object. */
    const file = JSON.parse(JSON.stringify(bundle)) as {
      prefs: Record<string, { value: unknown } | undefined>;
    };
    const missing = CENSUS.filter((key) => file.prefs[key] === undefined);
    expect(missing, `export leaves these health keys behind: ${missing.join(", ")}`).toEqual([]);
    for (const key of CENSUS) {
      expect(file.prefs[key]?.value, `${key} exported with the wrong value`).toEqual(marker(key));
    }
  });
});

describe("erase census · this device", () => {
  it("eraseDevice leaves no health key behind", () => {
    for (const key of CENSUS) setPref(key, marker(key));
    expect(Object.keys(loadDoc()).sort()).toEqual(CENSUS);

    eraseDevice();

    expect(loadDoc()).toEqual({});
    expect(window.localStorage.length).toBe(0);
  });

  it("removes the legacy cycle logs, so erased days cannot resurrect", () => {
    /* usePeriodLog falls back to this key when the current store is empty;
       if it survives the erase, the wiped cycle record comes back. */
    window.localStorage.setItem("bloom_cycle_logs_advanced", JSON.stringify([{ date: "2026-11-01" }]));
    eraseDevice();
    expect(window.localStorage.getItem("bloom_cycle_logs_advanced")).toBeNull();
  });

  it("removes the app's error log, which the bloom. prefix never matched", () => {
    window.localStorage.setItem("bloom:error-log:v1", "[]");
    eraseDevice();
    expect(window.localStorage.getItem("bloom:error-log:v1")).toBeNull();
  });

  it("removes the Coach drafts held in sessionStorage — and nothing else there", () => {
    window.sessionStorage.setItem("bloom.coach.drafts.v2", JSON.stringify({ draft: "typed words" }));
    window.sessionStorage.setItem("bloom-coach-draft", "typed words");
    window.sessionStorage.setItem("someone-elses-key", "keep me");

    eraseDevice();

    expect(window.sessionStorage.getItem("bloom.coach.drafts.v2")).toBeNull();
    expect(window.sessionStorage.getItem("bloom-coach-draft")).toBeNull();
    expect(window.sessionStorage.getItem("someone-elses-key")).toBe("keep me");
  });
});
