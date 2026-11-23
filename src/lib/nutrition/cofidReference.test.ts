import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { CATALOG } from "../vitalis/evidence/catalog";
import { productUseAllowed } from "../vitalis/evidence/licensing";
import { canonicalise } from "../vitalis/evidence/seed/canonical";
import {
  COFID_REFERENCE_FOODS_RAW,
  COFID_REFERENCE_FINGERPRINT,
} from "./data/cofidReferenceData";
import { foodDisplayName } from "./displayName";
import { provenanceLabel } from "./labels";
import {
  COFID_REFERENCE_FOODS,
  COFID_REFERENCE_RETRIEVED_ON,
  COFID_REFERENCE_VERSION,
  cofidDataStamp,
  cofidDatasetVersionLine,
  findCofidReference,
} from "./cofidReference";
import {
  REFERENCE_FOODS,
  findReferenceFood,
  referenceDataStamp,
  searchReferenceFoods,
} from "./referenceFoods";
import { USDA_REFERENCE_FOODS, referenceProvenanceGate, registrySourceGate } from "./usdaReference";

/**
 * M-229: the library's first non-USDA food. Paneer ships from the UK
 * CoFID (McCance and Widdowson's Composition of Foods Integrated Dataset,
 * Public Health England, Open Government Licence v3.0) because USDA
 * FoodData Central has no paneer entry and the IFCT paneer row is
 * licence-restricted until ICMR-NIN grants written permission. This suite
 * pins the entry to the cited source with the same rigour the USDA suite
 * pins its set: exact values, fingerprint, licence gate — and a canary
 * that the word USDA appears nowhere on this food.
 */

const PANEER_ID = "cofid-12-495";

describe("the CoFID reference set (M-229)", () => {
  it("ships paneer, parsed whole by the strict N1 parser", () => {
    expect(COFID_REFERENCE_FOODS_RAW.length).toBe(1);
    // Nothing drops: the generated entry survives parsing.
    expect(COFID_REFERENCE_FOODS.length).toBe(COFID_REFERENCE_FOODS_RAW.length);
    expect(COFID_REFERENCE_FOODS[0]!.id).toBe(PANEER_ID);
  });

  it("carries CoFID's exact published values for food code 12-495, per 100 g", () => {
    /* McCance and Widdowson's CoFID 2021, "Cheese, Paneer" (12-495):
       1.3 Proximates + 1.4 Inorganics. Pinned so a data refresh that
       changes a value fails loudly instead of silently shipping it. */
    const paneer = findCofidReference(PANEER_ID)!;
    expect(paneer.name).toBe("Cheese, Paneer");
    expect(paneer.per100g).toEqual({
      kcal: 328,
      proteinG: 26,
      carbsG: 0.9,
      fatG: 24.5,
      fibreG: 0,
      sodiumMg: 19,
      potassiumMg: 69,
      magnesiumMg: 23,
      calciumMg: 537,
    });
    /* CoFID publishes no portion rows for this food: no servings are
       invented for it. */
    expect(paneer.servings).toEqual([]);
  });

  it("omits what CoFID reports only as a trace — absent, never zero", () => {
    const paneer = findCofidReference(PANEER_ID)!;
    /* CoFID 12-495 reports iron and vitamin C as "Tr" (trace). */
    expect(paneer.per100g.ironMg).toBeUndefined();
    expect(paneer.per100g.vitaminCMg).toBeUndefined();
    expect("ironMg" in paneer.per100g).toBe(false);
    expect("vitaminCMg" in paneer.per100g).toBe(false);
  });

  it("is labelled with its real source — the word USDA appears nowhere on it", () => {
    const paneer = findCofidReference(PANEER_ID)!;
    expect(paneer.provenance).toEqual({
      kind: "cofid",
      sourceId: "12-495",
      label: "UK CoFID (McCance and Widdowson)",
    });
    expect(provenanceLabel(paneer.provenance)).toBe("UK CoFID (McCance and Widdowson)");
    const stamp = cofidDataStamp(paneer)!;
    expect(stamp).toBe(
      `UK CoFID · McCance and Widdowson's Composition of Foods Integrated Dataset · 2021 update · retrieved ${COFID_REFERENCE_RETRIEVED_ON}`,
    );
    for (const surface of [paneer.id, paneer.name, paneer.provenance.label, stamp]) {
      expect(surface).not.toContain("USDA");
    }
    /* The kitchen name layer gives it its real name, like every
       reference food. */
    expect(foodDisplayName(paneer)).toEqual({ en: "Paneer", hindi: "पनीर" });
  });

  it("is classified and based like the fresh cheese it is", () => {
    const paneer = findCofidReference(PANEER_ID)!;
    expect(paneer.classification).toEqual({
      group: "dairy",
      containsEgg: false,
      containsDairy: true,
      isFlesh: false,
      isFish: false,
    });
    expect(paneer.preparation).toEqual({ state: "as_purchased" });
  });

  it("carries the content fingerprint of exactly the data it ships", () => {
    const fingerprint = createHash("sha256")
      .update(canonicalise(COFID_REFERENCE_FOODS), "utf8")
      .digest("hex");
    expect(fingerprint).toBe(COFID_REFERENCE_FINGERPRINT);
  });

  it("the fingerprint is tamper-evident: a single changed value breaks it", () => {
    const paneer = findCofidReference(PANEER_ID)!;
    const tampered = [{ ...paneer, per100g: { ...paneer.per100g, proteinG: 18.3 } }];
    const fingerprint = createHash("sha256").update(canonicalise(tampered), "utf8").digest("hex");
    expect(fingerprint).not.toBe(COFID_REFERENCE_FINGERPRINT);
  });

  it("the version stamp names the dataset, the licence and the release", () => {
    expect(COFID_REFERENCE_VERSION.dataset).toBe(
      "McCance and Widdowson's Composition of Foods Integrated Dataset (CoFID)",
    );
    expect(COFID_REFERENCE_VERSION.licence).toBe("Open Government Licence v3.0");
    expect(COFID_REFERENCE_VERSION.releases).toBe("2021 update (19 March 2021)");
    expect(COFID_REFERENCE_VERSION.retrievedOn).toBe(COFID_REFERENCE_RETRIEVED_ON);
    expect(COFID_REFERENCE_VERSION.fingerprint).toBe(COFID_REFERENCE_FINGERPRINT);
    expect(cofidDatasetVersionLine()).toContain("fingerprint 3db8ba0e");
  });

  it("passes the licence gate through the registry, honestly derived", () => {
    const paneer = findCofidReference(PANEER_ID)!;
    expect(registrySourceGate("uk-cofid-2021")).toBe(true);
    expect(referenceProvenanceGate(paneer.provenance)).toBe(true);
    const source = CATALOG.sources.find((s) => s.id === "uk-cofid-2021")!;
    expect(source.license).toBe("ogl-3.0");
    /* The row's stored answer and the licence's derived answer agree. */
    expect(source.productUseAllowed).toBe(productUseAllowed(source.license));
    expect(source.productUseAllowed).toBe(true);
  });

  it("joins the combined library without touching the USDA set", () => {
    expect(USDA_REFERENCE_FOODS.length).toBe(158);
    expect(USDA_REFERENCE_FOODS.every((f) => f.provenance.kind === "usda")).toBe(true);
    expect(REFERENCE_FOODS.length).toBe(159);
    expect(findReferenceFood(PANEER_ID)?.provenance.kind).toBe("cofid");
    expect(searchReferenceFoods("paneer")[0]?.id).toBe(PANEER_ID);
    /* The stamp dispatch keeps each set's own name on its own foods. */
    const paneer = findCofidReference(PANEER_ID)!;
    expect(referenceDataStamp(paneer)).toBe(cofidDataStamp(paneer));
    expect(referenceDataStamp(USDA_REFERENCE_FOODS[0]!)).toContain("USDA FoodData Central");
  });
});
