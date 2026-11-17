// @vitest-environment jsdom
/**
 * Audit #45 — the body profile and the weigh-ins, proven end to end.
 *
 * Body data does not live in its own table: the profile (`health.body.v1`)
 * and the weigh-ins (`health.weighins.v1`) are keys in the one prefs
 * document (lib/prefs → the `user_prefs` row). The generic guards cover
 * the document and the table, but nothing pinned the BODY keys by name —
 * the sub-check left open on 2026-11-09. This suite seeds a real profile
 * and real weigh-ins through the same `setPref` writes the body hook
 * makes, then proves:
 *
 *   · EXPORT — the bundle the "Download everything" flow builds (the
 *     caller hands it `prefs: loadDoc()`, exactly as useExportBundle
 *     does) carries both keys with the seeded values, in the JSON that
 *     is actually downloaded;
 *   · ERASE, device half — `eraseDevice()` leaves no prefs document
 *     behind, so the body reads fall back to empty;
 *   · ERASE, account half — the newest `erase_my_data()` definition
 *     deletes the caller's `user_prefs` row, the server-side home of
 *     both keys (pinned in bodyDataEraseSql.test.ts — it reads files,
 *     so it runs in the node environment, not this jsdom suite).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ hasSupabaseConfig: false, supabase: {} }));

import {
  BODY_KEY,
  DEFAULT_BODY,
  WEIGHINS_KEY,
  parseBodyProfile,
  parseWeighIns,
  type BodyProfile,
  type WeighIn,
} from "@/lib/health/body";
import { PREFS_KEY, getPref, loadDoc, setPref, type PrefsDoc } from "@/lib/prefs";
import { buildExport } from "./exportAll";
import { bloomKeys, eraseDevice } from "./erase";

const PROFILE: BodyProfile = {
  ...DEFAULT_BODY,
  heightCm: 172,
  weightKg: 74.5,
  targetWeightKg: 70,
  age: 29,
  sex: "male",
  activity: "moderate",
  goal: "lose",
  updatedAt: "2026-11-16T07:00:00.000Z",
};

const WEIGH_INS: WeighIn[] = [
  { date: "2026-11-10", kg: 75.1 },
  { date: "2026-11-16", kg: 74.5 },
];

/** The exact writes useBodyProfile makes when a person saves body data. */
function seedBodyData(): void {
  setPref(BODY_KEY, PROFILE);
  setPref(WEIGHINS_KEY, WEIGH_INS);
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("body data · export", () => {
  it("the export bundle carries the body profile and the weigh-ins, values intact", () => {
    seedBodyData();

    /* Built exactly as useExportBundle builds it: prefs is the live doc. */
    const bundle = buildExport({ exportedAt: "2026-11-17T00:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as PrefsDoc;
    expect(prefs[BODY_KEY]?.value).toEqual(PROFILE);
    expect(prefs[WEIGHINS_KEY]?.value).toEqual(WEIGH_INS);

    /* And in the JSON file that is actually downloaded — nothing about
       the body record is dropped or summarised away on serialisation. */
    const file = JSON.parse(JSON.stringify(bundle)) as { prefs: PrefsDoc };
    expect(file.prefs[BODY_KEY]?.value).toMatchObject({
      heightCm: 172,
      weightKg: 74.5,
      targetWeightKg: 70,
      age: 29,
    });
    expect(file.prefs[WEIGHINS_KEY]?.value).toEqual(WEIGH_INS);
  });
});

describe("body data · erase", () => {
  it("eraseDevice leaves no body profile and no weigh-ins on this device", () => {
    seedBodyData();
    expect(loadDoc()[BODY_KEY]?.value).toEqual(PROFILE);
    expect(bloomKeys(window.localStorage)).toContain(PREFS_KEY);

    eraseDevice();

    expect(window.localStorage.getItem(PREFS_KEY)).toBeNull();
    expect(loadDoc()).toEqual({});
    /* The reads every body surface uses now see the empty defaults. */
    expect(getPref(BODY_KEY, parseBodyProfile, DEFAULT_BODY)).toEqual(DEFAULT_BODY);
    expect(getPref(WEIGHINS_KEY, parseWeighIns, [] as WeighIn[])).toEqual([]);
  });
});
