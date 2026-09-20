# Bloom — Personalization & Consistency Audit

**Date:** 2026-09-20 · **Scope:** full app sweep — coach, cycle, today, mood, pop-ups, themes, voice
**Constraint honoured throughout:** nothing broken, logo and header untouched, all tests kept green (754 passing, up from 720).

---

## 1. What was audited

| Surface | Files | Verdict before | After |
| --- | --- | --- | --- |
| Coach brain (cloud) | `supabase/functions/coach/index.ts` | Knew the record, not the person | Knows both — see §3 |
| Coach brain (local, tested) | `src/lib/coach/*` | Generic pools | Name + hour aware, cycle science |
| Coach record | `src/hooks/useCoachSystem.ts`, `src/lib/coach/edge.ts` | No identity beyond memories | `personal` block from minute zero |
| Coach welcome UI | `src/components/coach/EmptyWelcome.tsx` | Identical for everyone | Personal greeting + phase line |
| Today hero | `src/routes/index.tsx` | Greeted by name (profile) | Day-one line for brand-new users |
| Cycle assistant | `src/lib/cycle/assistant.ts` | No science prompt | "What does the science say about phases?" |
| Companion moments | `src/lib/voice/copy.ts` | Pools written, never wired | First-entry + streak milestones live |
| `/dashboard` (admin door) | `src/routes/dashboard.tsx` | Off-design: emojis, hot-pink hexes, third-party font injection, JS-driven hover styles | Design-system tokens, same data & features |
| Pop-ups | `BloomToaster`, `ConfirmSheet`, `BloomSheet` | Already unified (single toast surface, no `window.confirm` left) | No change needed — verified |
| Themes/styles | `styles.css`, `coach.css`, token vars | Consistent | Two new classes re-use existing tokens |

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
SYSTEM section: *use it like a friend would — greet by name once, orient on day one,
never shame the empty record.*

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
- **Cycle page assistant:** new always-available prompt — *"What does the science say
  about phases?"* — answered from the same evidence-framed material.

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
  personalization was added *inside* the pipeline, not by reintroducing an offline pretender.
- **Onboarding copy and flow** — already excellent; only its stored answers are now put to work.
- **Existing toast/sheet system** — verified consistent; no change needed.
