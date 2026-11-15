/**
 * Mood — two compositions for how a day felt.
 *
 * "Mood Weather" splits the frame: a photograph above, the real mood card
 * below — the feeling is Bloom data, not a caption about a feeling.
 * "Energy, Mapped" runs an asymmetric editorial column: a tall arch photo
 * beside the energy ring.
 */

import { data, photo, text, tpl } from "../dsl";
import { C, flat, ground, INK_LIGHT, rad } from "./kit";

export const MOOD_TEMPLATES = [
  /* 01 — Split frame: photo up top, the live mood card as the lower half. */
  tpl({
    id: "mood-weather",
    name: "Mood Weather",
    hint: "A photo, and the mood it came with.",
    category: "mood",
    tags: ["mood", "data", "photo", "feeling"],
    tone: "dark",
    background: flat(C.panel, INK_LIGHT),
    storyKind: "mood",
    seeds: [
      photo(0.5, 0.3, 0.92, 0.42, { slot: "mood-scene", mask: "soft-corner", fit: "cover" }),
      text("TODAY'S WEATHER, INSIDE", 0.5, 0.565, {
        preset: "minimal",
        color: C.rose,
        size: 10,
        tracking: 0.28,
        transform: "uppercase",
      }),
      data("mood", 0.5, 0.71, { variant: "card", w: 0.62, h: 0.16, accent: C.rose }),
      text("feelings are weather, not climate", 0.5, 0.845, {
        preset: "whisper",
        color: C.creamDim,
        size: 12,
      }),
    ],
  }),

  /* 02 — Asymmetric editorial: tall arch photo on the left, energy ring and
     stacked type on the right. */
  tpl({
    id: "mood-energy-arc",
    name: "Energy, Mapped",
    hint: "Where the day's energy actually went.",
    category: "mood",
    tags: ["mood", "energy", "data", "editorial", "photo"],
    tone: "dark",
    background: ground(
      rad(0.85, 0.18, 0.9, 0.7, [
        [0, C.panelLift],
        [1, C.ink],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      photo(0.29, 0.48, 0.44, 0.66, { slot: "energy-scene", mask: "arch-soft", fit: "cover" }),
      text("ENERGY", 0.71, 0.235, {
        preset: "minimal",
        color: C.gold,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      data("energy", 0.71, 0.42, { variant: "ring", w: 0.36, h: 0.17, accent: C.gold }),
      text("where the\nday went", 0.71, 0.65, {
        preset: "editorial",
        color: C.cream,
        size: 21,
        leading: 1.08,
      }),
      text("honestly mapped", 0.71, 0.755, {
        preset: "whisper",
        color: C.creamDim,
        size: 11.5,
      }),
    ],
  }),
];
