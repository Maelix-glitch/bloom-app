import { describe, expect, it } from "vitest";

import {
  EvidenceRegistryError,
  assertRegistry,
  indexSources,
  isProductReady,
  productReadyClaims,
  registryIssues,
  traceability,
} from "./registry";
import type { EvidenceClaim, EvidenceRegistry, EvidenceSource } from "./types";

const AS_OF = "2026-11-05";

function source(overrides: Partial<EvidenceSource> = {}): EvidenceSource {
  return {
    id: "a-source",
    title: "A Source",
    kind: "guideline",
    publisher: "A Publisher",
    authors: ["An Author"],
    publicationYear: 2024,
    url: "https://example.org/source",
    license: "us-public-domain",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    licenseNote: "A federal work in the public domain, recorded from the publisher's own page.",
    productUseAllowed: true,
    permissionRequired: false,
    peerReviewed: false,
    retrievedOn: AS_OF,
    publishedOn: null,
    reviewedOn: AS_OF,
    reviewIntervalMonths: 60,
    reviewStatus: "approved",
    version: 1,
    supersededBy: null,
    notes: null,
    ...overrides,
  };
}

function claim(overrides: Partial<EvidenceClaim> = {}): EvidenceClaim {
  return {
    id: "a-claim",
    statement: "A statement long enough to be a claim.",
    topic: "dietary_pattern",
    grade: "moderate",
    confidence: 0.7,
    population: "Adults in the general population",
    uncertainty: ["Something is still unknown."],
    limitations: ["It does not cover everyone."],
    contraindications: [],
    sources: [{ sourceId: "a-source", direction: "supports", locator: "Chapter 1" }],
    reviewStatus: "approved",
    version: 1,
    reviewedOn: AS_OF,
    reviewIntervalMonths: 12,
    supersededBy: null,
    ...overrides,
  };
}

function registry(overrides: Partial<EvidenceRegistry> = {}): EvidenceRegistry {
  return {
    sources: [source()],
    claims: [claim()],
    recommendations: [
      {
        recommendationId: "vitalis.test.rule",
        claimIds: ["a-claim"],
        rationale: "A rationale that explains the link.",
      },
    ],
    revisions: [],
    ...overrides,
  };
}

describe("registry validation", () => {
  it("accepts a coherent registry", () => {
    expect(registryIssues(registry(), AS_OF)).toEqual([]);
  });

  it("reports every problem at once rather than the first", () => {
    const issues = registryIssues(
      registry({
        sources: [source({ title: "", publisher: "", url: "http://insecure.example" })],
      }),
      AS_OF,
    );
    expect(issues.length).toBeGreaterThanOrEqual(3);
    expect(issues.join(" ")).toContain("title is required");
    expect(issues.join(" ")).toContain("publisher is required");
    expect(issues.join(" ")).toContain("url must be https");
  });

  it("refuses a claim that cites a source which does not exist", () => {
    const issues = registryIssues(
      registry({
        claims: [
          claim({ sources: [{ sourceId: "ghost", direction: "supports", locator: "p. 1" }] }),
        ],
      }),
      AS_OF,
    );
    expect(issues.join(" ")).toContain('cites unknown source "ghost"');
  });

  it("refuses approval with no citation", () => {
    const issues = registryIssues(registry({ claims: [claim({ sources: [] })] }), AS_OF);
    expect(issues.join(" ")).toContain("cannot be approved without any citation");
  });

  it("refuses approval while every cited source is unapproved", () => {
    const issues = registryIssues(
      registry({
        sources: [source({ reviewStatus: "in_review", reviewedOn: AS_OF })],
        claims: [claim()],
      }),
      AS_OF,
    );
    expect(issues.join(" ")).toContain("cannot be approved while every cited source is unapproved");
  });

  it("refuses to approve a claim citing a source we may not ship", () => {
    const restricted = source({
      id: "a-source",
      license: "nin-copyright-restricted",
      productUseAllowed: false,
      permissionRequired: true,
      licenseNote: "Copyright NIN; electronic storage in a product needs written permission.",
    });
    const issues = registryIssues(registry({ sources: [restricted], claims: [claim()] }), AS_OF);
    expect(issues.join(" ")).toContain("not licensed for product use");
  });

  it("requires a locator on every citation", () => {
    const issues = registryIssues(
      registry({
        claims: [
          claim({ sources: [{ sourceId: "a-source", direction: "supports", locator: "" }] }),
        ],
      }),
      AS_OF,
    );
    expect(issues.join(" ")).toContain("needs a locator a reviewer can follow");
  });

  it("requires stated uncertainty below a strong grade", () => {
    const issues = registryIssues(registry({ claims: [claim({ uncertainty: [] })] }), AS_OF);
    expect(issues.join(" ")).toContain("uncertainty must be stated unless the grade is strong");
  });

  it("requires supersession to be recorded in pairs", () => {
    const issues = registryIssues(
      registry({ sources: [source({ reviewStatus: "superseded", supersededBy: null })] }),
      AS_OF,
    );
    expect(issues.join(" ")).toContain(
      "supersededBy must be set exactly when the status is superseded",
    );
  });

  it("throws with the whole list when asserted", () => {
    expect(() => assertRegistry(registry({ claims: [claim({ confidence: 3 })] }), AS_OF)).toThrow(
      EvidenceRegistryError,
    );
  });
});

describe("product readiness", () => {
  it("accepts an approved claim whose sources are approved and licensed", () => {
    expect(productReadyClaims(registry(), AS_OF).map((entry) => entry.id)).toEqual(["a-claim"]);
  });

  it("rejects a claim whose source may not be reproduced", () => {
    const restricted = source({
      license: "fao-noncommercial",
      productUseAllowed: false,
      permissionRequired: true,
      licenseNote: "FAO copyright; commercial reuse needs written permission.",
    });
    expect(isProductReady(claim(), indexSources([restricted]), AS_OF)).toBe(false);
  });

  it("rejects a superseded source even when it is licensed", () => {
    const superseded = source({ reviewStatus: "superseded", supersededBy: "newer-source" });
    expect(isProductReady(claim(), indexSources([superseded]), AS_OF)).toBe(false);
  });

  it("rejects a claim whose review has expired", () => {
    const stale = claim({ reviewedOn: "2020-01-01", reviewIntervalMonths: 12 });
    expect(isProductReady(stale, indexSources([source()]), AS_OF)).toBe(false);
  });

  it("rejects an unapproved claim", () => {
    expect(
      isProductReady(claim({ reviewStatus: "in_review" }), indexSources([source()]), AS_OF),
    ).toBe(false);
  });
});

describe("traceability", () => {
  it("names a claim that no source backs", () => {
    const report = traceability(
      registry({
        claims: [
          claim({
            id: "rate-cap",
            sources: [],
            reviewStatus: "draft",
            reviewedOn: null,
            grade: "insufficient",
          }),
        ],
      }),
      AS_OF,
    );
    expect(report.complete).toBe(false);
    expect(report.untraceableClaims).toEqual(["rate-cap"]);
  });

  it("separates licence-blocked claims from untraceable ones", () => {
    const restricted = source({
      id: "a-source",
      license: "fao-noncommercial",
      productUseAllowed: false,
      permissionRequired: true,
      licenseNote: "FAO copyright; commercial reuse needs written permission.",
    });
    const report = traceability(
      registry({
        sources: [restricted],
        claims: [claim({ reviewStatus: "in_review" })],
      }),
      AS_OF,
    );
    expect(report.untraceableClaims).toEqual([]);
    expect(report.licenseBlockedClaims).toEqual(["a-claim"]);
    expect(report.stalledRecommendations).toEqual(["vitalis.test.rule"]);
  });

  it("lists overdue rows", () => {
    const report = traceability(
      registry({ claims: [claim({ reviewedOn: "2020-01-01", reviewIntervalMonths: 12 })] }),
      AS_OF,
    );
    expect(report.overdue).toContain("a-claim");
  });

  it("reports a complete chain as complete", () => {
    const report = traceability(registry(), AS_OF);
    expect(report.complete).toBe(true);
    expect(report.stalledRecommendations).toEqual([]);
  });
});
