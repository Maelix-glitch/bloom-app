import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { CATALOG } from "../vitalis/evidence/catalog";
import { productUseAllowed } from "../vitalis/evidence/licensing";
import { canonicalise } from "../vitalis/evidence/seed/canonical";
import {
  CNF_REFERENCE_FOODS_RAW,
  CNF_REFERENCE_FINGERPRINT,
} from "./data/cnfReferenceData";
import { foodDisplayName } from "./displayName";
import { provenanceLabel } from "./labels";
import {
  CNF_REFERENCE_FOODS,
  CNF_REFERENCE_RETRIEVED_ON,
  CNF_REFERENCE_VERSION,
  cnfDataStamp,
  cnfDatasetVersionLine,
  findCnfReference,
} from "./cnfReference";
import {
  REFERENCE_FOODS,
  findReferenceFood,
  referenceDataStamp,
  searchReferenceFoods,
} from "./referenceFoods";
import { USDA_REFERENCE_FOODS, referenceProvenanceGate, registrySourceGate } from "./usdaReference";

/**
 * M-230: the second multi-source wave — healthy, high-protein foods only
 * (owner directive, 2026-11-24). These three foods ship from the
 * Canadian Nutrient File (CNF), Health Canada's national
 * food-composition database (Open Government Licence – Canada v2.0).
 * Every shipped row carries CNF Food Source Code 37 — Health Canada's
 * own CNF Sampling and Analysis Program (SNAP-CAN). CNF rows the file
 * republishes from the USDA (source code 0) were rejected for this wave:
 * a USDA value under a Canadian label would be a mislabelled value.
 * This suite pins each entry to the cited source with the same rigour
 * the USDA and CoFID suites pin theirs: exact values, fingerprint,
 * licence gate — and the wave's bar, tested.
 */

const EXPECTED: Record<
  string,
  { name: string; per100g: Record<string, number>; group: string; containsDairy: boolean }
> = {
  "cnf-6995": {
    name: "Yogourt (yogurt), fresh cheese-type (quark), fat free, plain, unsalted",
    per100g: {
      kcal: 64, proteinG: 11.23, carbsG: 3.49, fatG: 0.239, fibreG: 0,
      sodiumMg: 34, potassiumMg: 146, magnesiumMg: 11, calciumMg: 121, ironMg: 0.12, vitaminCMg: 0,
    },
    group: "dairy",
    containsDairy: true,
  },
  "cnf-6999": {
    name: "Kefir, plain, low fat (0.5-1.9% M.F.)",
    per100g: {
      kcal: 37, proteinG: 3.09, carbsG: 3, fatG: 1.42, fibreG: 0,
      sodiumMg: 38, potassiumMg: 154, magnesiumMg: 10, calciumMg: 107, ironMg: 0.09, vitaminCMg: 1.5,
    },
    group: "dairy",
    containsDairy: true,
  },
  "cnf-6330": {
    name: "Plant-based beverage, soy beverage, plain, unsweetened, fortified, refrigerated and/or shelf-stable",
    per100g: {
      kcal: 32, proteinG: 2.73, carbsG: 2.25, fatG: 1.39, fibreG: 0.6,
      sodiumMg: 26, potassiumMg: 131, magnesiumMg: 19, calciumMg: 113, ironMg: 0.53, vitaminCMg: 0.22,
    },
    group: "pulses_legumes",
    containsDairy: false,
  },
};

describe("the CNF reference set (M-230)", () => {
  it("ships three foods, parsed whole by the strict N1 parser", () => {
    expect(CNF_REFERENCE_FOODS_RAW.length).toBe(3);
    expect(CNF_REFERENCE_FOODS.length).toBe(CNF_REFERENCE_FOODS_RAW.length);
    expect(CNF_REFERENCE_FOODS.map((f) => f.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("carries the CNF's exact published values for every pick, per 100 g", () => {
    for (const [id, expected] of Object.entries(EXPECTED)) {
      const food = findCnfReference(id)!;
      expect(food.name, id).toBe(expected.name);
      expect(food.per100g, id).toEqual(expected.per100g);
      /* The CNF panel ships no portion rows for these foods: no
         servings are invented for them. */
      expect(food.servings, id).toEqual([]);
    }
  });

  it("clears the M-230 bar: high protein, whole foods, nothing sweetened", () => {
    for (const food of CNF_REFERENCE_FOODS) {
      const { proteinG, kcal } = food.per100g;
      const proteinShare = (proteinG * 4) / kcal;
      /* Quark clears the 10 g line outright. Kefir and the soy beverage
         are drinks: protein provides ~33% and ~34% of their energy —
         protein-forward by design, and the soy beverage is the CNF's
         explicitly unsweetened row. */
      expect(proteinG >= 10 || proteinShare >= 0.2, food.id).toBe(true);
      expect(food.classification.isFlesh, food.id).toBe(false);
    }
    expect(findCnfReference("cnf-6330")!.name).toContain("unsweetened");
  });

  it("is labelled with its real source — the word USDA appears nowhere on these foods", () => {
    for (const food of CNF_REFERENCE_FOODS) {
      expect(food.provenance.kind).toBe("cnf");
      expect(food.provenance.label).toBe("Canadian Nutrient File (Health Canada)");
      expect(provenanceLabel(food.provenance)).toBe("Canadian Nutrient File (Health Canada)");
      const stamp = cnfDataStamp(food)!;
      expect(stamp).toBe(
        `Canadian Nutrient File · Health Canada · 2026 files · retrieved ${CNF_REFERENCE_RETRIEVED_ON}`,
      );
      for (const surface of [food.id, food.name, food.provenance.label, stamp]) {
        expect(surface, food.id).not.toContain("USDA");
      }
    }
    expect(foodDisplayName(findCnfReference("cnf-6995")!)).toEqual({
      en: "Quark",
      hindi: "क्वार्क",
    });
    expect(foodDisplayName(findCnfReference("cnf-6330")!)).toEqual({
      en: "Soya milk (unsweetened)",
      hindi: "सोया दूध",
    });
  });

  it("is classified and based like the foods they are", () => {
    for (const [id, expected] of Object.entries(EXPECTED)) {
      const food = findCnfReference(id)!;
      expect(food.classification.group, id).toBe(expected.group);
      expect(food.classification.containsDairy, id).toBe(expected.containsDairy);
      expect(food.classification.containsEgg, id).toBe(false);
      expect(food.classification.isFlesh, id).toBe(false);
      expect(food.classification.isFish, id).toBe(false);
      expect(food.preparation, id).toEqual({ state: "as_purchased" });
    }
  });

  it("carries the content fingerprint of exactly the data it ships", () => {
    const fingerprint = createHash("sha256")
      .update(canonicalise(CNF_REFERENCE_FOODS), "utf8")
      .digest("hex");
    expect(fingerprint).toBe(CNF_REFERENCE_FINGERPRINT);
  });

  it("the fingerprint is tamper-evident: a single changed value breaks it", () => {
    const quark = findCnfReference("cnf-6995")!;
    const tampered = [{ ...quark, per100g: { ...quark.per100g, proteinG: 3.5 } }];
    const fingerprint = createHash("sha256").update(canonicalise(tampered), "utf8").digest("hex");
    expect(fingerprint).not.toBe(CNF_REFERENCE_FINGERPRINT);
  });

  it("the version stamp names the dataset, the licence and the release", () => {
    expect(CNF_REFERENCE_VERSION.dataset).toBe("Canadian Nutrient File (CNF)");
    expect(CNF_REFERENCE_VERSION.licence).toBe("Open Government Licence – Canada v2.0");
    expect(CNF_REFERENCE_VERSION.releases).toBe("2026 files (open.canada.ca)");
    expect(CNF_REFERENCE_VERSION.retrievedOn).toBe(CNF_REFERENCE_RETRIEVED_ON);
    expect(CNF_REFERENCE_VERSION.fingerprint).toBe(CNF_REFERENCE_FINGERPRINT);
    expect(cnfDatasetVersionLine()).toContain("fingerprint fa89aefd");
  });

  it("passes the licence gate through the registry, honestly derived", () => {
    expect(registrySourceGate("ca-cnf-2026")).toBe(true);
    for (const food of CNF_REFERENCE_FOODS) {
      expect(referenceProvenanceGate(food.provenance), food.id).toBe(true);
    }
    const source = CATALOG.sources.find((s) => s.id === "ca-cnf-2026")!;
    expect(source.license).toBe("ogl-canada-2.0");
    /* The row's stored answer and the licence's derived answer agree. */
    expect(source.productUseAllowed).toBe(productUseAllowed(source.license));
    expect(source.productUseAllowed).toBe(true);
  });

  it("joins the combined library without touching the USDA set", () => {
    expect(USDA_REFERENCE_FOODS.length).toBe(158);
    expect(USDA_REFERENCE_FOODS.every((f) => f.provenance.kind === "usda")).toBe(true);
    expect(REFERENCE_FOODS.length).toBe(168);
    expect(findReferenceFood("cnf-6995")?.provenance.kind).toBe("cnf");
    expect(searchReferenceFoods("quark")[0]?.id).toBe("cnf-6995");
    expect(searchReferenceFoods("kefir")[0]?.id).toBe("cnf-6999");
    /* The stamp dispatch keeps each set's own name on its own foods. */
    const quark = findCnfReference("cnf-6995")!;
    expect(referenceDataStamp(quark)).toBe(cnfDataStamp(quark));
    expect(referenceDataStamp(USDA_REFERENCE_FOODS[0]!)).toContain("USDA FoodData Central");
  });
});
