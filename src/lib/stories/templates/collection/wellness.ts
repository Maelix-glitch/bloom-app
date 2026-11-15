/**
 * Wellness — two compositions for looking after yourself.
 *
 * "Last Night" is built around the real sleep card on a night ground, with
 * a small circular photo as a moon-window. "In Motion" puts a photo band
 * over the movement bars on a light cream ground. Neither makes a health
 * claim — both show only what Bloom actually recorded.
 */

import { data, photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_DARK, INK_LIGHT, lin } from "./kit";

export const WELLNESS_TEMPLATES = [
  /* 01 — Night: moon mark, the live sleep card, a circular photo window. */
  tpl({
    id: "wellness-last-night",
    name: "Last Night",
    hint: "What the night actually gave you.",
    category: "wellness",
    tags: ["sleep", "night", "data", "rest"],
    tone: "dark",
    background: ground(
      lin(190, [
        [0, C.night],
        [1, C.ink],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("moon", 0.5, 0.185, 0.085, 0.048, { fill: C.goldSoft, opacity: 90 }),
      text("LAST NIGHT", 0.5, 0.275, {
        preset: "minimal",
        color: C.goldSoft,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      data("sleep", 0.5, 0.455, { variant: "card", w: 0.64, h: 0.17, accent: C.goldSoft }),
      text("rest is training too", 0.5, 0.63, {
        preset: "elegant",
        color: C.cream,
        size: 23,
      }),
      photo(0.5, 0.79, 0.19, 0.105, { slot: "night-window", mask: "circle", fit: "cover" }),
    ],
  }),

  /* 02 — Motion: photo band up top, the week's movement bars as the body,
     on the library's lightest ground. */
  tpl({
    id: "wellness-in-motion",
    name: "In Motion",
    hint: "The week's movement, drawn honestly.",
    category: "wellness",
    tags: ["movement", "activity", "data", "photo"],
    tone: "light",
    background: flat(C.cream, INK_DARK),
    seeds: [
      photo(0.5, 0.26, 0.92, 0.3, { slot: "in-motion", mask: "rounded", fit: "cover" }),
      text("IN MOTION", 0.5, 0.465, {
        preset: "minimal",
        color: C.bronze,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      data("movement", 0.5, 0.615, { variant: "bars", w: 0.66, h: 0.15, accent: C.sageDeep }),
      text("moved, and it counted", 0.5, 0.785, {
        preset: "editorial",
        color: C.ink,
        size: 21,
      }),
    ],
  }),
];
