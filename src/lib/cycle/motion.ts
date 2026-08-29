/**
 * Motion vocabulary for the Cycle page. One small set of spring/ease
 * presets so every transition on this route belongs to the same physical
 * language: crisp feedback for taps, soft springs for movement that means
 * something (the today marker traveling, panels expanding), and gentle
 * fades for content entering/leaving. Reduced-motion is handled globally
 * by <MotionConfig reducedMotion="user"> at the page root, which keeps
 * opacity transitions and drops transforms/layout animations.
 */

import type { Transition } from "motion/react";

/** tap feedback + small state changes */
export const TAP: Transition = { type: "spring", stiffness: 480, damping: 34 };

/** the today marker and other meaningful relocations */
export const MOVE: Transition = { type: "spring", stiffness: 150, damping: 22, mass: 0.9 };

/** content entering the page */
export const FADE: Transition = { duration: 0.22, ease: "easeOut" };

/** expanding surfaces (tray details, context rows) */
export const GROW: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 0.8 };

/** shared selection pills moving between surfaces */
export const SELECT: Transition = { type: "spring", stiffness: 320, damping: 30, mass: 0.7 };
