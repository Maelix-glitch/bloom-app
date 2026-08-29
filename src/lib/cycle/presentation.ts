import type { BleedingState, CycleModel, DayState, FlowValue, Provenance } from "./types";

export const isBleedingState = (state: BleedingState | FlowValue | null | undefined) =>
  Boolean(state && state !== "none" && state !== "unlogged");

export function flowLabel(flow: BleedingState | FlowValue | null | undefined): string {
  switch (flow) {
    case "heavy":
      return "Heavy bleeding";
    case "medium":
      return "Medium bleeding";
    case "light":
      return "Light bleeding";
    case "spotting":
      return "Spotting";
    case "none":
      return "No bleeding logged";
    case "unlogged":
    case null:
    case undefined:
      return "Not logged";
  }
}

export function sourceLabel(provenance: Provenance | null | undefined): string {
  switch (provenance?.status) {
    case "observed":
    case "corrected":
      return "Logged by you";
    case "estimated":
      return "Bloom estimate";
    case "conflict":
      return "Needs review";
    case "unknown":
    default:
      return "Not logged";
  }
}

export function evidenceGlyph(provenance: Provenance | null | undefined): "●" | "○" | "—" {
  switch (provenance?.status) {
    case "observed":
    case "corrected":
      return "●";
    case "estimated":
      return "○";
    default:
      return "—";
  }
}

function reproductiveLabel(
  phase: DayState["reproductivePhase"] | CycleModel["currentReproductivePhase"],
): string {
  switch (phase) {
    case "follicular":
      return "Early follicular phase";
    case "ovulation":
      return "Estimated ovulation window";
    case "luteal":
      return "Luteal phase";
    default:
      return "Cycle phase unknown";
  }
}

export function currentCycleCopy(model: CycleModel) {
  const day = model.currentDay ?? null;
  const isBleeding = isBleedingState(model.currentBleedingState);
  if (!day) {
    return {
      headline: "Your cycle starts here",
      support: "Log your first period day when it starts.",
      secondary: "Bloom will keep estimates quiet until there is an anchor.",
      tonePhase: null as CycleModel["currentReproductivePhase"],
    };
  }
  if (isBleeding) {
    return {
      headline: `Period day ${day}`,
      support: `${flowLabel(model.currentBleedingState)} · ${sourceLabel(model.currentBleedingProvenance)}`,
      secondary: `${reproductiveLabel(model.currentReproductivePhase)} · ${sourceLabel(model.currentReproductiveProvenance)}`,
      tonePhase: "menstrual" as const,
    };
  }
  if (model.currentBleedingState === "none") {
    return {
      headline: `Cycle day ${day}`,
      support: `No bleeding logged today · ${sourceLabel(model.currentBleedingProvenance)}`,
      secondary: `${reproductiveLabel(model.currentReproductivePhase)} · ${sourceLabel(model.currentReproductiveProvenance).toLowerCase()}.`,
      tonePhase: model.currentReproductivePhase,
    };
  }
  return {
    headline: `Cycle day ${day}`,
    support: `Bleeding not logged today · ${sourceLabel(model.currentBleedingProvenance)}`,
    secondary: `${reproductiveLabel(model.currentReproductivePhase)} · ${sourceLabel(model.currentReproductiveProvenance).toLowerCase()}.`,
    tonePhase: model.currentReproductivePhase,
  };
}

export function dayStateCopy(state: DayState) {
  const isBleeding = isBleedingState(state.bleedingState);
  const day = state.cycleDay;
  if (isBleeding) {
    return {
      title: day ? `Period day ${day}` : "Your period",
      support: `${flowLabel(state.bleedingState)} · ${sourceLabel(state.bleedingProvenance)}`,
      secondary: `${reproductiveLabel(state.reproductivePhase)} · ${sourceLabel(state.reproductiveProvenance)}`,
    };
  }
  return {
    title: day ? `Cycle day ${day}` : "Cycle day not set",
    support: `${flowLabel(state.bleedingState)} · ${sourceLabel(state.bleedingProvenance)}`,
    secondary: `${reproductiveLabel(state.reproductivePhase)} · ${sourceLabel(state.reproductiveProvenance)}`,
  };
}
