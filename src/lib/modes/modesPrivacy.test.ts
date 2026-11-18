// @vitest-environment jsdom
/**
 * System 14 — the Condition Modes record, proven end to end.
 *
 * The active modes live under one key (`health.modes.v1`) in the shared
 * prefs document (lib/prefs → the `user_prefs` row). The generic guards
 * cover the document, but this suite pins the MODES key by name:
 *
 *   · EXPORT — the bundle the "Download everything" flow builds (the
 *     caller hands it `prefs: loadDoc()`, exactly as useExportBundle
 *     does) carries the key with the seeded value, in the JSON that is
 *     actually downloaded;
 *   · ERASE, device half — `eraseDevice()` leaves no prefs document
 *     behind, so the modes read falls back to no modes on;
 *   · ERASE, account half — the newest `erase_my_data()` deletes the
 *     caller's `user_prefs` row, the server-side home of this key
 *     (pinned generically by the erase coverage suites over the same
 *     migration set).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ hasSupabaseConfig: false, supabase: {} }));

import { PREFS_KEY, loadDoc } from "@/lib/prefs";
import { buildExport } from "@/lib/data/exportAll";
import { bloomKeys, eraseDevice } from "@/lib/data/erase";
import { EMPTY_MODES_VALUE, MODES_KEY, readModes, writeModes, type ModesValue } from "./modes";

const SEEDED: ModesValue = { version: 1, active: ["blood_sugar", "thyroid"] };

beforeEach(() => {
  window.localStorage.clear();
});

describe("condition modes · export", () => {
  it("the export bundle carries the modes key, value intact", () => {
    writeModes(SEEDED.active);
    const bundle = buildExport({ exportedAt: "2026-11-18T00:00:00.000Z", prefs: loadDoc() });
    const prefs = bundle.prefs as Record<string, { value: unknown }>;
    expect(prefs[MODES_KEY]?.value).toEqual(SEEDED);
    const file = JSON.parse(JSON.stringify(bundle)) as typeof bundle;
    expect((file.prefs as Record<string, { value: unknown }>)[MODES_KEY]?.value).toEqual(SEEDED);
  });
});

describe("condition modes · erase", () => {
  it("eraseDevice leaves no modes on this device", () => {
    writeModes(SEEDED.active);
    expect(readModes()).toEqual(SEEDED);
    expect(bloomKeys(window.localStorage)).toContain(PREFS_KEY);

    eraseDevice();

    expect(window.localStorage.getItem(PREFS_KEY)).toBeNull();
    expect(loadDoc()).toEqual({});
    expect(readModes()).toEqual(EMPTY_MODES_VALUE);
  });

  it("clearing every mode removes the key rather than storing an empty shell", () => {
    writeModes(["blood_pressure"]);
    expect(loadDoc()[MODES_KEY]).toBeDefined();
    writeModes([]);
    expect(loadDoc()[MODES_KEY]).toBeUndefined();
    expect(readModes()).toEqual(EMPTY_MODES_VALUE);
  });
});
