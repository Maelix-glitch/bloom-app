/**
 * Everyday — three compositions for ordinary days.
 *
 * v2 rule: no two templates in the whole library share a composition family.
 * "Full Frame" is a photograph edge to edge with the day stamped on it;
 * "The Day in Numbers" is an editorial split — type and a photo window over
 * the real habits list; "Golden Arch" is the arch portrait the reskin made
 * Bloom's signature shape, closed by the points it earned.
 */

import { data, photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_LIGHT, lin, rad } from "./kit";

export const EVERYDAY_TEMPLATES = [
  /* 01 — Full-bleed photograph; the date rides on it as live data, the
     caption sits in a glass veil over a vignette foot. */
  tpl({
    id: "everyday-full-frame",
    name: "Full Frame",
    hint: "One photo, edge to edge, honestly captioned.",
    category: "everyday",
    tags: ["photo", "morning", "daily", "minimal"],
    tone: "dark",
    background: flat(C.ink, INK_LIGHT),
    seeds: [
      photo(0.5, 0.5, 1, 1, { slot: "full-frame", fit: "cover", mask: "rect" }),
      shape("vignette", 0.5, 0.79, 1, 0.42, { fill: C.ink, opacity: 42 }),
      data("today", 0.5, 0.155, { variant: "inline", accent: C.goldSoft }),
      shape("line", 0.5, 0.655, 0.16, 0.003, { fill: C.gold, opacity: 75 }),
      text("Today, as it was", 0.5, 0.72, {
        preset: "editorial",
        color: C.cream,
        size: 29,
        backdrop: "veil",
        backdropColor: C.ink,
      }),
      text("one honest frame", 0.5, 0.775, {
        preset: "whisper",
        color: C.goldSoft,
        size: 12.5,
      }),
    ],
  }),

  /* 02 — Editorial split: headline and photo window up top, the day's real
     habits as the centrepiece, the streak as the sign-off. */
  tpl({
    id: "everyday-day-in-numbers",
    premium: true,
    name: "The Day in Numbers",
    hint: "Your habits, counted, the day at a glance.",
    category: "everyday",
    tags: ["data", "habits", "daily", "editorial"],
    tone: "dark",
    background: ground(
      lin(165, [
        [0, C.panelLift],
        [1, C.ink],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      text("The day,\nin numbers", 0.33, 0.235, {
        preset: "display",
        color: C.cream,
        align: "left",
        size: 31,
        leading: 1.04,
      }),
      photo(0.79, 0.225, 0.3, 0.21, { slot: "day-window", mask: "soft-corner", fit: "cover" }),
      data("habits", 0.5, 0.53, { variant: "list", w: 0.72, h: 0.3, accent: C.sage }),
      data("streak", 0.5, 0.765, { variant: "inline", accent: C.gold }),
      text("counted, not judged", 0.5, 0.835, {
        preset: "whisper",
        color: C.creamDim,
        size: 12,
      }),
    ],
  }),

  /* 03 — The arch: a gold-ruled portrait arch on a radial dusk, closed by
     the points the day earned. */
  tpl({
    id: "everyday-golden-arch",
    premium: true,
    name: "Golden Arch",
    hint: "A portrait in the arch, lit gold.",
    category: "everyday",
    tags: ["photo", "arch", "gold", "portrait"],
    tone: "dark",
    background: ground(
      rad(0.5, 0.3, 0.95, 0.75, [
        [0, C.panelLift],
        [1, C.ink],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("arch", 0.5, 0.43, 0.79, 0.58, {
        fill: null,
        stroke: C.goldDeep,
        strokeWidth: 1,
        opacity: 55,
      }),
      photo(0.5, 0.43, 0.72, 0.53, { slot: "golden-arch", mask: "arch", fit: "cover" }),
      text("GOLDEN HOUR", 0.5, 0.135, {
        preset: "minimal",
        color: C.goldSoft,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      text("the light did it", 0.5, 0.765, {
        preset: "elegant",
        color: C.cream,
        size: 25,
      }),
      data("points", 0.5, 0.835, { variant: "inline", accent: C.gold }),
    ],
  }),
];
