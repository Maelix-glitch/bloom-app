/**
 * Progress — three compositions for evidence of change.
 *
 * A ring, a list and a poster: three genuinely different ways to say the
 * same true thing. The data is the centrepiece in all three — the streak
 * ring, the habits list, the points card are live Bloom data, never
 * decoration.
 */

import { data, photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_DARK, INK_LIGHT, lin, textured } from "./kit";

export const PROGRESS_TEMPLATES = [
  /* 01 — The streak as a ring over fern-dark green, a photo band as proof. */
  tpl({
    id: "progress-streak-ring",
    premium: true,
    name: "Streak, Circled",
    hint: "The ring says how long. The photo says how.",
    category: "progress",
    tags: ["streak", "data", "photo"],
    tone: "dark",
    background: ground(
      lin(170, [
        [0, C.fern],
        [1, C.fernDeep],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      text("KEPT GOING", 0.5, 0.15, {
        preset: "minimal",
        color: C.sage,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      data("streak", 0.5, 0.35, { variant: "ring", w: 0.5, h: 0.23, accent: C.gold }),
      text("day after day", 0.5, 0.555, {
        preset: "editorial",
        color: C.cream,
        size: 24,
      }),
      photo(0.5, 0.755, 0.84, 0.19, { slot: "streak-proof", mask: "rounded", fit: "cover" }),
    ],
  }),

  /* 02 — A small win on a light gold ground: the habits list is the story,
     the points are the receipt. The composer's "small win" door opens here. */
  tpl({
    id: "progress-showed-up",
    name: "Showed Up",
    hint: "Say the thing you did, the list backs you up.",
    category: "progress",
    tags: ["progress", "win", "habits", "data"],
    tone: "light",
    background: ground(
      lin(180, [
        [0, C.goldPale],
        [1, C.goldSoft],
      ]),
      INK_DARK,
    ),
    storyKind: "win",
    seeds: [
      photo(0.5, 0.195, 0.84, 0.16, { slot: "showed-up-scene", mask: "rounded", fit: "cover" }),
      text("SMALL WIN", 0.5, 0.325, {
        preset: "minimal",
        color: C.bronze,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      text("I showed up", 0.5, 0.405, {
        preset: "editorial",
        color: C.ink,
        size: 28,
      }),
      shape("underline-hand", 0.5, 0.46, 0.32, 0.013, { fill: C.sageDeep, opacity: 80 }),
      data("habits", 0.5, 0.645, { variant: "list", w: 0.66, h: 0.26, accent: C.bronze }),
      data("points", 0.5, 0.845, { variant: "inline", accent: C.bronze }),
    ],
  }),

  /* 03 — The poster: pure typography on grained ink. No photo slot — this
     archetype is genuinely typographic; the points card is its only data. */
  tpl({
    id: "progress-poster",
    premium: true,
    name: "The Poster",
    hint: "Big type, no photo. For when the words are the win.",
    category: "progress",
    tags: ["progress", "poster", "type", "minimal"],
    tone: "dark",
    background: textured(flat(C.ink, INK_LIGHT), "grain", 0.12),
    seeds: [
      shape("ring", 0.5, 0.27, 0.3, 0.17, {
        fill: null,
        stroke: C.gold,
        strokeWidth: 1,
        opacity: 55,
      }),
      shape("star-4", 0.5, 0.27, 0.034, 0.02, { fill: C.gold, opacity: 85 }),
      text("STILL\nGOING", 0.5, 0.5, {
        preset: "poster",
        color: C.cream,
        size: 46,
        leading: 1.02,
        tracking: 0.02,
      }),
      text("ONE DAY AT A TIME", 0.5, 0.635, {
        preset: "condensed",
        color: C.gold,
        size: 14,
        tracking: 0.2,
        transform: "uppercase",
      }),
      data("points", 0.5, 0.78, { variant: "card", w: 0.5, h: 0.13, accent: C.gold }),
    ],
  }),
];
