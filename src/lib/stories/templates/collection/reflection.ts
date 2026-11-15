/**
 * Reflection — one composition for thinking something over.
 *
 * "One Line" is the library's second genuinely typographic archetype: a
 * handwritten line (Caveat, scoped to Stories) on a paper-textured gold
 * ground, with room around it to actually think. No photo slot, no data —
 * the sentence is the whole design.
 */

import { shape, text, tpl } from "../dsl";
import { C, ground, INK_DARK, lin, textured } from "./kit";

export const REFLECTION_TEMPLATES = [
  tpl({
    id: "reflection-one-line",
    name: "One Line",
    hint: "One handwritten line is enough.",
    category: "reflection",
    tags: ["reflection", "gratitude", "text", "journal", "minimal"],
    tone: "light",
    background: textured(
      ground(
        lin(165, [
          [0, C.goldPale],
          [1, C.cream],
        ]),
        INK_DARK,
      ),
      "paper",
      0.16,
    ),
    storyKind: "reflection",
    seeds: [
      shape("line", 0.5, 0.3, 0.14, 0.003, { fill: C.bronze, opacity: 55 }),
      text("today taught me…", 0.5, 0.47, {
        preset: "handwritten",
        color: C.ink,
        size: 31,
      }),
      text("ONE LINE IS ENOUGH", 0.5, 0.6, {
        preset: "minimal",
        color: C.bronze,
        size: 9,
        tracking: 0.28,
        transform: "uppercase",
      }),
    ],
  }),
];
