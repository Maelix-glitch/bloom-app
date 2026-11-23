import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CATALOG } from "./catalog";
import { productUseAllowed } from "./licensing";
import {
  evidenceCoverage,
  indexClaims,
  indexSources,
  isProductReady,
  recommendationEvidenceState,
  registryIssues,
} from "./registry";
import type { EvidenceRegistry } from "./types";

/**
 * Evidence Registry v1 — coverage of the engine's rules.
 *
 * The technical specification (§9.3) lists fifteen rules the nutrition
 * engine runs today, plus the micronutrient-gap threshold and the
 * log-adaptation ratios the build brief names with them. This suite pins
 * three things about every one of them:
 *
 *   · the rule EXISTS in the registry — a claim, and a recommendation
 *     link whose rationale names the code that implements it;
 *   · the named code is REALLY there — the file exists and contains the
 *     constant the entry claims to describe, so an entry cannot drift
 *     away from the engine it describes;
 *   · the entry's state is HONEST — a rule whose citation nobody has
 *     verified sits in the registry as a draft with no source, grade
 *     `insufficient`, confidence 0. Exactly one v1 entry is approved:
 *     the composition source, whose licence was already verified and
 *     whose claim is about provenance, not about any value's accuracy.
 *
 * Nothing here verifies a citation against its publication — that is a
 * human review step, and these tests exist so the registry keeps saying
 * so until it happens.
 */

const AS_OF = "2026-11-18";

const fileText = (rel: string): string => readFileSync(resolve(process.cwd(), rel), "utf8");

interface RulePin {
  /** The specification's row id (§9.3), or the brief's addendum. */
  rule: string;
  recommendationId: string;
  claimId: string;
  /** The implementation reference the recommendation's rationale names. */
  file: string;
  /** A string that must appear in that file — the constant or code the
   *  entry describes. */
  marker: string;
}

const RULES: readonly RulePin[] = [
  {
    rule: "E1",
    recommendationId: "vitalis.nutrition.composition-source",
    claimId: "usda-fdc-composition-source",
    file: "src/lib/nutrition/usdaReference.ts",
    marker: "usda-fooddata-central",
  },
  {
    rule: "E2",
    recommendationId: "vitalis.body.bmr-equation",
    claimId: "mifflin-st-jeor-bmr",
    file: "src/lib/health/body.ts",
    marker: "bmrOf",
  },
  {
    rule: "E3",
    recommendationId: "vitalis.body.activity-factors",
    claimId: "activity-factor-table",
    file: "src/lib/health/body.ts",
    marker: "ACTIVITY_FACTOR",
  },
  {
    rule: "E4",
    recommendationId: "vitalis.body.protein-recomp",
    claimId: "protein-recomp-2-2",
    file: "src/lib/health/body.ts",
    marker: "Morton",
  },
  {
    rule: "E5",
    recommendationId: "vitalis.body.protein-bands",
    claimId: "protein-bands-by-goal",
    file: "src/lib/health/body.ts",
    marker: "proteinPerKg",
  },
  {
    rule: "E6",
    recommendationId: "vitalis.body.energy-per-kg",
    claimId: "energy-per-kg-7700",
    file: "src/lib/nutrition/expenditure.ts",
    marker: "ENERGY_KCAL_PER_KG",
  },
  {
    rule: "E7",
    recommendationId: "vitalis.safety.rate-cap",
    claimId: "rate-cap-0-75kg-per-week",
    file: "src/lib/vitalis/domain/safety.ts",
    marker: "MAX_RATE_KG_PER_WEEK",
  },
  {
    rule: "E8",
    recommendationId: "vitalis.body.calorie-floor",
    claimId: "calorie-floors",
    file: "src/lib/health/body.ts",
    marker: "calorieFloor",
  },
  {
    rule: "E9",
    recommendationId: "vitalis.nutrition.spectrum-references",
    claimId: "spectrum-rda-2020-references",
    file: "src/lib/nutrition/dayView.ts",
    marker: "spectrumReferences",
  },
  {
    rule: "E10",
    recommendationId: "vitalis.plan.composition-caps",
    claimId: "plan-composition-derivations",
    file: "src/lib/nutrition/plan.ts",
    marker: "CAP_DRY_PULSES_G",
  },
  {
    rule: "E11",
    recommendationId: "vitalis.body.hydration-target",
    claimId: "water-efsa-drinking-share",
    file: "src/lib/health/body.ts",
    marker: "drinkingBaseMl",
  },
  {
    rule: "E12",
    recommendationId: "vitalis.guidance.healthy-diet-principles",
    claimId: "who-healthy-diet-principles",
    file: "src/lib/nutrition/plan.ts",
    marker: "variety",
  },
  {
    rule: "E13",
    recommendationId: "vitalis.safety.no-vlcd",
    claimId: "nice-ng246-individualisation",
    file: "src/lib/vitalis/domain/safety.ts",
    marker: "MIN_RATE_KG_PER_WEEK",
  },
  {
    rule: "E14",
    recommendationId: "vitalis.plan.budget-tiers",
    claimId: "budget-tier-cost-bands",
    file: "src/lib/nutrition/dishes.ts",
    marker: "BUDGET_TIER_1_MAX_PER_SERVING",
  },
  {
    rule: "E15",
    recommendationId: "vitalis.plan.dish-regions",
    claimId: "dish-region-markers",
    file: "src/lib/nutrition/regions.ts",
    marker: "dishRegion",
  },
  {
    rule: "brief: micro-gap",
    recommendationId: "vitalis.plan.micro-gap-bias",
    claimId: "micro-gap-threshold",
    file: "src/lib/nutrition/planAdaptation.ts",
    marker: "MICRO_GAP_RATIO",
  },
  {
    rule: "brief: adaptation",
    recommendationId: "vitalis.plan.log-adaptation",
    claimId: "adaptation-ratios",
    file: "src/lib/nutrition/planAdaptation.ts",
    marker: "PROTEIN_SHORTFALL_RATIO",
  },
];

describe("every rule in the specification's §9.3 table is registered", () => {
  const claimsById = indexClaims(CATALOG.claims);
  const recommendationsById = new Map(
    CATALOG.recommendations.map((link) => [link.recommendationId, link]),
  );

  it("has a claim and a recommendation link for each rule", () => {
    for (const pin of RULES) {
      const claim = claimsById.get(pin.claimId);
      expect(claim, `${pin.rule}: claim ${pin.claimId}`).toBeDefined();
      const link = recommendationsById.get(pin.recommendationId);
      expect(link, `${pin.rule}: recommendation ${pin.recommendationId}`).toBeDefined();
      expect(link?.claimIds, pin.rule).toContain(pin.claimId);
    }
  });

  it("names an implementation reference that is really in the code", () => {
    for (const pin of RULES) {
      const link = recommendationsById.get(pin.recommendationId);
      expect(link?.rationale, `${pin.rule} rationale`).toContain(pin.file);
      expect(fileText(pin.file), `${pin.rule}: ${pin.file} must contain ${pin.marker}`).toContain(
        pin.marker,
      );
    }
  });

  it("keeps the whole registry valid with the new entries in it", () => {
    expect(registryIssues(CATALOG, AS_OF)).toEqual([]);
  });
});

describe("unverified rules are recorded as unverified, never dressed up", () => {
  const claimsById = indexClaims(CATALOG.claims);

  it("every v1 entry except the composition source is a sourceless draft", () => {
    for (const pin of RULES) {
      if (pin.claimId === "usda-fdc-composition-source") continue;
      const claim = claimsById.get(pin.claimId);
      expect(claim, pin.claimId).toBeDefined();
      expect(claim?.sources, pin.claimId).toEqual([]);
      expect(claim?.reviewStatus, pin.claimId).toBe("draft");
      expect(claim?.grade, pin.claimId).toBe("insufficient");
      expect(claim?.confidence, pin.claimId).toBe(0);
      expect(claim?.reviewedOn, pin.claimId).toBeNull();
    }
  });

  it("the composition-source claim is the one approved v1 entry, and its source is the code's gate target", () => {
    const claim = claimsById.get("usda-fdc-composition-source");
    expect(claim?.reviewStatus).toBe("approved");
    expect(claim?.sources.map((link) => link.sourceId)).toEqual(["usda-fooddata-central"]);
    const sourcesById = indexSources(CATALOG.sources);
    expect(isProductReady(claim!, sourcesById, AS_OF)).toBe(true);
    // The engine's licence gate resolves the usda provenance kind to this
    // very source id — the registry entry and the code agree by string.
    expect(fileText("src/lib/nutrition/usdaReference.ts")).toContain(
      'usda: "usda-fooddata-central"',
    );
  });

  it("no claim that cites a permission-gated source is product-ready", () => {
    const sourcesById = indexSources(CATALOG.sources);
    for (const claim of CATALOG.claims) {
      const gated = claim.sources.some((link) => {
        const source = sourcesById.get(link.sourceId);
        return source !== undefined && !productUseAllowed(source.license);
      });
      if (gated) expect(isProductReady(claim, sourcesById, AS_OF), claim.id).toBe(false);
    }
    // And the gated sources themselves still say permission is required:
    // no entry in this registration upgrades a licence Bloom does not hold.
    for (const source of CATALOG.sources) {
      if (source.license === "nin-copyright-restricted" || source.id.includes("ifct")) {
        expect(source.productUseAllowed, source.id).toBe(false);
        expect(source.permissionRequired, source.id).toBe(true);
      }
    }
    expect(CATALOG.sources.some((source) => source.id.includes("indb"))).toBe(false);
  });

  it("records the ICMR RDA 2020 licence question as an open owner decision", () => {
    const claim = claimsById.get("spectrum-rda-2020-references");
    expect(claim).toBeDefined();
    const limitations = claim!.limitations.join(" ");
    expect(limitations).toContain("OPEN OWNER DECISION");
    expect(limitations).toContain("ICMR-NIN");
    // The attribution the code carries is stated, and nothing is cited.
    expect(claim!.statement).toContain("ICMR-NIN Recommended Dietary Allowances 2020");
    expect(claim!.sources).toEqual([]);
    // The values the code carries are the corrected ones: M-219
    // (audit F-09) replaced the magnesium EAR figures with the
    // RDA and made vitamin C sex-specific, as ICMR-NIN 2020
    // states them.
    const dayView = fileText("src/lib/nutrition/dayView.ts");
    expect(dayView).toContain("ICMR-NIN Recommended");
    expect(dayView).toContain('sex === "female" ? 370 : 440');
    expect(dayView).toContain('sex === "female" ? 65 : 80');
  });
});

describe("the surface's coverage view is derived only from the registry", () => {
  it("returns one row per recommendation, in catalogue order", () => {
    const rows = evidenceCoverage(CATALOG, AS_OF);
    expect(rows.map((row) => row.recommendationId)).toEqual(
      CATALOG.recommendations.map((link) => link.recommendationId),
    );
    const claimsById = indexClaims(CATALOG.claims);
    for (const row of rows) {
      // The line a surface shows is the claim's own statement — the
      // component keeps no copy of the words.
      expect(row.statement).toBe(claimsById.get(row.claimIds[0]!)?.statement);
    }
  });

  it("reports the two ready rules as ready and every v1 draft as unverified", () => {
    const rows = new Map(
      evidenceCoverage(CATALOG, AS_OF).map((row) => [row.recommendationId, row.state]),
    );
    expect(rows.get("vitalis.guidance.whole-foods")).toBe("ready");
    expect(rows.get("vitalis.nutrition.composition-source")).toBe("ready");
    for (const pin of RULES) {
      if (pin.recommendationId === "vitalis.nutrition.composition-source") continue;
      expect(rows.get(pin.recommendationId), pin.rule).toBe("unverified");
    }
  });

  it("distinguishes a licence-blocked rule from an unverified one", () => {
    // A synthetic registry: the FAO claim is checked and cited, but its
    // source is not licensed for product use — that is "blocked", not
    // "unverified", and a surface must be able to say the difference.
    const synthetic: EvidenceRegistry = {
      sources: CATALOG.sources,
      claims: CATALOG.claims,
      recommendations: [
        {
          recommendationId: "test.energy-requirements",
          claimIds: ["fao-energy-requirement-components"],
          rationale: "Synthetic link over the FAO claim, for this state check only.",
        },
      ],
      revisions: [],
    };
    expect(recommendationEvidenceState(synthetic, "test.energy-requirements", AS_OF)).toBe(
      "blocked",
    );
    expect(recommendationEvidenceState(synthetic, "test.unknown", AS_OF)).toBe("unverified");
  });
});
