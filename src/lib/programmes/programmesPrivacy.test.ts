// @vitest-environment jsdom
/**
 * Transformation Programmes — storage privacy. The enrolment
 * record lives under `health.programmes.v1` in the shared
 * preferences document, so it must ride the data export verbatim
 * and vanish with the device erase — pinned here by name, the way
 * the target-adjustment and assessment-history suites pin theirs.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { buildExport } from "@/lib/data/exportAll";
import { eraseDevice } from "@/lib/data/erase";
import { loadDoc } from "@/lib/prefs";
import {
  PROGRAMMES_KEY,
  EMPTY_PROGRAMMES_VALUE,
  enrolRun,
  readProgrammesValue,
  writeProgrammesValue,
} from "./programmes";

const VALUE = enrolRun(EMPTY_PROGRAMMES_VALUE, "build-and-fuel", "run-9", "2026-11-02");

describe("health.programmes.v1 — export and erasure", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("write → read round-trips through the real prefs document", () => {
    expect(readProgrammesValue()).toEqual(EMPTY_PROGRAMMES_VALUE);
    writeProgrammesValue(VALUE);
    expect(readProgrammesValue()).toEqual(VALUE);
  });

  it("rides in the export bundle's prefs, verbatim", () => {
    writeProgrammesValue(VALUE);
    const bundle = buildExport({ exportedAt: "2026-11-18T06:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[PROGRAMMES_KEY]?.value).toEqual(VALUE);
  });

  it("the device erase removes the document that holds it", () => {
    writeProgrammesValue(VALUE);
    eraseDevice();
    expect(loadDoc()[PROGRAMMES_KEY]).toBeUndefined();
    expect(readProgrammesValue()).toEqual(EMPTY_PROGRAMMES_VALUE);
  });
});
