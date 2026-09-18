# Bloom Stories — implementation map & gap analysis

_Produced by inspecting the running repository, not by assumption. Every claim
below was read out of the source or measured. Baseline at time of writing:
**46 test files / 565 tests passing**, dev server serving on :8080._

---

## Headline

**Bloom Stories is not a greenfield build — it is already a substantial,
integrated, production-shaped feature.** The 50-step brief describes work that
is, in the large majority, already done. Building "the Stories system" from
scratch here would create exactly the second competing system the brief forbids.

What follows is what exists, what is genuinely missing, and what should be
rebuilt (almost nothing).

---

## Step 1 — What already exists

### Domain model (`src/lib/stories/types.ts`, `src/lib/profile/types.ts`)

14 element kinds, all persisted and rendered:
`text · photo · shape · sticker · drawing · gif · music · data · poll ·
question · slider · countdown · mention · date`

Plus: `StoryElementBase` carrying `x/y/z/scale/rotation/opacity/locked/blend`,
`StoryAdjustments`, `StoryMusicMeta`, `StoryAudience` (`all | close`),
`StoryMediaType` (`none | image | video`), and record types for
`StoryViewRecord`, `StoryReplyRecord`, `StoryGiftRecord`, `StoryPollTally`.
Six reaction kinds (`heart/bloom/sparkle/smile/cheer/moon`).

### Components (23 in `src/components/stories/`)

`StoryRail · StoryComposer · StoryCreator · StoryEditor · StoryCanvas ·
StoryViewer · StoryArchive · StorySettings · StoryAvatar · StoryContent ·
ShareCard · TemplateBrowser · TextTool · StickerTray · InteractiveTray ·
InteractionSheets · MediaTrays · FilterTool · DrawLayer · ElementLayer ·
CameraCapture · StorySheet · Stories.smoke.test`

### Libraries (37 files in `src/lib/stories/`)

- `templates/` — DSL + **294 templates** across 9 library files, 26 categories,
  78 of them the art-directed "Signature" collection
- `canvas/` — `backgrounds, masks, paint, paths, photogeom, shapes, typography`
  (18 type presets — Editorial/Classic/Soft/Bold/Handwritten/Typewriter/Elegant/Minimal/Poster/Whisper and more — 22 mask shapes, 8 photo frames)
- `exporter.ts` — real **1080×1920 canvas2d** render, not a DOM screenshot
- `interactions.ts`, `seen.ts`, `draftStore.ts`, `recentPhotos.ts`, `collage.ts`,
  `catalogs.ts`, `providers.ts`, `giphy-edge.ts`, `data/metrics.ts`, `time.ts`

### Backend (`src/lib/profile/storyService.ts` + migrations)

Real Supabase service — not mocked:
`uploadStoryPhoto · uploadStoryVideo · uploadStoryAudio · uploadStoryGif ·
createStory · listMyStories · setStoryVisibility · deleteStory · restoreStory ·
reshareStory · listMyHighlights · createHighlight · updateHighlight ·
deleteHighlight`

Tables: `stories`, `story_highlights`, `story_highlight_items`,
`profile_privacy` — with RLS. `get_public_bloom_profile()` is the only path to
another person's data.

### Integration

- **Home** (`src/routes/index.tsx`) renders `StoryRail` + `StoryComposer`
- **Profile** (`src/routes/profile.tsx`) renders `StoryComposer`
- **Public handle** (`src/routes/$handle.tsx`) serves stories + highlights with
  `sanitizeElements` / `sanitizeBackground` on the way in

---

## Steps 3–47 — scorecard against the brief

### Already implemented (verified in source)

| Brief step              | Status | Evidence                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3 Entry point / rail    | ✅     | `StoryRail` wired into Home + Profile; `seen.ts` drives seen/unseen                                                                                                                                                                                                                                                                    |
| 4 Creation flow         | ✅     | `StoryComposer` → camera / gallery / templates / drafts                                                                                                                                                                                                                                                                                |
| 5 Camera                | ✅     | `CameraCapture.tsx` 364 lines — photo, video, front/back flip, torch where supported, flash feedback                                                                                                                                                                                                                                   |
| 6 Gallery               | ✅     | `recentPhotos.ts`, `PhotoSheet`, `photogeom.ts` cover/contain geometry, zoom + pan                                                                                                                                                                                                                                                     |
| 7 Editor / layers       | ✅     | `StoryEditor.tsx` 1,640 lines; z-ordered layers; `ElementLayer` gesture system                                                                                                                                                                                                                                                         |
| 8 Text tool             | ✅     | `TextTool` + 18 presets incl. Editorial/Classic/Soft/Bold/Handwritten/Typewriter/Elegant/Minimal/Poster/Whisper                                                                                                                                                                                                                        |
| 9 Stickers              | ✅     | `src/lib/stories/stickers.tsx` — `STICKER_LIST` = 56 stickers, `STICKER_CATEGORIES` = 11; `StickerTray` sheet + GIPHY search                                                                                                                                                                                                           |
| 10 Drawing              | ✅     | `DrawLayer.tsx` — pen, sizes, colours, eraser, undo via history                                                                                                                                                                                                                                                                        |
| 11 Music                | ✅     | `MusicTray` with honest "not connected" state; `uploadStoryAudio`                                                                                                                                                                                                                                                                      |
| 12 Interactive stickers | ✅     | poll, question, slider, countdown, mention — creator **and** viewer modes in `InteractionSheets`                                                                                                                                                                                                                                       |
| 13 Templates            | ✅     | **294** templates, 78 Signature, all editable compositions                                                                                                                                                                                                                                                                             |
| 14 Bloom data stories   | ✅     | `data` element with 11 metrics × 6 variants; reads real `BloomStoryData`                                                                                                                                                                                                                                                               |
| 15 Filters              | ✅     | `STORY_FILTERS` = **16** filters (`catalogs.ts:293`) + `StoryAdjustments` (brightness/contrast/saturation/warmth/grain/vignette/fade)                                                                                                                                                                                                  |
| 18 Preview              | ✅     | Editor `share` step renders the true viewer canvas                                                                                                                                                                                                                                                                                     |
| 20 Privacy              | ✅     | `StoryAudience` + `profile_privacy`, RLS-enforced                                                                                                                                                                                                                                                                                      |
| 21 Expiration           | ✅     | `expiresAt` on the record, 24h lifetime, soft `deletedAt`                                                                                                                                                                                                                                                                              |
| 22 Archive              | ✅     | `StoryArchive.tsx` 299 lines, month grouping                                                                                                                                                                                                                                                                                           |
| 23 Highlights           | ✅     | Full CRUD + `story_highlight_items` ordering                                                                                                                                                                                                                                                                                           |
| 24 Viewer               | ✅     | `StoryViewer.tsx` 727 lines — `closed ⇄ viewing ⇄ paused`, tap zones, hold-to-pause, swipe (down closes, sideways navigates), sheets pause playback, resumes where it left off                                                                                                                                                         |
| 25 Progress             | ✅     | Single rAF loop; video stories sync to the real `<video>` clock                                                                                                                                                                                                                                                                        |
| 26 Gestures             | ✅     | Capture-phase `ElementLayer` so gestures never fight selection                                                                                                                                                                                                                                                                         |
| 27 Video                | ✅     | poster/load/play/pause/mute/failure; stops on close                                                                                                                                                                                                                                                                                    |
| 28 Preloading           | ✅     | `StoryViewer.tsx:248` prefetches the next story's media, `preload="auto"` on video only                                                                                                                                                                                                                                                |
| 29 Replies              | ✅     | `StoryReplyRecord` + reply surface                                                                                                                                                                                                                                                                                                     |
| 30 Reactions            | ✅     | Six reaction kinds, `ReactionBar`                                                                                                                                                                                                                                                                                                      |
| 31 Viewers              | ✅     | `recordView()` (`interactions.ts:155`) upserts into the `story_views` table with viewer id, name and timestamp; `StoryInsightsSheet` is the owner-facing list. **Corrected** — this was first recorded here as _absent_, on a `grep` for the `StoryViewRecord` type alone. That type really is unused, but the feature is implemented. |
| 32 Rings                | ✅     | seen/unseen states via `seen.ts`                                                                                                                                                                                                                                                                                                       |
| 33 Avatars              | ✅     | `StoryAvatar` with fallbacks                                                                                                                                                                                                                                                                                                           |
| 40 Performance          | ✅     | `TemplateBrowser` deliberately avoids 141 live canvases / ResizeObservers                                                                                                                                                                                                                                                              |
| 41 Mobile-first         | ✅     | safe-area `env()` throughout; 6 media queries in `src/styles/stories.css`                                                                                                                                                                                                                                                              |
| 44 Accessibility        | ✅     | 21 `aria-*` attributes in `StoryViewer`, 28 in `StoryEditor`, 2 `prefers-reduced-motion` blocks                                                                                                                                                                                                                                        |
| 45/46 Motion & palette  | ✅     | `src/styles/motion.css` present; oklch palette (champagne `#EED9A4`, sage, dusty rose, midnight…)                                                                                                                                                                                                                                      |
| 47 Integration          | ✅     | Existing auth, profile, navigation, storage and media utilities — not a demo page                                                                                                                                                                                                                                                      |

### Partially implemented

| Brief step           | Gap                                                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 19 Publishing states | Only a boolean `publishing` flag (`StoryEditor.tsx:213`) with a disabled button and a `toast.error` catch. No distinct _preparing / uploading / processing / publishing / retry / cancel_ states and no upload progress. |
| 43 Responsive editor | Editor has responsive rules (`max-width: 430px`, `max-height: 620px`) but control _repositioning_ across tablet/desktop is not the same as shrinking — needs a look.                                                     |

### Genuinely missing

| Brief step                  | Status                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **16 Multi-slide stories**  | **Partly built.** The data layer and the viewer are done and tested (commits `583e3cc`, `a9d8604`): `StorySlide`, the `slides` jsonb column with a three-tier insert fallback, and per-slide playback. What is still missing is the **editor slide timeline** — no way to add, reorder or delete a slide from the UI yet. |
| 12 Quiz sticker             | Absent (poll/question/slider/countdown/mention exist; quiz does not).                                                                                                                                                                                                                                                     |
| 12 Location sticker         | Absent.                                                                                                                                                                                                                                                                                                                   |
| 12 Link sticker             | Absent.                                                                                                                                                                                                                                                                                                                   |
| 11 Music trim / start point | `startMs` is hardcoded to `0` in the publish payload.                                                                                                                                                                                                                                                                     |

---

## What should be rebuilt

Essentially nothing. The architecture is sound: a data-driven template DSL, a
real canvas exporter, capture-phase gesture handling, an honest
provider/adapter pattern for GIPHY and music, and RLS-backed persistence.

The brief's warnings — _do not create a second competing Story system, do not
duplicate functionality, do not break existing Bloom_ — are the operative
constraints here, and they point away from a rewrite.

---

## The decision that gates everything else

**Multi-slide (Step 16) is a domain-model change, not a UI addition.** Doing it
properly touches:

1. `Story` shape — a `slides[]` array, each with its own elements, media,
   canvas, filter and duration
2. A Supabase migration (new table or JSONB column) plus RLS
3. `storyService` create/list/map paths
4. The editor — a slide timeline with add / duplicate / reorder / delete
5. The viewer — per-slide progress segments and slide-accurate navigation
6. The exporter — one 1080×1920 render per slide
7. Drafts, archive thumbnails, highlights, and the public `$handle` payload
8. Back-compat for every existing single-slide story already in the database

That is the single largest remaining item and it is not a one-session change.
Everything else on the gap list is small by comparison.

---

## Appendix — how these numbers were produced

Every count above came from executing the real modules under vitest or reading
the file, not from memory:

```
FILTERS: 16                 (STORY_FILTERS.length, catalogs.ts)
stickers export STICKER_CATEGORIES = 11
stickers export STICKER_LIST = 56
Tests  1 passed (1)
```

Baseline quality gates, re-run this session:

```
npx vitest run  ->  Tests  565 passed (565)   (46 files)
npx tsc --noEmit ->  0 errors
```
