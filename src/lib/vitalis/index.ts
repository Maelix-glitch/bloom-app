/**
 * Bloom Vitalis — public surface for the Phase 1 domain foundation.
 *
 * Import from `@/lib/vitalis` in app code. The submodules are also importable
 * directly; this barrel exists so callers do not need to know the layout.
 *
 * Phase 1 is the domain: units, provenance, profile, assessment completeness,
 * consent, deterministic safety states, validation and the arithmetic adapter
 * over the existing body module. Phase 2 adds the scientific evidence registry
 * (sources, claims, licensing, authority, review and traceability). Nutrition
 * intelligence and adaptive planning remain later phases and are not
 * represented here.
 *
 * Port note (Slice 1, 2026-11-10): this barrel initially carried only the
 * Slice 1 domain-foundation exports. Port note (Slice 2, 2026-11-10): the
 * upstream barrel's `./evidence/*` re-exports are restored below, now that
 * the evidence registry modules have landed.
 */

export * from "./domain/units";
export * from "./domain/provenance";
export * from "./domain/consent";
export * from "./domain/safety";
export * from "./domain/profile";
export * from "./domain/assessment";
export * from "./domain/schema";
export * from "./safety/classify";
export * from "./calc/body";

/* Phase 2 — scientific foundation. Evidence is global reference data, kept
   separate from the calculator so a number is never produced by prose. */
export * from "./evidence/types";
export * from "./evidence/licensing";
export * from "./evidence/authority";
export * from "./evidence/review";
export * from "./evidence/registry";
export * from "./evidence/catalog";
