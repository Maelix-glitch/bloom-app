/**
 * Audit #45, account half — the body keys' server-side home is erased.
 *
 * The body profile (`health.body.v1`) and weigh-ins (`health.weighins.v1`)
 * live in the prefs document, whose server copy is the caller's row in
 * `public.user_prefs`. eraseCoverage already proves every per-person
 * table is deleted by the newest `erase_my_data()`; this pins that table
 * BY NAME for the body record specifically, scoped to the caller, so the
 * body sub-check left open on 2026-11-09 has its own named evidence.
 *
 * Static SQL analysis, not execution — there is no Postgres in CI. The
 * device half and the export half are proven behaviourally in
 * bodyDataPrivacy.test.ts.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const MIGRATIONS = fileURLToPath(new URL("../../../supabase/migrations", import.meta.url));

describe("body data · account erase (SQL)", () => {
  it("the newest erase_my_data() deletes the caller's user_prefs row", () => {
    const defs = readdirSync(MIGRATIONS)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((file) => ({ file, sql: readFileSync(join(MIGRATIONS, file), "utf8") }))
      .filter((m) => /create or replace function public\.erase_my_data\(\)/.test(m.sql));
    const latest = defs.at(-1);
    expect(latest, "no erase_my_data() definition found in migrations").toBeDefined();
    expect(latest!.sql).toMatch(/delete from public\.user_prefs where profile_id = uid;/);
  });
});
