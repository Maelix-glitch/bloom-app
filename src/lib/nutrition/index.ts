/**
 * Nutrition (W4-3) — lib-first module.
 *
 * N1: types, strict parsers, pure math, target comparison, labelling.
 * N2: prefs storage (`health.foods.v1` / `health.foodlog.v1`), custom-food
 * CRUD, food-log operations, recents. No UI lives here.
 * N3: the USDA reference set (generated data + search + licence gate).
 * N5: the Coach photo-estimate handoff (`coachLog`) and the Overview
 * synthesis input (`overviewInput`). No UI lives here either.
 * P1: goal-based plan generation (`plan`) — deterministic, safety-gated,
 * suggestions only from the user's own foods and the reference set.
 */

export * from "./types";
export * from "./parse";
export * from "./math";
export * from "./entries";
export * from "./labels";
export * from "./targets";
export * from "./store";
export * from "./foods";
export * from "./log";
export * from "./usdaReference";
export * from "./foodImages";
export * from "./coachLog";
export * from "./overviewInput";
export * from "./plan";
export * from "./planAdaptation";
export * from "./expenditure";
export * from "./targetAdjustment";
export * from "./dayView";
export * from "./swaps";
export * from "./patterns";
export * from "./planLog";
export * from "./dishes";
export * from "./dishBrowse";
export * from "./dishLog";
export * from "./dishImages";
export * from "./displayName";
export * from "./data/foodNames";
export * from "./data/dishLibrary";
