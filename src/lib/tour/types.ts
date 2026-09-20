/**
 * Tour types — the shape of a guided, in-app tutorial.
 *
 * Each tour is a linear sequence of steps that point at real DOM nodes
 * (via data-tour attributes). A step explains what the thing is, how to use
 * it efficiently, and what good vs bad usage looks like. Steps that target
 * unavailable navs are filtered at runtime (cycle off, signed-out, etc).
 */

export type TourId = "home" | "mood" | "trackers" | "cycle" | "coach" | "profile" | "rewards" | "global";

export type TourPlacement = "top" | "bottom" | "left" | "right" | "auto";

export interface TourStep {
  /** Stable id for analytics / resume */
  id: string;
  /** data-tour attribute value to point at, e.g. "home-habits" */
  target: string;
  /** Where to try placing the card */
  placement?: TourPlacement;
  /** Short, punchy */
  title: string;
  /** One or two sentences of what it is */
  body: string;
  /** How to be efficient — one line */
  tip?: string;
  /** Good practice */
  good?: string;
  /** Bad practice / what not to do */
  bad?: string;
  /** Optional: show only when predicate is true */
  when?: () => boolean;
}

export interface TourDefinition {
  id: TourId;
  label: string;
  description: string;
  steps: TourStep[];
}

export interface TourState {
  activeId: TourId | null;
  stepIndex: number;
  completed: Record<TourId, boolean>;
  skipped: boolean;
  /** Don't auto-show again */
  dismissed: boolean;
}
