# Bloom — Personalization & Consistency Audit

**Date:** 2026-09-20 · **Scope:** full app sweep — coach, cycle, today, mood, pop-ups, themes, voice
**Constraint honoured throughout:** nothing broken, logo and header untouched, all tests kept green (754 passing, up from 720).

---

## 1. What was audited

| Surface                     | Files                                                  | Verdict before                                                                         | After                                      |
| --------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------ |
| Coach brain (cloud)         | `supabase/functions/coach/index.ts`                    | Knew the record, not the person                                                        | Knows both — see §3                        |
| Coach brain (local, tested) | `src/lib/coach/*`                                      | Generic pools                                                                          | Name + hour aware, cycle science           |
| Coach record                | `src/hooks/useCoachSystem.ts`, `src/lib/coach/edge.ts` | No identity beyond memories                                                            | `personal` block from minute zero          |
| Coach welcome UI            | `src/components/coach/EmptyWelcome.tsx`                | Identical for everyone                                                                 | Personal greeting + phase line             |
| Today hero                  | `src/routes/index.tsx`                                 | Greeted by name (profile)                                                              | Day-one line for brand-new users           |
| Cycle assistant             | `src/lib/cycle/assistant.ts`                           | No science prompt                                                                      | "What does the science say about phases?"  |
| Companion moments           | `src/lib/voice/copy.ts`                                | Pools written, never wired                                                             | First-entry + streak milestones live       |
| `/dashboard` (admin door)   | `src/routes/dashboard.tsx`                             | Off-design: emojis, hot-pink hexes, third-party font injection, JS-driven hover styles | Design-system tokens, same data & features |
| Pop-ups                     | `BloomToaster`, `ConfirmSheet`, `BloomSheet`           | Already unified (single toast surface, no `window.confirm` left)                       | No change needed — verified                |
| Themes/styles               | `styles.css`, `coach.css`, token vars                  | Consistent                                                                             | Two new classes re-use existing tokens     |

---

## 2. Findings (the honest list)

**F1 — The coach was not personal, exactly as reported.** The cloud brain received
`"Nothing has been logged on any tracker yet."` as the only description of a new user;
the onboarding **name** (captured in the Welcome flow!), focus areas, and the time of
day were never sent. The local brain's greeting pools were generic. This is the root
of "responses aren't personalized even with 0 entries."

**F2 — Cycle answers stopped at "log a period start."** A cycle question on an empty
record produced a one-line instruction. No general model, no science, no companionship.
And `period` knowledge had one entry.

**F3 — "Am I late?" never reached the cycle answer** (real loophole, found by test).
The phrase has no cycle keyword, so it fell into `general` — and a paused cycle or an
overdue prediction was invisible to every question phrased without cycle words.

**F4 — The companion voice existed but never spoke.** `FIRST_ENTRY`, `STREAK_KEPT`,
`STREAK_BROKEN`, `SAVED_WARM`, `EMPTY_DAY` were written in `voice/copy.ts` and wired to
nothing. The app had celebration copy with no celebrations.

**F5 — `/dashboard` (admin "analytics overview") was two design generations old.**
Emoji stat tiles (the app's own coach prompt bans emoji), `#FF0055`/`#00E676` hexes, a
private Google Fonts stylesheet request (a privacy/perf leak no other route makes), and
inline JS hover handlers.

**F6 — Verified-fine:** toasts are one global surface; confirmations all go through
`ConfirmSheet`; empty states are honest (no fake numbers anywhere); the cycle engine's
honesty (confidence labels, ranges, no invention) is genuinely good; erase/export
coverage is thorough.

---

## 3. What changed

### The personal voice layer — new `src/lib/voice/personal.ts`

Reads the onboarding answer (name → first word, focus areas, cycle capability, start
date) from the synced prefs document. SSR-safe, throw-proof, and shaped by three rules:
**no invention** (a name appears only if given), **used sparingly** (once per surface),
**honest tenure** ("day one" only on day one). `welcomeLine()` gives the coach a
daypart- and name-aware opener; `dayGreeting()` matches the Today hero's shape.

### Identity travels to the cloud coach

`CoachRecord.personal` → `EdgeFacts.personal` → the edge function's prompt now includes
a `THIS PERSON` line (name, first day vs. tenure, stated focus, local hour) and a new
SYSTEM section: _use it like a friend would — greet by name once, orient on day one,
never shame the empty record._

### Cycle science, on the borderland — new `src/lib/cycle/phaseScience.ts`

Population-framed, mechanism-named, never diagnostic lines for menstrual / follicular /
ovulation / luteal, plus the honest general model (21–35 days; 28 is an average, not a
rule). Assumed-confidence phases carry an explicit "from the general pattern, not your
logs" caveat — enforced inline so even a one-sentence budget can't hide it, and by test
(`phaseScience.test.ts` asserts no "you will …" promises anywhere).

The cloud SYSTEM gained the matching brief: phases are real on average, small and
individual in practice, connect them to the question, one calm clinician line when
symptoms are severe, and never raise the cycle for people who don't track one.

### Coach answers, upgraded

- **Greeting (local):** named + daypart pools; day-one welcome instead of a demand for data.
- **Period answer:** empty record → general model + science + one-tap invite (knowledge first, nudge last); tracked phase → one hedged science line seeded on the day.
- **General answer:** now reports cycle state — paused ("nothing counts as late"),
  overdue ("about N days past its estimated window"), or day + phase — so F3 is fixed
  without keyword gymnastics.
- **Knowledge:** `period` expanded (prostaglandins, luteal progesterone, follicular
  oestrogen, ovulation peak-and-drop, iron loss), all in the same hedged register.
- **Cycle page assistant:** new always-available prompt — _"What does the science say
  about phases?"_ — answered from the same evidence-framed material.

### The welcome speaks to the person

`EmptyWelcome` renders a personal greeting line ("Evening, Maya.") and, when a cycle is
tracked with a known phase, one science line for right now. Starter tiles on an empty
record are shaped by the focus areas chosen at onboarding ("Help me set up a sleep
rhythm that holds") — framed as setup and conversation, never as fake data questions.

### Companion moments, finally wired

- **First mood entry ever** → a line from `FIRST_ENTRY` instead of a flat "Moment saved."
- **Habit tick crossing 7/14/21/30/50/100/180/250/365** → one quiet `STREAK_KEPT`
  celebration per habit per milestone (session-crossing only — never on app open with an
  old streak standing; remembered in `bloom.voice.celebrated.v1`).

### `/dashboard` brought into the system

Same route, same data, same admin-door entry — now on tokens (`home-panel`, `home-chip`,
display font, tracker accents), Lucide icons instead of emoji, the shared greeting shape,
and no third-party font request. Functionality byte-for-byte preserved (stats, add
habit, tracker cards, insights, modal).

### Tests: 720 → 754, all passing

New suites: `personal.test.ts` (identity resolution, degradation, corruption survival),
`phaseScience.test.ts` (hedging rules enforced), `personal-coach.test.ts` (zero-entry
personalization guarantees, assumed-phase caveat, the F3 loophole), `edge.test.ts`
(personal block mapping and caps).

---

## 4. Recommended next features (in the order I'd build them)

1. **Today phase card** — one row on Today: current phase, one `phaseScience` line, one
   planning hint ("late-luteal: lower the bar, not the plan"). All the pieces now exist;
   it's pure presentation.
2. **Coach "last time" memory** — surface the most recent pinned memory in the welcome
   ("Last time you mentioned the 6am starts") for returning users.
3. **Luteal-aware habit planning** — an optional toggle: during the estimated
   pre-period window, Today's suggested habit load eases by one. Frame as preference,
   never rule (the cycle engine already refuses to pathologize).
4. **Weekly report intro line** — name + tenure + the single biggest change this week,
   from data the report already computes.
5. **Check-in companion notifications** — reuse the daypart pools for push reminders so
   notifications sound like the same friend the coach is.
6. **Clearly-labelled offline companion mode** — the coach is deliberately
   strictly-online (an honesty guarantee worth keeping); a visible "offline —
   conversation paused" state with the local knowledge answers behind a clear label
   would extend the friend feel to plane-mode without faking the cloud brain.
7. **Voice for the cycle assistant quick prompts on Today** — the science prompt added
   here deserves a Today-surface entry point when the phase card (idea 1) ships.

---

## 5. Deliberately not changed

- **The logo, `BloomLogo`, `BloomHeader`, crowns and app icons** — untouched, per instruction.
- **The strictly-online coach policy** — it is an honesty guarantee (never a fabricated reply);
  personalization was added _inside_ the pipeline, not by reintroducing an offline pretender.
- **Onboarding copy and flow** — already excellent; only its stored answers are now put to work.
- **Existing toast/sheet system** — verified consistent; no change needed.

---

## 6. Addendum — the game layer & visual QA (same session, pass two)

**A real browser joined the audit.** Chromium was bootstrapped in the sandbox and every
main route was screenshot at phone (390×844) and desktop (1440×900) sizes with a seeded,
realistic record — the Journey/Rewards page section by section.

### The Rewards page, rebuilt as a game — visually

Verified in-sandbox (screenshots reviewed, not imagined):

- **The hero title plate** — "YOUR JOURNEY" now sits on a heraldic plate with gold
  flank rules ending in glowing diamond terminals; the rank name is engraved metal
  (gradient + baseline hairline), not flat display type.
- **The engraved dial** — a slow-turning tick ring (60 dashed marks) around the
  progress arc, with a gold spotlight behind the medallion. Reads like a game rank
  dial on both phone and desktop.
- **Achievements became trophy medallions** — cut-corner plates with corner rivets, a
  large emblem coin (double-struck edge) on top, centered copy, and a rarity strip
  running the full base of the plate (gold for rare, violet for signature). Earned
  plates carry a per-tone glow and a slow staggered glint; locked ones sit desaturated
  in fog. All original copy unchanged.
- **The rank ladder** — the spine now inks gold up to "YOU ARE HERE" and glows;
  the held rank's name is gradient-lit; state labels ("Kept"/"Ahead") are mono caps.
- **The rank-up ceremony** — slow conic god-rays now turn behind the emerging emblem
  (masked, reduced-motion safe), riding the existing glow layer.
- **Section titles** gained a gold rule + diamond flourish, tying the page together.

### The recommendations — shipped

1. **Today phase card** (`PhaseCard.tsx`) — day, phase, one hedged science line, the
   honest prediction window, a phase-matched planning hint, and an Open Cycle link.
   Only renders for a live, evidenced cycle; verified rendering in the browser.
2. **Coach "last time" memory** — the empty conversation now opens with "Last time you
   mentioned — …" (pinned first, then newest).
3. **Weekly report intro** — "Your week, {name} — read back to you." plus an honest
   "Week N of your Bloom record" line.
4. (Items 3/5–7 from the original list remain designed and ready; the phase card was
   the keystone and it is now in.)

### Visual QA caught a real bug

The phase card's science line silently vanished for some dates: the local hash in
`phaseScience.ts` could go **negative** (`h | 0`), indexing the pool at `-1` and
producing `undefined`. Fixed with an unsigned shift (`>>> 0`) and locked with a
regression test feeding every phase × seven seeds, including the exact seed that
exposed it live. **This is why the visual pass exists.**

**Tests: 759 passing** · typecheck clean · production build clean · logo untouched.

## 7 · Wave three — the rest of the recommendation list

Screenshots in `snapshots/w3/` (staged capture script: `/tmp/visqa/wave3.cjs`);
every surface below was verified in a real browser, not imagined.

### #3 — Luteal-aware planning: "Ease this week"

The person's own opt-in, end to end:

- `CycleSettings.easeBeforePeriod` (periodStore) — default off, normalized on load,
  saved through the existing settings pipeline (announces `CYCLE_SETTINGS_CHANGED`).
- The **phase card** offers the toggle during the estimated pre-period window
  (0–3 days ahead): "Pre-period days ahead — Today will suggest one habit instead
  of two." Live-updates via the settings event.
- `focusOf()` honours it: inside the window with the flag on, Today's focus lists
  **one** habit ("The one that matters most today") plus a transparent row —
  "Ease is on — one habit is enough today · change it on the Cycle page".
- A preference, never a rule: nothing is removed from the record, habits page and
  reminders untouched, and the off state is exactly yesterday's behaviour.

### #5 — Companion reminders carry the cycle science (hedged)

Three new `period-soon` lines and one `evening` line — each one self-hedging
(the "period soon" invariant that every body must admit the estimate is test-
locked): progesterone and the pre-period mood dip, cravings/energy as biology
rather than a willpower failure, low-energy days counting as days.
Template count now **337 / 3,523+ rendered** (test-asserted).

### #6 — Offline coach, honestly labelled

- A failed send now offers a second door: **"Answer from Bloom's own knowledge"**
  beside "Try again". It runs the deterministic on-device engine over the same
  question — no network, no invented numbers — and swaps the error bubble for the
  reply, permanently badged _"offline — answered from Bloom's own knowledge"_.
- The pre-existing one-shot "answered on this device" footnote keeps its wording
  for mid-session fallbacks; the offline path gets the explicit label, because a
  substitute answer must say what it is.
- Visual QA caught the mobile layout squeezing the error copy into a
  one-word column with the new second action — fixed (actions take a full row;
  copy keeps a 240px basis), re-verified.

### #7 — Today → cycle science, one tap away

The phase card gained **"The science, in full"** — an expandable with a hedged
science line for _all four phases_, the current one marked "— today" and lit in
the cycle colour. The whole map without leaving Today.

### Also fixed

- `supabase/functions/coach`: phase guidance lookup is now label-shape-proof
  ("Ovulation" vs "Ovulation window" both resolve) — same bug class the client
  had, on the edge side.
- `PhaseCard` hint pools are keyed by canonical phase key; the "Ovulation window"
  label had silently orphaned the ovulation hint pool.

**Tests: 759 passing** · typecheck clean · production build clean · logo untouched.
