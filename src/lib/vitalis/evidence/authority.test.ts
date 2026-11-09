import { describe, expect, it } from "vitest";

import { assessAuthority, isReliableEnough, supportIssues } from "./authority";

describe("authority assessment", () => {
  it("ranks a current guideline above a current case report", () => {
    const guideline = assessAuthority(
      { kind: "guideline", peerReviewed: false, publicationYear: 2025, reviewIntervalMonths: 60 },
      "2026-11-05",
    );
    const caseReport = assessAuthority(
      { kind: "case_report", peerReviewed: false, publicationYear: 2025, reviewIntervalMonths: 60 },
      "2026-11-05",
    );
    expect(guideline.score).toBeGreaterThan(caseReport.score);
    expect(guideline.tier).toBe("A");
    expect(caseReport.tier).toBe("D");
  });

  it("says why it scored a source as it did", () => {
    const assessment = assessAuthority(
      {
        kind: "systematic_review",
        peerReviewed: true,
        publicationYear: 2024,
        reviewIntervalMonths: 36,
      },
      "2026-11-05",
    );
    expect(assessment.reasons.join(" | ")).toContain("peer reviewed");
    expect(assessment.reasons.join(" | ")).toContain("tier A");
  });

  it("penalises a source that is past its own review interval", () => {
    const fresh = assessAuthority(
      { kind: "dataset", peerReviewed: false, publicationYear: 2025, reviewIntervalMonths: 12 },
      "2026-11-05",
    );
    const stale = assessAuthority(
      { kind: "dataset", peerReviewed: false, publicationYear: 2015, reviewIntervalMonths: 12 },
      "2026-11-05",
    );
    expect(stale.score).toBeLessThan(fresh.score);
    expect(stale.reasons.join(" | ")).toContain("past its 12-month review interval");
  });

  it("never scores outside 0–1 no matter how stale the source is", () => {
    const ancient = assessAuthority(
      { kind: "expert_opinion", peerReviewed: false, publicationYear: 1900 },
      "2026-11-05",
    );
    expect(ancient.score).toBeGreaterThanOrEqual(0);
    expect(ancient.score).toBeLessThanOrEqual(1);
    expect(ancient.tier).toBe("D");
    expect(isReliableEnough(ancient)).toBe(false);
  });

  it("will not call a claim strong on one source while another contradicts it", () => {
    const issues = supportIssues(
      [{ direction: "supports" }, { direction: "contradicts" }],
      "strong",
    );
    expect(issues.join(" ")).toContain("cannot be claimed while a cited source contradicts it");
  });

  it("will not call a claim strong with nothing supporting it", () => {
    expect(supportIssues([], "strong").join(" ")).toContain("at least one supporting citation");
    expect(supportIssues([], "insufficient")).toEqual([]);
  });

  it("requires a citation for any grade short of insufficient", () => {
    expect(supportIssues([], "moderate").join(" ")).toContain("requires at least one citation");
    expect(supportIssues([], "limited").join(" ")).toContain("requires at least one citation");
  });
});
