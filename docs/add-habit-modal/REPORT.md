# Add-habit modal — the v3 "latest" dialog, ported 1:1

**Ask.** The Add-habit dialog the app opens (floating button, "Add habit" in the
habits section) should be *exactly* the standalone HTML from the old repo:
`public/bloom/bloom-add-habit-modal-v3-latest.html` ("Bloom — Add Habit v3,
advanced").

**What was there.** `src/components/tk/AddHabitModal.tsx` was a loose
re-interpretation with inline styles: no live preview card, no icon search or
custom-image upload, no custom-day picker / weekly target, no measurable goal,
no start date, no tags, no success overlay, no validation messages, and the
colour swatch didn't re-tint the dialog.

## What changed

| File | Change |
| --- | --- |
| `src/components/tk/AddHabitModal.tsx` | Rewritten as a faithful React port of the HTML: same markup, ids and class names, same three steps, same state shape (`DEFAULT_STATE` / `set(patch)`), same `validate()`, `buildPayload()`, keyboard handling and success overlay. Props stay `{ open, onClose, onSubmit }` (+ optional `prefill`, the HTML's `open(prefill)`), so the three callers (Today page, `/dashboard`, `/trackers-premium`) needed no changes. |
| `src/styles/add-habit-modal.css` | **The HTML's own `<style>` block**, generated verbatim with every selector prefixed by `.bloom-add-habit` (the portal root) so its bare `input`, `textarea`, `button`, `.chip`, `.tag`, `.switch`, `.day` rules and `:root` tokens can't leak into Rewards / Mood / Trackers. Keyframes get a `bah-` prefix. Deliberate deltas: the demo page's `body` / `.demo-trigger` rules are dropped (the root carries the body font/colour instead), `z-index` 2000 so it sits above the tab bar, floating button and other overlays, and the dropzone "Remove" button is lifted above the invisible file input (in the HTML it was painted underneath it and could not be clicked). |
| `src/lib/home/habits.ts` | `HabitDraft` now carries everything the dialog emits — `days`, `timesPerWeek`, `goal` — and both `insertHabit` (Supabase: `days`, `times_per_week`, `goal_enabled/target/unit`) and `draftToLocalHabit` (signed-out) persist them instead of dropping them. The migration already had those columns. |

Nothing else was touched; the Today page passes the payload straight to
`useHabits().addHabit`.

## Faithfulness check (headless Chromium, same viewport, both served from this app)

`/bloom/bloom-add-habit-modal-v3-latest.html` (original) vs `/` → floating button (port):

- modal box: original `520 × 810 @ (460, 45)` — port `520 × 810 @ (460, 45)`
- 33 computed-style probes (title font/size/weight/colour, input background/
  border/radius/padding/font, active tab, primary button gradient/colour/
  padding/radius/weight, icon preview, modal max-width/radius/shadow/gradient,
  header/footer padding): **0 differences**
- every measured control's width × height matches on all three steps, except
  the native date input which is 1 px shorter in the port because Bloom's
  `html { color-scheme: dark }` makes Chromium draw the dark date picker
  (the demo page renders the light one)
- `compare-original-vs-port-step1.png`, `compare-original-vs-port-step2.png`
  show original | port | diff side by side (the diff is sub-pixel text
  anti-aliasing; the two are otherwise identical)

## Behaviour verified (headless run, no Supabase env — local mode)

- Floating button → dialog, focus lands in **Name** after 60 ms, page scroll locked while open, restored on close
- Continue with empty name → "Give your habit a name." under the field, `aria-invalid`
- icon search "walk" → only 🚶; selecting it updates the preview card; sage swatch re-tints the whole dialog (`data-accent="sage"`)
- Upload custom → PNG shows in dropzone and preview; **Remove** resets to ⭐ (works, unlike the HTML)
- Custom days with none selected → "Pick at least one day."; weekly stepper 1–7; goal switch reveals target/unit; start date defaults to today (local date)
- Points stepper 5–500 step 5, priority chips coloured per level, reminder switch reveals the time input, tags commit on Enter/comma, max 6, Backspace removes the last
- Create habit → success overlay "“Morning walk” created" with the chosen icon → dialog closes after 1.4 s → habit appears in the habits section; saved payload: `color: sage, frequency: weekly, timesPerWeek: 4, goal: {3, km}, points: 20, priority: high, reminder 08:00, tags [health, morning], note, startDate`
- Esc closes and returns focus to the floating button; backdrop click closes; Cmd/Ctrl+Enter submits; Tab is trapped inside
- 390 px: modal `342 × 793`, 6-column icon grid, no horizontal overflow; 1440 px: 7 columns
- While the dialog is open, **0 of 34** page controls change computed style (no CSS leak); `/mood`, `/rewards`, `/trackers` unaffected; not rendered on the server (`createPortal` after mount)
- `tsc`: the same 11 pre-existing errors; eslint clean on the touched files; vitest 26/26; `npm run build` OK

## Screenshots

`step1-basics.png`, `validation.png`, `step1-basics-filled-sage.png`, `step1-custom-icon.png`,
`step2-schedule-custom-days.png`, `step2-schedule-weekly-goal.png`, `step3-details.png`,
`success.png`, `after-create.png`, `mobile-390.png`, `compare-original-vs-port-step{1,2}.png`.
(Emoji render with Noto Color Emoji in the headless browser; on Windows they use Segoe UI Emoji.)
