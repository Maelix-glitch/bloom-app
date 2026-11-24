import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { CATALOG } from "../vitalis/evidence/catalog";
import { productUseAllowed } from "../vitalis/evidence/licensing";
import { canonicalise } from "../vitalis/evidence/seed/canonical";
import {
  AFCD_REFERENCE_FOODS_RAW,
  AFCD_REFERENCE_FINGERPRINT,
} from "./data/afcdReferenceData";
import { foodDisplayName } from "./displayName";
import { provenanceLabel } from "./labels";
import {
  AFCD_REFERENCE_FOODS,
  AFCD_REFERENCE_RETRIEVED_ON,
  AFCD_REFERENCE_VERSION,
  afcdDataStamp,
  afcdDatasetVersionLine,
  findAfcdReference,
} from "./afcdReference";
import {
  REFERENCE_FOODS,
  findReferenceFood,
  referenceDataStamp,
  searchReferenceFoods,
} from "./referenceFoods";
import { USDA_REFERENCE_FOODS, referenceProvenanceGate, registrySourceGate } from "./usdaReference";

/**
 * M-230: the second multi-source wave — healthy, high-protein foods only
 * (owner directive, 2026-11-24). These six foods ship from the Australian
 * Food Composition Database (AFCD), Release 3 (FSANZ, Data User Licence
 * modelled on CC BY-SA 3.0 AU). Every shipped row carries AFCD
 * Derivation "Analysed". This suite pins each entry to the cited source
 * with the same rigour the USDA and CoFID suites pin theirs: exact
 * values, fingerprint, licence gate — and the wave's bar, tested: every
 * food carries at least 10 g protein per 100 g, or protein providing at
 * least 20% of its energy.
 */

const EXPECTED: Record<
  string,
  { name: string; per100g: Record<string, number>; group: string; preparation: string }
> = {
  "afcd-F005249": {
    name: "Lupin, dehulled, splits, uncooked",
    per100g: {
      kcal: 315, proteinG: 37.5, carbsG: 10, fatG: 7.9, fibreG: 27.8,
      sodiumMg: 50, potassiumMg: 730, magnesiumMg: 189, calciumMg: 84, ironMg: 4.3,
    },
    group: "pulses_legumes",
    preparation: "raw",
  },
  "afcd-F000416": {
    name: "Bean, broad, dried",
    per100g: {
      kcal: 311, proteinG: 24.3, carbsG: 37, fatG: 2.1, fibreG: 18.6,
      sodiumMg: 21, potassiumMg: 1062, magnesiumMg: 140, calciumMg: 108, ironMg: 3.7,
    },
    group: "pulses_legumes",
    preparation: "raw",
  },
  "afcd-F006543": {
    name: "Pea, split, dried",
    per100g: {
      kcal: 341, proteinG: 23, carbsG: 50.5, fatG: 2, fibreG: 10.1,
      sodiumMg: 7, potassiumMg: 930, magnesiumMg: 95, calciumMg: 42, ironMg: 3.8, vitaminCMg: 0,
    },
    group: "pulses_legumes",
    preparation: "raw",
  },
  "afcd-F000061": {
    name: "Amaranth, grain, whole, uncooked",
    per100g: {
      kcal: 365, proteinG: 15.2, carbsG: 55.6, fatG: 6.4, fibreG: 11.1,
      sodiumMg: 2, potassiumMg: 508, magnesiumMg: 237, calciumMg: 147, ironMg: 7, vitaminCMg: 4,
    },
    group: "cereals_grains",
    preparation: "raw",
  },
  "afcd-F008209": {
    name: "Seed, chia, dried",
    per100g: {
      kcal: 436, proteinG: 23.8, carbsG: 3.1, fatG: 29.8, fibreG: 33.2,
      sodiumMg: 0, potassiumMg: 720, magnesiumMg: 380, calciumMg: 530, ironMg: 13, vitaminCMg: 0,
    },
    group: "nuts_seeds",
    preparation: "as_purchased",
  },
  "afcd-F008210": {
    name: "Seed, linseed or flaxseed",
    per100g: {
      kcal: 450, proteinG: 21.6, carbsG: 2.8, fatG: 32.6, fibreG: 32.9,
      sodiumMg: 60, potassiumMg: 630, magnesiumMg: 330, calciumMg: 180, ironMg: 5.5, vitaminCMg: 0,
    },
    group: "nuts_seeds",
    preparation: "as_purchased",
  },
};

describe("the AFCD reference set (M-230)", () => {
  it("ships six foods, parsed whole by the strict N1 parser", () => {
    expect(AFCD_REFERENCE_FOODS_RAW.length).toBe(6);
    expect(AFCD_REFERENCE_FOODS.length).toBe(AFCD_REFERENCE_FOODS_RAW.length);
    expect(AFCD_REFERENCE_FOODS.map((f) => f.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("carries AFCD's exact published values for every pick, per 100 g", () => {
    for (const [id, expected] of Object.entries(EXPECTED)) {
      const food = findAfcdReference(id)!;
      expect(food.name, id).toBe(expected.name);
      expect(food.per100g, id).toEqual(expected.per100g);
      /* AFCD publishes no portion rows for these foods in the shipped
         panel: no servings are invented for them. */
      expect(food.servings, id).toEqual([]);
    }
  });

  it("derives kcal from AFCD's kilojoules — pinned kJ / 4.184, rounded", () => {
    /* AFCD publishes energy in kJ only (Release 3 nutrient profiles):
       lupin 1320 kJ, broad bean 1300, split pea 1427, amaranth 1527,
       chia 1825, flaxseed 1883. The shipped kcal must be that
       derivation, never a number from anywhere else. */
    const kj: Record<string, number> = {
      "afcd-F005249": 1320, "afcd-F000416": 1300, "afcd-F006543": 1427,
      "afcd-F000061": 1527, "afcd-F008209": 1825, "afcd-F008210": 1883,
    };
    for (const [id, energyKj] of Object.entries(kj)) {
      expect(findAfcdReference(id)!.per100g.kcal, id).toBe(Math.round(energyKj / 4.184));
    }
  });

  it("omits the fields AFCD borrowed from other databases — absent, never relabelled", () => {
    /* AFCD's Food details sampling notes: lupin vitamin C was borrowed
       from Kohajkova et al. 2011; broad bean vitamin C from USDA SR28.
       Neither ships under an AFCD label. */
    for (const id of ["afcd-F005249", "afcd-F000416"]) {
      const food = findAfcdReference(id)!;
      expect(food.per100g.vitaminCMg, id).toBeUndefined();
      expect("vitaminCMg" in food.per100g, id).toBe(false);
    }
  });

  it("clears the M-230 bar: high protein, whole foods, nothing sweetened", () => {
    for (const food of AFCD_REFERENCE_FOODS) {
      const { proteinG, kcal } = food.per100g;
      const proteinShare = (proteinG * 4) / kcal;
      expect(proteinG >= 10 || proteinShare >= 0.2, food.id).toBe(true);
      expect(food.classification.isFlesh, food.id).toBe(false);
    }
  });

  it("is labelled with its real source — the word USDA appears nowhere on these foods", () => {
    for (const food of AFCD_REFERENCE_FOODS) {
      expect(food.provenance.kind).toBe("afcd");
      expect(food.provenance.label).toBe("Australian AFCD (FSANZ)");
      expect(provenanceLabel(food.provenance)).toBe("Australian AFCD (FSANZ)");
      const stamp = afcdDataStamp(food)!;
      expect(stamp).toBe(
        `Australian AFCD · Australian Food Composition Database · Release 3 · retrieved ${AFCD_REFERENCE_RETRIEVED_ON}`,
      );
      for (const surface of [food.id, food.name, food.provenance.label, stamp]) {
        expect(surface, food.id).not.toContain("USDA");
      }
    }
    expect(foodDisplayName(findAfcdReference("afcd-F008209")!)).toEqual({
      en: "Chia seeds",
      hindi: "चिया बीज",
    });
    expect(foodDisplayName(findAfcdReference("afcd-F000061")!)).toEqual({
      en: "Amaranth (rajgira)",
      hindi: "राजगीरा",
    });
  });

  it("is classified and based like the foods they are", () => {
    for (const [id, expected] of Object.entries(EXPECTED)) {
      const food = findAfcdReference(id)!;
      expect(food.classification.group, id).toBe(expected.group);
      expect(food.classification.containsEgg, id).toBe(false);
      expect(food.classification.containsDairy, id).toBe(false);
      expect(food.classification.isFlesh, id).toBe(false);
      expect(food.classification.isFish, id).toBe(false);
      expect(food.preparation, id).toEqual({ state: expected.preparation });
    }
  });

  it("carries the content fingerprint of exactly the data it ships", () => {
    const fingerprint = createHash("sha256")
      .update(canonicalise(AFCD_REFERENCE_FOODS), "utf8")
      .digest("hex");
    expect(fingerprint).toBe(AFCD_REFERENCE_FINGERPRINT);
  });

  it("the fingerprint is tamper-evident: a single changed value breaks it", () => {
    const chia = findAfcdReference("afcd-F008209")!;
    const tampered = [{ ...chia, per100g: { ...chia.per100g, proteinG: 16.5 } }];
    const fingerprint = createHash("sha256").update(canonicalise(tampered), "utf8").digest("hex");
    expect(fingerprint).not.toBe(AFCD_REFERENCE_FINGERPRINT);
  });

  it("the version stamp names the dataset, the licence and the release", () => {
    expect(AFCD_REFERENCE_VERSION.dataset).toBe("Australian Food Composition Database (AFCD)");
    expect(AFCD_REFERENCE_VERSION.licence).toBe(
      "FSANZ Data User Licence (modelled on CC BY-SA 3.0 AU)",
    );
    expect(AFCD_REFERENCE_VERSION.releases).toBe("Release 3");
    expect(AFCD_REFERENCE_VERSION.retrievedOn).toBe(AFCD_REFERENCE_RETRIEVED_ON);
    expect(AFCD_REFERENCE_VERSION.fingerprint).toBe(AFCD_REFERENCE_FINGERPRINT);
    expect(afcdDatasetVersionLine()).toContain("fingerprint 2ba36cb3");
  });

  it("passes the licence gate through the registry, honestly derived", () => {
    expect(registrySourceGate("au-afcd-release-3")).toBe(true);
    for (const food of AFCD_REFERENCE_FOODS) {
      expect(referenceProvenanceGate(food.provenance), food.id).toBe(true);
    }
    const source = CATALOG.sources.find((s) => s.id === "au-afcd-release-3")!;
    expect(source.license).toBe("fsanz-data-user-licence");
    /* The row's stored answer and the licence's derived answer agree. */
    expect(source.productUseAllowed).toBe(productUseAllowed(source.license));
    expect(source.productUseAllowed).toBe(true);
  });

  it("joins the combined library without touching the USDA set", () => {
    expect(USDA_REFERENCE_FOODS.length).toBe(158);
    expect(USDA_REFERENCE_FOODS.every((f) => f.provenance.kind === "usda")).toBe(true);
    expect(REFERENCE_FOODS.length).toBe(168);
    expect(findReferenceFood("afcd-F005249")?.provenance.kind).toBe("afcd");
    expect(searchReferenceFoods("chia")[0]?.id).toBe("afcd-F008209");
    expect(searchReferenceFoods("lupin")[0]?.id).toBe("afcd-F005249");
    /* The stamp dispatch keeps each set's own name on its own foods. */
    const chia = findAfcdReference("afcd-F008209")!;
    expect(referenceDataStamp(chia)).toBe(afcdDataStamp(chia));
    expect(referenceDataStamp(USDA_REFERENCE_FOODS[0]!)).toContain("USDA FoodData Central");
  });
});
