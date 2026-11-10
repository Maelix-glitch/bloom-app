import { describe, expect, it } from "vitest";

import {
  ProvenanceError,
  ageInDays,
  assertProvenance,
  describeProvenance,
  isProvenance,
  isStale,
  mayPresentAsMeasured,
  observation,
  provenanceIssues,
  type Provenance,
} from "./provenance";

const userEntered: Provenance = { source: "user_reported", recordedAt: "2026-01-01" };

describe("provenance", () => {
  it("accepts a user-entered value", () => {
    expect(provenanceIssues(userEntered)).toEqual([]);
    expect(observation(72, userEntered)).toEqual({ value: 72, provenance: userEntered });
  });

  it("rejects an unknown source", () => {
    const bad = { source: "guessed", recordedAt: "2026-01-01" } as unknown as Provenance;
    expect(isProvenance(bad)).toBe(false);
    expect(() => assertProvenance(bad)).toThrow(ProvenanceError);
  });

  it("rejects a non-ISO timestamp", () => {
    expect(provenanceIssues({ source: "user_reported", recordedAt: "yesterday" })).toEqual([
      "recordedAt must be an ISO date or datetime",
    ]);
  });

  it("rejects out-of-range confidence", () => {
    expect(provenanceIssues({ source: "calculated", recordedAt: "2026-01-01", confidence: 1.5 })).toEqual([
      "confidence must be between 0 and 1",
    ]);
  });

  it("does not allow a measured value to be recorded as low quality", () => {
    expect(
      provenanceIssues({ source: "measured", recordedAt: "2026-01-01", quality: "low" }),
    ).toEqual(["a measured value cannot be recorded with low quality"]);
  });

  it("never presents a calculated value as a measurement", () => {
    const calculated: Provenance = {
      source: "calculated",
      recordedAt: "2026-01-01",
      method: "mifflin-st-jeor",
      methodVersion: "1.0.0",
    };
    expect(mayPresentAsMeasured(calculated, "2026-01-02")).toBe(false);
    expect(
      mayPresentAsMeasured({ source: "measured", recordedAt: "2026-01-01", confidence: 0.5 }, "2026-01-02"),
    ).toBe(false);
    expect(mayPresentAsMeasured({ source: "measured", recordedAt: "2026-01-01" }, "2026-01-02")).toBe(true);
  });

  it("treats old measurements as stale", () => {
    expect(ageInDays({ recordedAt: "2026-01-01" } as Provenance, "2026-01-11")).toBe(10);
    expect(isStale({ recordedAt: "2026-01-01" } as Provenance, "2026-03-01")).toBe(true);
    expect(isStale({ recordedAt: "2026-01-01" } as Provenance, "2026-01-20")).toBe(false);
  });

  it("describes the source in plain language", () => {
    expect(describeProvenance({ source: "calculated", recordedAt: "2026-01-01" })).toBe(
      "Calculated from your data",
    );
    expect(describeProvenance({ source: "measured", recordedAt: "2026-01-01", quality: "high" })).toBe(
      "Measured · high quality",
    );
  });
});
