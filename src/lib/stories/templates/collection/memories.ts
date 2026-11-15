/**
 * Memories — two compositions for keeping something.
 *
 * Both are multi-photo, because a memory is rarely one frame: "Two Frames"
 * is a tilted polaroid diptych with a handwritten line; "Three Small
 * Moments" is a two-over-one grid. These are the library's only multi-photo
 * designs, and the search index knows it ("two photos" lands here).
 */

import { photo, text, tpl } from "../dsl";
import { C, flat, ground, INK_LIGHT, lin } from "./kit";

export const MEMORIES_TEMPLATES = [
  /* 01 — Diptych: two polaroid frames, tilted against each other. */
  tpl({
    id: "memories-two-frames",
    name: "Two Frames",
    hint: "Two photos that belong together.",
    category: "memories",
    tags: ["memory", "photos", "keepsake", "polaroid"],
    tone: "dark",
    background: flat(C.ink, INK_LIGHT),
    seeds: [
      text("KEEP THESE", 0.5, 0.135, {
        preset: "minimal",
        color: C.gold,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      photo(0.3, 0.42, 0.44, 0.48, {
        slot: "frame-left",
        mask: "rect",
        frame: "polaroid",
        fit: "cover",
        rotation: -3,
      }),
      photo(0.7, 0.47, 0.44, 0.48, {
        slot: "frame-right",
        mask: "rect",
        frame: "polaroid",
        fit: "cover",
        rotation: 3,
      }),
      text("the day we keep", 0.5, 0.8, {
        preset: "handwritten",
        color: C.goldSoft,
        size: 25,
      }),
    ],
  }),

  /* 02 — Triptych: two frames over one, a single quiet line to close. */
  tpl({
    id: "memories-three-small",
    name: "Three Small Moments",
    hint: "Three frames, one small day.",
    category: "memories",
    tags: ["memory", "photos", "grid", "keepsake"],
    tone: "dark",
    background: ground(
      lin(180, [
        [0, C.panel],
        [1, C.ink],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      text("THREE SMALL MOMENTS", 0.5, 0.13, {
        preset: "minimal",
        color: C.creamDim,
        size: 10,
        tracking: 0.28,
        transform: "uppercase",
      }),
      photo(0.26, 0.32, 0.4, 0.28, { slot: "moment-one", mask: "rounded", fit: "cover" }),
      photo(0.74, 0.32, 0.4, 0.28, { slot: "moment-two", mask: "rounded", fit: "cover" }),
      photo(0.5, 0.6, 0.4, 0.22, { slot: "moment-three", mask: "rounded", fit: "cover" }),
      text("small, and entirely ours", 0.5, 0.8, {
        preset: "soft",
        color: C.cream,
        size: 17,
      }),
    ],
  }),
];
