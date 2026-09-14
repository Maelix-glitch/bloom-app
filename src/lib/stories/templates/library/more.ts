/**
 * Batch 3 — thirty more designs, each built on a photographic backdrop so the
 * library keeps the boards' look while every photo stays an editable slot and
 * every number still comes from a data layer.
 */

import { data, photo, photoBg, preset, shape, sticker, text, tpl } from "../dsl";
import type { StoryTemplateDef } from "../dsl";

export const MORE_TEMPLATES: StoryTemplateDef[] = [
  tpl({
    id: "morning-light", name: "Early Light", hint: "Sun through the window", category: "morning",
    tags: ["morning", "light", "calm"], tone: "light",
    background: photoBg("/bloom/templates/window-light.jpg", "#3b352c"),
    seeds: [
      text("Morning\nLight", 0.2, 0.1, { z: 5, preset: "handwritten", color: "#3b352c", align: "left", size: 1.1 }),
      photo(0.55, 0.55, 0.5, 0.32, { mask: "rounded", z: 2, shadow: true, filterId: "warm" }),
      text("Start soft, start slow", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(59,53,44,0.75)", size: 0.78, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "first-coffee", name: "First Cup", hint: "The ritual before the day", category: "morning",
    tags: ["coffee", "morning", "ritual"], tone: "dark",
    background: photoBg("/bloom/templates/coffee-dark.jpg", "#F0E7DA"),
    seeds: [
      text("First\nCoffee", 0.22, 0.12, { z: 5, preset: "elegant", color: "#F0E7DA", align: "left", size: 1.1 }),
      photo(0.62, 0.56, 0.46, 0.3, { mask: "soft-corner", z: 2, shadow: true }),
      text("Then the world can wait", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(240,231,218,0.8)", size: 0.78, transform: "uppercase", tracking: 0.12 }),
      sticker("day.coffee", 0.82, 0.2, { scale: 0.8, z: 6 }),
    ],
  }),
  tpl({
    id: "sea-breeze", name: "Sea Breeze", hint: "Salt air, clear head", category: "travel",
    tags: ["sea", "travel", "calm"], tone: "light",
    background: photoBg("/bloom/templates/ocean-horizon.jpg", "#1F3A4A"),
    seeds: [
      text("Sea\nBreeze", 0.5, 0.12, { z: 5, preset: "elegant", color: "#F4FAFC", size: 1.15, shadow: true }),
      photo(0.5, 0.5, 0.54, 0.3, { mask: "rect", frame: "polaroid", rotation: -3, z: 2, shadow: true }),
      text("Salt water heals differently", 0.5, 0.88, { z: 5, preset: "note", color: "rgba(244,250,252,0.9)", size: 0.78, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "palm-escape", name: "Palm Escape", hint: "Somewhere warmer", category: "travel",
    tags: ["palm", "escape", "warm"], tone: "dark",
    background: photoBg("/bloom/templates/palm-dusk.jpg", "#F7F1E3"),
    seeds: [
      text("Palm\nEscape", 0.24, 0.12, { z: 5, preset: "handwritten", color: "#F7F1E3", align: "left", size: 1.1 }),
      photo(0.6, 0.56, 0.48, 0.36, { mask: "arch", z: 2, shadow: true, filterId: "golden" }),
      text("Book the ticket", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(247,241,227,0.85)", size: 0.78, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
  tpl({
    id: "golden-hour-walk", name: "Golden Hour Walk", hint: "Chasing the low sun", category: "nature",
    tags: ["golden", "walk", "field"], tone: "dark",
    background: photoBg("/bloom/templates/sunset-field.jpg", "#FDF6E9"),
    seeds: [
      text("Golden\nHour Walk", 0.5, 0.12, { z: 5, preset: "handwritten", color: "#FDF6E9", size: 1.1, shadow: true }),
      photo(0.5, 0.54, 0.52, 0.3, { mask: "rounded", z: 2, shadow: true, filterId: "golden" }),
      text("The day's best light", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(253,246,233,0.9)", size: 0.78, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "starlit", name: "Starlit", hint: "A quiet sky full of stars", category: "night",
    tags: ["night", "stars", "calm"], tone: "dark",
    background: photoBg("/bloom/templates/night-moon.jpg", "#F4EFE4"),
    seeds: [
      text("Starlit", 0.5, 0.14, { z: 5, preset: "elegant", color: "#F4EFE4", size: 1.2 }),
      photo(0.5, 0.52, 0.44, 0.34, { mask: "circle", z: 2, shadow: true }),
      text("Look up, breathe out", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(244,239,228,0.75)", size: 0.78, transform: "uppercase", tracking: 0.16 }),
      sticker("bloom.spark-2", 0.8, 0.24, { scale: 0.7, tint: "#EED9A4", z: 6 }),
    ],
  }),
  tpl({
    id: "quiet-rain", name: "Quiet Rain", hint: "A moody day indoors", category: "mood",
    tags: ["rain", "moody", "calm"], tone: "dark",
    background: photoBg("/bloom/templates/dark-botanical.jpg", "#F0E7DA"),
    seeds: [
      text("Quiet\nRain", 0.22, 0.12, { z: 5, preset: "elegant", color: "#F0E7DA", align: "left", size: 1.1 }),
      photo(0.6, 0.53, 0.46, 0.32, { mask: "rounded", z: 2, shadow: true, filterId: "matte" }),
      text("Some days are for resting", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(240,231,218,0.75)", size: 0.78, transform: "uppercase", tracking: 0.12 }),
    ],
  }),
  tpl({
    id: "marble-minimal", name: "Marble Minimal", hint: "Clean lines on soft silk", category: "minimal",
    tags: ["minimal", "clean", "space"], tone: "light",
    background: photoBg("/bloom/templates/silk-grey.jpg", "#2A2530"),
    seeds: [
      text("Less,\nbut better.", 0.2, 0.14, { z: 5, preset: "minimal", color: "#2A2530", align: "left", size: 1.0, transform: "uppercase", tracking: 0.18 }),
      photo(0.5, 0.56, 0.46, 0.3, { mask: "rect", z: 2 }),
      shape("rule-fade", 0.5, 0.8, 0.5, 0.015, { stroke: "#2A2530", strokeWidth: 1, z: 1 }),
    ],
  }),
  tpl({
    id: "blush-dream", name: "Blush Dream", hint: "Soft petals, softer feelings", category: "love",
    tags: ["love", "blush", "romantic"], tone: "light",
    background: photoBg("/bloom/templates/pink-blossom.jpg", "#4a2b3a"),
    seeds: [
      text("Blush\nDream", 0.5, 0.12, { z: 5, preset: "romantic", color: "#4a2b3a", size: 1.15 }),
      photo(0.5, 0.52, 0.46, 0.34, { mask: "oval", z: 2, shadow: true }),
      text("You, always", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(74,43,58,0.8)", size: 0.8 }),
      sticker("doodle.hearts", 0.5, 0.34, { scale: 0.45, tint: "#B25E7A", z: 6 }),
    ],
  }),
  tpl({
    id: "lavender-calm", name: "Lavender Calm", hint: "A slow exhale in purple", category: "wellness",
    tags: ["calm", "lavender", "breathe"], tone: "light",
    background: photoBg("/bloom/templates/lavender-field.jpg", "#3a3050"),
    seeds: [
      text("Lavender\nCalm", 0.24, 0.12, { z: 5, preset: "soft", color: "#3a3050", align: "left", size: 1.05 }),
      photo(0.6, 0.55, 0.46, 0.36, { mask: "arch", z: 2, shadow: true, filterId: "soft" }),
      text("Inhale, exhale, repeat", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(58,48,80,0.75)", size: 0.78, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "daisy-days", name: "Daisy Days", hint: "Simple joys, fresh stems", category: "seasonal",
    tags: ["daisy", "spring", "fresh"], tone: "light",
    background: photoBg("/bloom/templates/daisy-cream.jpg", "#3b352c"),
    seeds: [
      text("Daisy\nDays", 0.24, 0.12, { z: 5, preset: "handwritten", color: "#3b352c", align: "left", size: 1.1 }),
      photo(0.6, 0.55, 0.5, 0.3, { mask: "rect", frame: "polaroid", rotation: 3, z: 2, shadow: true }),
      text("Pick the small joys", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(59,53,44,0.75)", size: 0.78, transform: "uppercase", tracking: 0.12 }),
    ],
  }),
  tpl({
    id: "city-nights", name: "City Nights", hint: "Neon and momentum", category: "cinematic",
    tags: ["city", "night", "neon"], tone: "dark",
    background: photoBg("/bloom/templates/neon-night.jpg", "#F4EFE4"),
    seeds: [
      text("City\nNights", 0.22, 0.12, { z: 5, preset: "poster", color: "#F4EFE4", align: "left", size: 1.1 }),
      photo(0.6, 0.56, 0.48, 0.26, { mask: "rect", frame: "film", z: 2 }),
      text("Alive after dark", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(244,239,228,0.8)", size: 0.78, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
  tpl({
    id: "studio-terrazzo", name: "Studio Terrazzo", hint: "Playful shapes, bold intent", category: "playful",
    tags: ["playful", "bold", "create"], tone: "light",
    background: photoBg("/bloom/templates/terrazzo.jpg", "#22201B"),
    seeds: [
      text("Make\nit fun", 0.26, 0.14, { z: 5, preset: "playful", color: "#22201B", align: "left", size: 1.15 }),
      photo(0.6, 0.56, 0.46, 0.3, { mask: "blob", z: 2, shadow: true }),
      sticker("doodle.circle", 0.78, 0.24, { scale: 0.6, tint: "#C07A5E", z: 6 }),
    ],
  }),
  tpl({
    id: "read-more", name: "Read More", hint: "A stack of good intentions", category: "study",
    tags: ["reading", "books", "study"], tone: "light",
    background: photoBg("/bloom/templates/books-cozy.jpg", "#3b2f22"),
    storyKind: "reflection",
    seeds: [
      text("Read\nMore", 0.24, 0.12, { z: 5, preset: "typewriter", color: "#F5EDE0", align: "left", size: 1.05 }),
      photo(0.6, 0.55, 0.46, 0.3, { mask: "rounded", z: 2, shadow: true }),
      data("study", 0.5, 0.84, { variant: "inline", accent: "#C07A5E", w: 0.7, h: 0.1, z: 3 }),
    ],
  }),
  tpl({
    id: "hydrate", name: "Hydrate", hint: "Water first, everything after", category: "hydration",
    tags: ["water", "hydrate", "habit"], tone: "light",
    background: photoBg("/bloom/templates/water-blue.jpg", "#0E2A3A"),
    storyKind: "reflection",
    seeds: [
      text("Hydrate", 0.5, 0.12, { z: 5, preset: "bold", color: "#F4FAFC", size: 1.15, shadow: true }),
      data("water", 0.5, 0.42, { variant: "ring", accent: "#7FD1E8", w: 0.4, h: 0.2, z: 3 }),
      photo(0.5, 0.72, 0.5, 0.24, { mask: "rounded", z: 2, shadow: true }),
    ],
  }),
  tpl({
    id: "move-it-today", name: "Move It Today", hint: "Stronger than yesterday", category: "fitness",
    tags: ["movement", "strong", "fitness"], tone: "dark",
    background: photoBg("/bloom/templates/dark-botanical.jpg", "#F0E7DA"),
    storyKind: "reflection",
    seeds: [
      text("Move\nToday", 0.22, 0.12, { z: 5, preset: "condensed", color: "#F0E7DA", align: "left", size: 1.1 }),
      data("movement", 0.5, 0.4, { variant: "bars", accent: "#9DB89A", w: 0.7, h: 0.16, z: 3 }),
      photo(0.55, 0.7, 0.5, 0.26, { mask: "rounded", z: 2, shadow: true }),
    ],
  }),
  tpl({
    id: "sleep-deep", name: "Sleep Deep", hint: "Rest is productive too", category: "sleep",
    tags: ["sleep", "rest", "night"], tone: "dark",
    background: photoBg("/bloom/templates/night-moon.jpg", "#F4EFE4"),
    storyKind: "reflection",
    seeds: [
      text("Sleep\nDeep", 0.24, 0.12, { z: 5, preset: "soft", color: "#F4EFE4", align: "left", size: 1.1 }),
      data("sleep", 0.5, 0.42, { variant: "card", accent: "#8B87C9", w: 0.6, h: 0.16, z: 3 }),
      photo(0.55, 0.72, 0.5, 0.24, { mask: "soft-corner", z: 2, shadow: true }),
      sticker("bloom.moon-1", 0.8, 0.2, { scale: 0.7, tint: "#F4EFE4", z: 6 }),
    ],
  }),
  tpl({
    id: "cycle-check", name: "Cycle Check", hint: "Where you are this week", category: "cycle",
    tags: ["cycle", "phase", "track"], tone: "light",
    background: photoBg("/bloom/templates/pink-blossom.jpg", "#4a2b3a"),
    storyKind: "reflection",
    seeds: [
      text("Cycle\nCheck", 0.24, 0.1, { z: 5, preset: "elegant", color: "#4a2b3a", align: "left", size: 1.05 }),
      data("cycle", 0.5, 0.46, { variant: "phase", accent: "#B25E7A", w: 0.6, h: 0.26, z: 3 }),
      text("In tune, on time", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(74,43,58,0.75)", size: 0.78, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "habit-streak", name: "Keep The Streak", hint: "Keep the chain going", category: "habits",
    tags: ["habits", "streak", "consistent"], tone: "light",
    background: photoBg("/bloom/templates/window-light.jpg", "#3b352c"),
    storyKind: "reflection",
    seeds: [
      text("Habit\nStreak", 0.24, 0.1, { z: 5, preset: "bold", color: "#3b352c", align: "left", size: 1.05 }),
      data("streak", 0.5, 0.4, { variant: "card", accent: "#C07A5E", w: 0.5, h: 0.14, z: 3 }),
      data("habits", 0.5, 0.62, { variant: "list", accent: "#6E8463", w: 0.7, h: 0.22, z: 3 }),
    ],
  }),
  tpl({
    id: "goal-getter", name: "Goal Getter", hint: "Aim, then act", category: "goals",
    tags: ["goals", "focus", "drive"], tone: "dark",
    background: photoBg("/bloom/templates/dusk-sea.jpg", "#FDF8EF"),
    storyKind: "win",
    seeds: [
      text("Goal\nGetter", 0.24, 0.12, { z: 5, preset: "poster", color: "#FDF8EF", align: "left", size: 1.1 }),
      photo(0.6, 0.56, 0.44, 0.3, { mask: "rounded", z: 2, shadow: true }),
      text("One step, then the next", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(253,248,239,0.85)", size: 0.78, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "win-log", name: "Win Log", hint: "Today counted", category: "wins",
    tags: ["win", "proud", "done"], tone: "dark",
    background: photoBg("/bloom/templates/sunset-field.jpg", "#FDF6E9"),
    storyKind: "win",
    seeds: [
      text("Win\nLog", 0.24, 0.12, { z: 5, preset: "handwritten", color: "#FDF6E9", align: "left", size: 1.1 }),
      photo(0.64, 0.55, 0.48, 0.3, { mask: "rect", frame: "polaroid", rotation: 3, z: 2, shadow: true }),
      text("Write it down, own it", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(253,246,233,0.9)", size: 0.78, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "grateful-heart", name: "Grateful Heart", hint: "A full heart, open sky", category: "gratitude",
    tags: ["grateful", "heart", "sky"], tone: "light",
    background: photoBg("/bloom/templates/sky-heart.jpg", "#1F2433"),
    seeds: [
      text("Grateful\nHeart", 0.5, 0.12, { z: 5, preset: "handwritten", color: "#FDF8EF", size: 1.15, shadow: true }),
      photo(0.5, 0.52, 0.48, 0.32, { mask: "blob", z: 2, shadow: true }),
      text("So much to love", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(31,36,51,0.75)", size: 0.78 }),
      sticker("doodle.hearts", 0.5, 0.34, { scale: 0.45, tint: "#FDF8EF", z: 6 }),
    ],
  }),
  tpl({
    id: "self-love", name: "Self Love", hint: "Treat yourself kindly", category: "selfcare",
    tags: ["self love", "kind", "care"], tone: "light",
    background: photoBg("/bloom/templates/cozy-warm.jpg", "#FBF3E6"),
    seeds: [
      text("Self\nLove", 0.24, 0.12, { z: 5, preset: "romantic", color: "#FBF3E6", align: "left", size: 1.1 }),
      photo(0.5, 0.62, 0.54, 0.3, { mask: "rounded", z: 2, shadow: true, filterId: "warm" }),
      text("You deserve the kindness", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(251,243,230,0.85)", size: 0.78, transform: "uppercase", tracking: 0.12 }),
    ],
  }),
  tpl({
    id: "mood-ring", name: "Name The Feeling", hint: "Name the feeling", category: "mood",
    tags: ["mood", "feelings", "check in"], tone: "light",
    background: photoBg("/bloom/templates/lavender-field.jpg", "#3a3050"),
    storyKind: "mood",
    seeds: [
      text("Mood\nRing", 0.5, 0.1, { z: 5, preset: "elegant", color: "#3a3050", size: 1.1 }),
      data("mood", 0.5, 0.44, { variant: "list", accent: "#8B87C9", w: 0.74, h: 0.26, z: 3 }),
      text("All feelings welcome", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(58,48,80,0.75)", size: 0.78, transform: "uppercase", tracking: 0.12 }),
    ],
  }),
  tpl({
    id: "memory-lane", name: "Memory Lane", hint: "Walk back to the good bits", category: "memories",
    tags: ["memory", "nostalgia", "photos"], tone: "dark",
    background: photoBg("/bloom/templates/dusk-sea.jpg", "#F7F3EA"),
    seeds: [
      text("Memory\nLane", 0.26, 0.12, { z: 5, preset: "handwritten", color: "#F7F3EA", align: "left", size: 1.1 }),
      photo(0.42, 0.44, 0.4, 0.26, { mask: "rect", frame: "polaroid", rotation: -4, z: 2, shadow: true }),
      photo(0.62, 0.66, 0.4, 0.26, { mask: "rect", frame: "polaroid", rotation: 4, z: 3, shadow: true }),
      text("Keep the good ones close", 0.5, 0.92, { z: 5, preset: "note", color: "rgba(247,243,234,0.85)", size: 0.78, transform: "uppercase", tracking: 0.12 }),
    ],
  }),
  tpl({
    id: "cozy-night", name: "Cozy Night", hint: "Blanket, warmth, peace", category: "night",
    tags: ["cozy", "night", "warm"], tone: "dark",
    background: photoBg("/bloom/templates/cozy-warm.jpg", "#FBF3E6"),
    seeds: [
      text("Cozy\nNight", 0.24, 0.12, { z: 5, preset: "soft", color: "#FBF3E6", align: "left", size: 1.1 }),
      photo(0.6, 0.56, 0.4, 0.3, { mask: "soft-corner", z: 2, shadow: true, filterId: "warm" }),
      text("Warmth is a love language", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(251,243,230,0.8)", size: 0.78, transform: "uppercase", tracking: 0.12 }),
    ],
  }),
  tpl({
    id: "fresh-start", name: "Fresh Start", hint: "A clean page of sky", category: "morning",
    tags: ["fresh", "start", "hope"], tone: "light",
    background: photoBg("/bloom/templates/clouds-pastel.jpg", "#3a3442"),
    seeds: [
      text("Fresh\nStart", 0.5, 0.14, { z: 5, preset: "handwritten", color: "#FDF8EF", size: 1.15, shadow: true }),
      photo(0.5, 0.54, 0.5, 0.3, { mask: "arch", z: 2, shadow: true }),
      text("Begin again, gently", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(253,248,239,0.9)", size: 0.78, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "wander", name: "Wander", hint: "No plan, just go", category: "travel",
    tags: ["wander", "explore", "free"], tone: "light",
    background: photoBg("/bloom/templates/clouds-pastel.jpg", "#3a3442"),
    seeds: [
      text("Wander", 0.2, 0.12, { z: 5, preset: "elegant", color: "#FDF8EF", align: "left", size: 1.2, shadow: true }),
      photo(0.55, 0.55, 0.5, 0.34, { mask: "rect", frame: "polaroid", rotation: -3, z: 2, shadow: true }),
      text("Not all who wander are lost", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(253,248,239,0.85)", size: 0.78 }),
    ],
  }),
  tpl({
    id: "bloom-daily", name: "Bloom Daily", hint: "Grow a little every day", category: "nature",
    tags: ["bloom", "grow", "daily"], tone: "light",
    background: photoBg("/bloom/templates/daisy-cream.jpg", "#3b352c"),
    seeds: [
      text("Bloom\nDaily", 0.26, 0.12, { z: 5, preset: "handwritten", color: "#3b352c", align: "left", size: 1.1 }),
      photo(0.6, 0.55, 0.46, 0.3, { mask: "circle", z: 2, shadow: true }),
      text("A little growth counts", 0.5, 0.9, { z: 5, preset: "note", color: "rgba(59,53,44,0.75)", size: 0.78, transform: "uppercase", tracking: 0.12 }),
      sticker("bloom.flower-1", 0.2, 0.84, { scale: 0.9, tint: "#F4EFE4", z: 6 }),
    ],
  }),
  tpl({
    id: "soft-focus", name: "Soft Focus", hint: "Only what matters, sharp", category: "minimal",
    tags: ["minimal", "focus", "calm"], tone: "light",
    background: photoBg("/bloom/templates/silk-grey.jpg", "#2A2530"),
    seeds: [
      text("Soft\nFocus", 0.5, 0.14, { z: 5, preset: "minimal", color: "#2A2530", size: 1.05, transform: "uppercase", tracking: 0.2 }),
      photo(0.5, 0.54, 0.44, 0.3, { mask: "soft-corner", z: 2 }),
      text("One thing at a time", 0.5, 0.88, { z: 5, preset: "note", color: "rgba(42,37,48,0.7)", size: 0.78, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
];
