import { describe, expect, it } from "vitest";

import {
  EvidenceReviewError,
  addMonths,
  assertTransition,
  canBeUsed,
  canTransition,
  daysUntilReview,
  isReviewOverdue,
  overdueForReview,
  reviewDueOn,
} from "./review";

const approvedRow = {
  id: "row",
  reviewedOn: "2026-01-15",
  reviewIntervalMonths: 12,
  supersededBy: null,
  reviewStatus: "approved" as const,
};

describe("review lifecycle", () => {
  it("does not allow draft to become approved without a review", () => {
    expect(canTransition("draft", "approved")).toBe(false);
    expect(() => assertTransition("draft", "approved")).toThrow(EvidenceReviewError);
    expect(() => assertTransition("draft", "approved")).toThrow(
      'cannot move evidence from "draft" to "approved"',
    );
  });

  it("allows the real path: draft, in review, approved", () => {
    expect(canTransition("draft", "in_review")).toBe(true);
    expect(canTransition("in_review", "approved")).toBe(true);
    expect(canTransition("in_review", "rejected")).toBe(true);
  });

  it("lets approved evidence be re-reviewed or retired", () => {
    expect(canTransition("approved", "in_review")).toBe(true);
    expect(canTransition("approved", "superseded")).toBe(true);
    expect(canTransition("approved", "withdrawn")).toBe(true);
  });

  it("keeps superseded and withdrawn rows terminal", () => {
    expect(canTransition("superseded", "approved")).toBe(false);
    expect(canTransition("withdrawn", "approved")).toBe(false);
    expect(canTransition("rejected", "approved")).toBe(false);
  });

  it("counts only approved evidence as usable", () => {
    expect(canBeUsed("approved")).toBe(true);
    for (const status of ["draft", "in_review", "rejected", "superseded", "withdrawn"] as const) {
      expect(canBeUsed(status), status).toBe(false);
    }
  });
});

describe("evidence ageing", () => {
  it("adds whole months without rolling past the end of a short month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-11-05", 60)).toBe("2031-11-05");
    expect(addMonths("not a date", 1)).toBeNull();
  });

  it("starts the clock at our review, not at publication", () => {
    expect(reviewDueOn(approvedRow)).toBe("2027-01-15");
  });

  it("has no due date for evidence nobody has reviewed", () => {
    expect(reviewDueOn({ reviewedOn: null, reviewIntervalMonths: 12 })).toBeNull();
    expect(isReviewOverdue({ ...approvedRow, reviewedOn: null }, "2026-11-05")).toBe(true);
  });

  it("goes overdue exactly after the due date", () => {
    expect(isReviewOverdue(approvedRow, "2027-01-15")).toBe(false);
    expect(isReviewOverdue(approvedRow, "2027-01-16")).toBe(true);
    expect(daysUntilReview(approvedRow, "2027-01-15")).toBe(0);
  });

  it("does not chase evidence that is already retired", () => {
    expect(isReviewOverdue({ ...approvedRow, supersededBy: "newer" }, "2030-01-01")).toBe(false);
    expect(isReviewOverdue({ ...approvedRow, reviewStatus: "draft" }, "2030-01-01")).toBe(false);
  });

  it("returns the re-review queue soonest-due first", () => {
    const rows = [
      // due 2026-09-01: overdue, but later than the row below
      { ...approvedRow, id: "later", reviewedOn: "2025-09-01", reviewIntervalMonths: 12 },
      // due 2026-01-01: the oldest
      { ...approvedRow, id: "sooner", reviewedOn: "2025-01-01", reviewIntervalMonths: 12 },
      // due 2027-10-01: not yet due, so not in the queue at all
      { ...approvedRow, id: "current", reviewedOn: "2026-10-01", reviewIntervalMonths: 12 },
    ];
    expect(overdueForReview(rows, "2026-11-05").map((row) => row.id)).toEqual(["sooner", "later"]);
  });
});
