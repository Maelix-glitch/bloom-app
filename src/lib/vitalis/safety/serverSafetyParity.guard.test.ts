/**
 * Server safety parity, pinned statically (M-250, Engine Phase A).
 *
 * The authoritative server classifier is SQL; vitest cannot execute
 * it here. What CAN be pinned — and what actually drifted in the
 * M-243 census — is the law inside the migration that currently
 * defines `health_record_safety_event()`:
 *
 *   · the pace line is the client's MAX_RATE_KG_PER_WEEK (0.75), and
 *     the retired 1.0 line appears nowhere in the defining file;
 *   · the `underweight_target` destination gate exists, fed by the
 *     latest `target_weight` observation and judged at UNDERWEIGHT_BMI;
 *   · the severe-underweight line is SEVERE_UNDERWEIGHT_BMI;
 *   · the four caution-condition labels match the client's
 *     conditionLabel() mapping;
 *   · the rules version the function stamps is the client's
 *     SAFETY_RULES_VERSION, not the retired 1.0.0;
 *   · the newest migration defining the function is the parity one —
 *     a later migration that redefines it must re-earn these pins.
 *
 * The needles are built from the client's own constants, so if the
 * client's law ever changes, this guard fails until the SQL is
 * brought along — drift becomes a red test, not a census discovery.
 * The behavioural half of the contract is the shared corpus
 * (safetyParityCases.ts), run against the client classifier in
 * safetyParity.test.ts and shaped for a future live SQL runner.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAX_RATE_KG_PER_WEEK,
  SAFETY_RULES_VERSION,
  SEVERE_UNDERWEIGHT_BMI,
  UNDERWEIGHT_BMI,
} from "../domain/safety";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const FUNCTION_NEEDLE = "function public.health_record_safety_event()";

function definingMigrations(): { file: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => ({ file, sql: readFileSync(join(MIGRATIONS_DIR, file), "utf8") }))
    .filter(({ sql }) => sql.includes(FUNCTION_NEEDLE));
}

describe("server safety parity — the defining migration carries the client's law", () => {
  const defining = definingMigrations();
  const latest = defining.at(-1);

  it("the newest definition of the safety function is the Phase A parity migration", () => {
    expect(latest).toBeDefined();
    expect(latest!.file).toBe("20261125_engine_phase_a_safety_parity.sql");
  });

  it("stamps the client's current rules version, never the retired one", () => {
    /* Pinned at the declare line itself: the migration's header prose
       legitimately names the retired version while explaining the bump. */
    expect(latest!.sql).toContain(`rules_version constant text := '${SAFETY_RULES_VERSION}'`);
    expect(latest!.sql).not.toContain("rules_version constant text := 'vitalis-safety-1.0.0'");
  });

  it("warns at the client's pace cap, and the retired 1.0 line is gone", () => {
    expect(latest!.sql).toContain(`rate > ${MAX_RATE_KG_PER_WEEK}`);
    expect(latest!.sql).toContain(`caps weight change at ${MAX_RATE_KG_PER_WEEK} kg per week`);
    expect(latest!.sql).not.toContain("rate > 1");
    expect(latest!.sql).not.toContain("caps weight change at 1 kg per week");
  });

  it("carries the underweight_target destination gate, fed by the target_weight observation", () => {
    expect(latest!.sql).toContain("'underweight_target'");
    expect(latest!.sql).toContain("o.kind = 'target_weight'");
    expect(latest!.sql).toContain(`target_bmi_value < ${UNDERWEIGHT_BMI}`);
    expect(latest!.sql).toContain("goal_text = 'lose'");
  });

  it("keeps the severe-underweight and underweight lines at the client's BMI constants", () => {
    expect(latest!.sql).toContain(`bmi_value < ${SEVERE_UNDERWEIGHT_BMI}`);
    expect(latest!.sql).toContain(`bmi_value < ${UNDERWEIGHT_BMI}`);
  });

  it("labels the four caution conditions the way the client's conditionLabel() does", () => {
    for (const label of [
      "type 2 diabetes (not on insulin)",
      "PCOS",
      "a thyroid disorder",
      "high blood pressure (hypertension)",
    ]) {
      expect(latest!.sql).toContain(label);
    }
  });

  it("keeps the function's no-argument, caller-record-only contract", () => {
    expect(latest!.sql).toContain("create or replace function public.health_record_safety_event()");
    expect(latest!.sql).toContain("grant execute on function public.health_record_safety_event() to authenticated");
  });
});
