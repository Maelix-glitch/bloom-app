import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { CATALOG } from "../vitalis/evidence/catalog";
import { productUseAllowed } from "../vitalis/evidence/licensing";
import { canonicalise } from "../vitalis/evidence/seed/canonical";
import { USDA_REFERENCE_FOODS_RAW, USDA_REFERENCE_FINGERPRINT } from "./data/usdaReferenceData";
import { provenanceLabel } from "./labels";
import { parseFood } from "./parse";
import type { Food, FoodProvenance } from "./types";
import {
  USDA_REFERENCE_FOODS,
  USDA_REFERENCE_RETRIEVED_ON,
  USDA_REFERENCE_VERSION,
  findUsdaReference,
  referenceProvenanceGate,
  registrySourceGate,
  searchUsdaReference,
  usdaDataStamp,
  usdaDatasetVersionLine,
} from "./usdaReference";

/**
 * The N3 licence gate (design §4.7): the build fails if any shipped entry's
 * source fails `productUseAllowed`. IFCT and INDB are pinned as canaries —
 * this suite goes red the moment anyone tries to ship Indian composition
 * data without the written grant the registry requires.
 */

describe("the USDA reference set", () => {
  it("ships a curated staple set, parsed whole by the strict N1 parser", () => {
    expect(USDA_REFERENCE_FOODS_RAW.length).toBe(144);
    // Nothing drops: every generated entry survives parsing.
    expect(USDA_REFERENCE_FOODS.length).toBe(USDA_REFERENCE_FOODS_RAW.length);
    const ids = new Set(USDA_REFERENCE_FOODS.map((f) => f.id));
    expect(ids.size).toBe(USDA_REFERENCE_FOODS.length);
    const fdcIds = new Set(USDA_REFERENCE_FOODS.map((f) => f.provenance.sourceId));
    expect(fdcIds.size).toBe(USDA_REFERENCE_FOODS.length);
  });

  it("keeps provenance intact on every entry, FDC id and data type included", () => {
    for (const raw of USDA_REFERENCE_FOODS_RAW) {
      const food = parseFood(raw);
      expect(food).not.toBeNull();
      if (!food) continue;
      expect(food.provenance.kind).toBe("usda");
      expect(food.provenance.sourceId).toMatch(/^\d+$/);
      expect(food.id).toBe(`usda-${food.provenance.sourceId}`);
      // Foundation + SR Legacy only — Branded is excluded by design (§4.7 N3).
      expect(["Foundation", "SR Legacy"]).toContain(food.provenance.dataType);
      expect(food.provenance.label).toBe("USDA FoodData Central");
    }
  });

  it("carries the content fingerprint of exactly the data it ships", () => {
    const fingerprint = createHash("sha256")
      .update(canonicalise(USDA_REFERENCE_FOODS), "utf8")
      .digest("hex");
    expect(fingerprint).toBe(USDA_REFERENCE_FINGERPRINT);
  });

  it("the fingerprint is tamper-evident: a single changed value breaks it", () => {
    const tampered = USDA_REFERENCE_FOODS.map((f, i) =>
      i === 0 ? { ...f, per100g: { ...f.per100g, kcal: f.per100g.kcal + 1 } } : f,
    );
    const fingerprint = createHash("sha256").update(canonicalise(tampered), "utf8").digest("hex");
    expect(fingerprint).not.toBe(USDA_REFERENCE_FINGERPRINT);
  });
});

describe("the data-version stamp (audit #29)", () => {
  it("names the release each dataset's values came from, and when Bloom retrieved the set", () => {
    const foundation = USDA_REFERENCE_FOODS.find((f) => f.provenance.dataType === "Foundation");
    expect(foundation).toBeDefined();
    expect(usdaDataStamp(foundation!)).toBe(
      `USDA FoodData Central · Foundation · 2025-04-24 release · retrieved ${USDA_REFERENCE_RETRIEVED_ON}`,
    );
    const legacy = USDA_REFERENCE_FOODS.find((f) => f.provenance.dataType === "SR Legacy");
    expect(legacy).toBeDefined();
    expect(usdaDataStamp(legacy!)).toBe(
      `USDA FoodData Central · SR Legacy · 2018-04 release · retrieved ${USDA_REFERENCE_RETRIEVED_ON}`,
    );
  });

  it("stamps every reference food — none ships without a version line", () => {
    for (const food of USDA_REFERENCE_FOODS) {
      expect(usdaDataStamp(food)).toMatch(/^USDA FoodData Central · /);
    }
  });

  it("is null for a food that did not come from the dataset", () => {
    const own: Food = {
      ...USDA_REFERENCE_FOODS[0]!,
      id: "own-1",
      provenance: { kind: "user_entered", sourceId: "own-1", label: "Your value" },
    };
    expect(usdaDataStamp(own)).toBeNull();
  });

  it("the dataset version record names the dataset, licence, releases and retrieval date", () => {
    expect(USDA_REFERENCE_VERSION.dataset).toBe("USDA FoodData Central");
    expect(USDA_REFERENCE_VERSION.licence).toBe("CC0 1.0");
    expect(USDA_REFERENCE_VERSION.releases).toBe(
      "Foundation Foods 2025-04-24 release · SR Legacy 2018-04 release",
    );
    expect(USDA_REFERENCE_VERSION.retrievedOn).toBe(USDA_REFERENCE_RETRIEVED_ON);
    expect(USDA_REFERENCE_VERSION.fingerprint).toBe(USDA_REFERENCE_FINGERPRINT);
  });

  it("the record's fingerprint is the fingerprint of exactly the data shipped", () => {
    const fingerprint = createHash("sha256")
      .update(canonicalise(USDA_REFERENCE_FOODS), "utf8")
      .digest("hex");
    expect(USDA_REFERENCE_VERSION.fingerprint).toBe(fingerprint);
    /* A stamp claiming any other set disagrees with the data — the same
       comparison `seed:usda:check` enforces on the generated file. */
    const tamperedStamp = { ...USDA_REFERENCE_VERSION, fingerprint: "0".repeat(64) };
    expect(tamperedStamp.fingerprint).not.toBe(fingerprint);
    const tamperedData = USDA_REFERENCE_FOODS.map((f, i) =>
      i === 0 ? { ...f, per100g: { ...f.per100g, kcal: f.per100g.kcal + 1 } } : f,
    );
    const tamperedFingerprint = createHash("sha256")
      .update(canonicalise(tamperedData), "utf8")
      .digest("hex");
    expect(USDA_REFERENCE_VERSION.fingerprint).not.toBe(tamperedFingerprint);
  });

  it("the dataset version line renders the stamp with the short fingerprint", () => {
    expect(usdaDatasetVersionLine()).toBe(
      `USDA FoodData Central reference set · CC0 1.0 · retrieved ${USDA_REFERENCE_RETRIEVED_ON} · fingerprint ${USDA_REFERENCE_FINGERPRINT.slice(0, 8)}`,
    );
  });
});

describe("the licence gate", () => {
  it("the registry source behind the set is registered and product-allowed", () => {
    const source = CATALOG.sources.find((s) => s.id === "usda-fooddata-central");
    expect(source).toBeDefined();
    if (!source) return;
    expect(source.productUseAllowed).toBe(true);
    expect(productUseAllowed(source.license)).toBe(true);
    expect(registrySourceGate("usda-fooddata-central")).toBe(true);
  });

  it("every shipped entry passes the gate", () => {
    for (const food of USDA_REFERENCE_FOODS) {
      expect(referenceProvenanceGate(food.provenance)).toBe(true);
    }
  });

  it("CANARY: IFCT is registered but the gate rejects it — no grant, no data", () => {
    const source = CATALOG.sources.find((s) => s.id === "icmr-nin-ifct-2017");
    expect(source).toBeDefined();
    if (!source) return;
    expect(productUseAllowed(source.license)).toBe(false);
    expect(registrySourceGate("icmr-nin-ifct-2017")).toBe(false);
    const ifctProvenance: FoodProvenance = {
      kind: "ifct",
      sourceId: "ifct-0001",
      label: "ICMR-NIN IFCT",
    };
    expect(referenceProvenanceGate(ifctProvenance)).toBe(false);
    // And none of the shipped set is IFCT data wearing another badge.
    expect(USDA_REFERENCE_FOODS.every((f) => f.provenance.kind === "usda")).toBe(true);
  });

  it("CANARY: INDB has no registry source, and the gate fails closed on it", () => {
    expect(CATALOG.sources.some((s) => s.id.includes("indb"))).toBe(false);
    expect(registrySourceGate("indb")).toBe(false);
    expect(registrySourceGate("anuvaad-indb")).toBe(false);
    expect(registrySourceGate("no-such-source")).toBe(false);
  });
});

describe("food-group classification (P2)", () => {
  it("every shipped food carries exactly one group and its ingredient flags", () => {
    for (const food of USDA_REFERENCE_FOODS) {
      expect(food.classification, food.name).toBeDefined();
    }
    const counts = new Map<string, number>();
    for (const food of USDA_REFERENCE_FOODS) {
      const group = food.classification!.group;
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    expect(Object.fromEntries(counts)).toEqual({
      cereals_grains: 17,
      pulses_legumes: 16,
      dairy: 9,
      fats_oils: 10,
      eggs: 3,
      vegetables: 26,
      fruits: 13,
      nuts_seeds: 9,
      other: 41,
    });
  });

  it("the ingredient flags agree with the groups and with each other", () => {
    for (const food of USDA_REFERENCE_FOODS) {
      const c = food.classification!;
      if (c.group === "eggs") expect(c.containsEgg).toBe(true);
      if (c.group === "dairy") expect(c.containsDairy).toBe(true);
      /* Fish is flesh; nothing is fish without being flesh. */
      if (c.isFish) expect(c.isFlesh).toBe(true);
      /* Butter and ghee are dairy by ingredient, fats by group. */
      if (food.name.startsWith("Butter")) expect(c.containsDairy).toBe(true);
    }
    expect(USDA_REFERENCE_FOODS.filter((f) => f.classification!.containsEgg)).toHaveLength(3);
    expect(USDA_REFERENCE_FOODS.filter((f) => f.classification!.containsDairy)).toHaveLength(12);
    expect(USDA_REFERENCE_FOODS.filter((f) => f.classification!.isFlesh)).toHaveLength(16);
    expect(USDA_REFERENCE_FOODS.filter((f) => f.classification!.isFish)).toHaveLength(8);
    expect(
      USDA_REFERENCE_FOODS.filter((f) => f.classification!.isFlesh && !f.classification!.isFish),
    ).toHaveLength(8);
  });

  it("an entry that loses its classification in parsing fails the set", () => {
    const copy = JSON.parse(JSON.stringify(USDA_REFERENCE_FOODS_RAW)) as Array<Record<string, unknown>>;
    delete copy[0]!["classification"];
    const food = parseFood(copy[0]);
    expect(food).not.toBeNull();
    expect(food!.classification).toBeUndefined();
  });
});

describe("search over the reference set", () => {  it("finds foods by name tokens, case-insensitively", () => {
    const rice = searchUsdaReference("rice");
    expect(rice.length).toBeGreaterThan(0);
    expect(rice.every((f) => f.name.toLowerCase().includes("rice"))).toBe(true);
    expect(rice.map((f) => f.id)).toContain("usda-2512381");
    expect(searchUsdaReference("RICE").map((f) => f.id)).toEqual(rice.map((f) => f.id));
  });

  it("requires every token to match", () => {
    const hits = searchUsdaReference("olive oil");
    expect(hits.map((f) => f.id)).toEqual(["usda-171413"]);
  });

  it("returns nothing for an empty or unmatched query", () => {
    expect(searchUsdaReference("")).toEqual([]);
    expect(searchUsdaReference("   ")).toEqual([]);
    expect(searchUsdaReference("zzqqx")).toEqual([]);
  });

  it("finds a food by id", () => {
    expect(findUsdaReference("usda-171413")?.name).toBe("Oil, olive, salad or cooking");
    expect(findUsdaReference("usda-1")).toBeNull();
  });
});

/* ------------------------- adversarial gate battery ------------------------ */

/**
 * The label the lib itself assigns a USDA provenance carrying no label of
 * its own — the canonical label for the registry source, derived from
 * labels.ts rather than restated, and tied to the registry source's title.
 */
const CANONICAL_USDA_LABEL = provenanceLabel({ kind: "usda", sourceId: "x", label: "" });

/**
 * The full gate battery over a candidate raw set: every problem that should
 * stop the set shipping, as strings (empty = clean). The adversarial suite
 * runs it over tampered copies of the shipped set and requires it to catch
 * each one — a check that cannot fail is not a check.
 */
function setProblems(rawList: readonly unknown[]): string[] {
  const problems: string[] = [];
  const seenSourceIds = new Set<string>();
  rawList.forEach((raw, index) => {
    const food = parseFood(raw);
    if (!food) {
      // Covers a missing per-100 g energy value too: the strict parser
      // refuses a food whose core nutrients are incomplete.
      problems.push(`entry ${index}: fails the strict parser`);
      return;
    }
    if (seenSourceIds.has(food.provenance.sourceId)) {
      problems.push(`entry ${index}: duplicate FDC id ${food.provenance.sourceId}`);
    }
    seenSourceIds.add(food.provenance.sourceId);
    if (food.provenance.label !== CANONICAL_USDA_LABEL) {
      problems.push(
        `entry ${index}: provenance label "${food.provenance.label}" is not the registry label "${CANONICAL_USDA_LABEL}"`,
      );
    }
    if (!referenceProvenanceGate(food.provenance)) {
      problems.push(`entry ${index}: provenance fails the licence gate`);
    }
    if (!Number.isFinite(food.per100g.kcal)) {
      problems.push(`entry ${index}: no per-100 g energy value`);
    }
    // Servings must survive parsing exactly. The parser silently drops a
    // serving with a zero or negative gram weight, so a set whose servings
    // shrink in parsing is carrying a serving the gate must reject.
    const rawServings = (raw as { servings?: unknown }).servings;
    const rawServingList = Array.isArray(rawServings) ? rawServings : [];
    const servingsIntact =
      food.servings.length === rawServingList.length &&
      food.servings.every((s, i) => {
        const r = rawServingList[i] as { label?: unknown; grams?: unknown };
        return s.label === r.label && s.grams === r.grams && s.grams > 0;
      });
    if (!servingsIntact) {
      problems.push(`entry ${index}: a serving was dropped or altered by parsing`);
    }
  });
  return problems;
}

/** The mutable shape of a generated entry, for tampering with copies. */
interface RawEntry {
  per100g: Record<string, number>;
  provenance: Record<string, string>;
  servings: { label: string; grams: number }[];
}

function cloneRaw(): RawEntry[] {
  return JSON.parse(JSON.stringify(USDA_REFERENCE_FOODS_RAW)) as RawEntry[];
}

function fingerprintOf(rawList: readonly unknown[]): string {
  const foods = rawList.map((raw) => parseFood(raw));
  return createHash("sha256").update(canonicalise(foods), "utf8").digest("hex");
}

describe("adversarial: the gate catches a tampered set", () => {
  it("the shipped set itself is clean under the full battery", () => {
    expect(CANONICAL_USDA_LABEL).toBe("USDA FoodData Central");
    const source = CATALOG.sources.find((s) => s.id === "usda-fooddata-central");
    expect(CANONICAL_USDA_LABEL).toContain(source?.title ?? "");
    expect(setProblems(USDA_REFERENCE_FOODS_RAW)).toEqual([]);
  });

  it("duplicate FDC ids fail — the list parser would dedupe silently, the gate does not", () => {
    const copy = cloneRaw();
    copy.push(JSON.parse(JSON.stringify(copy[0])) as RawEntry);
    const problems = setProblems(copy);
    expect(problems.some((p) => p.includes("duplicate FDC id"))).toBe(true);
  });

  it("an entry missing its per-100 g energy fails the strict parser, and the gate", () => {
    const copy = cloneRaw();
    delete copy[0]!.per100g["kcal"];
    expect(setProblems(copy).some((p) => p.includes("strict parser"))).toBe(true);
  });

  it("an entry whose provenance label is not the registry label fails", () => {
    const copy = cloneRaw();
    copy[0]!.provenance["label"] = "ICMR-NIN IFCT";
    const problems = setProblems(copy);
    expect(problems.some((p) => p.includes("registry label"))).toBe(true);
  });

  it("a zero or negative serving gram weight fails", () => {
    const withServings = cloneRaw().findIndex((e) => e.servings.length > 0);
    expect(withServings).toBeGreaterThanOrEqual(0);
    for (const grams of [0, -50]) {
      const copy = cloneRaw();
      copy[withServings]!.servings[0]!.grams = grams;
      expect(setProblems(copy).length).toBeGreaterThan(0);
    }
  });

  it("fingerprint: flipping one value in a copy of the raw data is detected", () => {
    const nutrientFlip = cloneRaw();
    nutrientFlip[0]!.per100g["kcal"]! += 1;
    expect(fingerprintOf(nutrientFlip)).not.toBe(USDA_REFERENCE_FINGERPRINT);

    const servingFlip = cloneRaw();
    const idx = servingFlip.findIndex((e) => e.servings.length > 0);
    servingFlip[idx]!.servings[0]!.grams += 1;
    expect(fingerprintOf(servingFlip)).not.toBe(USDA_REFERENCE_FINGERPRINT);

    // The untampered copy still matches — the check is the data, not the file.
    expect(fingerprintOf(cloneRaw())).toBe(USDA_REFERENCE_FINGERPRINT);
  });
});
