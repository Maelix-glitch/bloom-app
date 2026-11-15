/**
 * Celebration — one composition for a good thing, marked properly.
 *
 * Sophisticated, not loud: a scalloped photo on a deep rose ground, two
 * small gold marks from Bloom's own sticker art (the v1 library used
 * stickers in none of its fifty templates), and the points the day earned
 * as the closing line.
 */

import { data, photo, sticker, text, tpl } from "../dsl";
import { C, ground, INK_LIGHT, rad } from "./kit";

export const CELEBRATION_TEMPLATES = [
  tpl({
    id: "celebration-kept-bloom",
    name: "Kept Bloom",
    hint: "For the day that deserves marking.",
    category: "celebration",
    tags: ["celebration", "milestone", "photo", "points"],
    tone: "dark",
    background: ground(
      rad(0.5, 0.34, 0.95, 0.8, [
        [0, C.roseDeep],
        [1, C.ink],
      ]),
      INK_LIGHT,
    ),
    storyKind: "milestone",
    seeds: [
      sticker("bloom.flower-1", 0.83, 0.155, { scale: 1.15, tint: C.goldSoft }),
      sticker("bloom.spark-2", 0.15, 0.62, { scale: 0.9, tint: C.gold }),
      photo(0.5, 0.37, 0.62, 0.4, { slot: "kept-bloom", mask: "scallop", fit: "cover" }),
      text("A DAY WORTH MARKING", 0.5, 0.635, {
        preset: "minimal",
        color: C.goldSoft,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      text("Kept bloom", 0.5, 0.715, {
        preset: "display",
        color: C.cream,
        size: 30,
      }),
      data("points", 0.5, 0.815, { variant: "inline", accent: C.gold }),
    ],
  }),
];
