/**
 * Public surface of the Cycle Intelligence engine.
 *
 * Everything here is pure: the same `CycleRecord` always produces the same
 * `IntelligenceResult`. UI code imports from this barrel and never re-derives a
 * prediction of its own.
 */

export * from "./types";
export * from "./dates";
export * from "./stats";
export * from "./record";
export * from "./baseline";
export * from "./forecast";
export * from "./phase";
export * from "./backtest";
export * from "./confidence";
export * from "./symptoms";
export * from "./variability";
export * from "./compare";
export * from "./brief";
export { analyseCycle } from "./analyse";
