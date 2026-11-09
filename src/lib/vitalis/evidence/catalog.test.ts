import { describe, expect, it } from "vitest";

import { CATALOG } from "./catalog";
import { productUseAllowed } from "./licensing";
import { indexSources, productReadyClaims, registryIssues, traceability } from "./registry";
import { isReviewOverdue } from "./review";

const AS_OF = "2026-11-05";

describe("the evidence catalogue", () => {
  it("is internally consistent", () => {
    expect(registryIssues(CATALOG, AS_OF)).toEqual([]);
  });

  it("never marks a restricted source as usable in a product", () => {
    for (const source of CATALOG.sources) {
      expect(source.productUseAllowed, source.id).toBe(productUseAllowed(source.license));
      if (source.license.startsWith("nin-") || source.license === "fao-noncommercial") {
        expect(source.productUseAllowed, `${source.id} must not be product-usable`).toBe(false);
        expect(source.permissionRequired, `${source.id} must require permission`).toBe(true);
      }
    }
  });

  it("cites only https sources a reviewer can open", () => {
    for (const source of CATALOG.sources) {
      expect(source.url.startsWith("https://"), source.id).toBe(true);
      expect(source.retrievedOn, source.id).toBeTruthy();
    }
  });

  it("gives every citation a locator", () => {
    for (const claim of CATALOG.claims) {
      for (const link of claim.sources) {
        expect(link.locator.length, `${claim.id} -> ${link.sourceId}`).toBeGreaterThan(2);
      }
    }
  });

  it("records the 2020-2025 guidelines as superseded by the 2025-2030 edition", () => {
    const old = CATALOG.sources.find((source) => source.id === "dga-2020-2025");
    const current = CATALOG.sources.find((source) => source.id === "dga-2025-2030");
    expect(old).toBeDefined();
    expect(current).toBeDefined();
    expect(old?.reviewStatus).toBe("superseded");
    expect(old?.supersededBy).toBe("dga-2025-2030");
    expect(current?.reviewStatus).toBe("approved");
  });

  it("keeps the Indian food composition tables out of product use", () => {
    const ifct = CATALOG.sources.find((source) => source.id === "icmr-nin-ifct-2017");
    expect(ifct?.productUseAllowed).toBe(false);
    expect(ifct?.permissionRequired).toBe(true);
    expect(ifct?.licenseNote).toContain("electronic format");
    // Nothing may cite a dataset we are not allowed to load.
    for (const claim of CATALOG.claims) {
      expect(claim.sources.some((link) => link.sourceId === "icmr-nin-ifct-2017")).toBe(false);
    }
  });

  it("has exactly one claim that is ready to reach a person", () => {
    expect(productReadyClaims(CATALOG, AS_OF).map((claim) => claim.id)).toEqual([
      "dga-whole-foods-emphasis",
    ]);
  });

  it("records the rate cap as an unsourced assumption", () => {
    const cap = CATALOG.claims.find((claim) => claim.id === "rate-cap-1kg-per-week");
    expect(cap?.sources).toEqual([]);
    expect(cap?.grade).toBe("insufficient");
    expect(cap?.confidence).toBe(0);
    expect(cap?.reviewStatus).toBe("draft");
  });

  it("reports its own gaps rather than hiding them", () => {
    const report = traceability(CATALOG, AS_OF);
    expect(report.complete).toBe(false);
    expect(report.untraceableClaims).toEqual(["rate-cap-1kg-per-week"]);
    expect(report.licenseBlockedClaims).toEqual([
      "fao-energy-requirement-components",
      "icmr-dgi-food-variety",
    ]);
    expect(report.stalledRecommendations).toEqual(["vitalis.safety.rate-cap"]);
  });

  it("has nothing overdue today, and would notice if it did", () => {
    expect(traceability(CATALOG, AS_OF).overdue).toEqual([]);
    const farFuture = "2035-01-01";
    const overdue = traceability(CATALOG, farFuture).overdue;
    expect(overdue).toContain("dga-whole-foods-emphasis");
    expect(overdue).toContain("usda-fooddata-central");
  });

  it("never claims a superseded source is still in date", () => {
    const sourcesById = indexSources(CATALOG.sources);
    const old = sourcesById.get("dga-2020-2025");
    expect(old).toBeDefined();
    expect(isReviewOverdue(old!, "2040-01-01")).toBe(false);
  });

  it("states uncertainty and limitations on every claim", () => {
    for (const claim of CATALOG.claims) {
      expect(claim.uncertainty.length, claim.id).toBeGreaterThan(0);
      expect(claim.limitations.length, claim.id).toBeGreaterThan(0);
      expect(claim.population.length, claim.id).toBeGreaterThan(3);
    }
  });

  it("keeps a change record for every source it has revisited", () => {
    const touched = new Set(CATALOG.revisions.map((revision) => revision.entityId));
    expect(touched.has("dga-2020-2025")).toBe(true);
    expect(touched.has("dga-2025-2030")).toBe(true);
    for (const revision of CATALOG.revisions) {
      expect(revision.changedBy.length, revision.entityId).toBeGreaterThan(1);
      expect(revision.changedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
