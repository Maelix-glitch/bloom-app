# Bloom — Next Chapter: Partner Mode + 5 Big Updates + Monetization
> You launched. Now we make it *sticky* af. No code changed in this doc — just the plan so we can pick what to ship first.

**Date:** 2026-09-21  |  **Branch:** arena/01a0c2e2  |  **App:** Maelix-glitch/bloom-app

---

### TL;DR — Is your partner idea good?

**Yes — 9/10. It's PERFECT for Bloom, if we do it the Bloom way.**

Most trackers are lonely. Bloom's whole thesis is *"see how your days connect"* — `src/lib/home/today.ts` literally draws a living map of sleep ↔ mood ↔ cycle ↔ study. Adding ONE consent-chosen person to that map is the most natural expansion. Not a social network, not a feed. A **private duo**.

**Why it wins:**
- Streaks are 2.3x stickier when you do them *with* someone (Duolingo, Strava, Apple SharePlay data all show this)
- Bloom already has the social primitives: `/$handle` public profiles, `StoryRail`, `Highlights`, `PrivacySheet`, `SignedOutProfile` — we reuse, not rebuild
- Cycle + Mood + Trackers become *relationship intelligence*, not just self-intelligence

**What to avoid to keep it Bloom:**
- NO pressure to share. Keep `privacy: private-by-default`. Cycle data is *never* public (see `supabase.guard.test.ts` — anon revoked) — Partner mode must be opt-in per-category, abstracted.
- NO leaderboards that shame. Bloom is calm, not shouty-gamified.
- NO generic "couple app" cringe. No hearts everywhere. Keep editorial, `oklch()` dark, `Fraunces` + `IBM Plex Mono` house style.

**Verdict:** Ship it as **“Bloom Together”** — your flagship 2.0 feature. Details below.

---

## 0) YOUR IDEA, Fully Designed: Bloom Together — Invite Your Person

Think: *One tap invite → Private duo space → Shared challenges, not shared surveillance.*

### How it feels

> **"Bloom, alone together."** Your data stays yours. Theirs stays theirs. The *overlap* becomes a new thing you co-author.

### Core Flow (keeps local-first + honest-data rules)

**1. Invite**
- From Profile → `Invite Partner` → generates `bloom.app/join/<one-time-code>` (6-char, expires 48h, Supabase `partner_invites` table)
- Or share handle: `Search @herbloom` → Request to pair → other side approves in `NotificationCenter`
- Capacities: 1 partner max at a time (prevents poly-graph complexity v1). Can unpair → 7-day cooldown so no spamming.

**2. Duo Space — New route `/together` (between Mood / Rewards in nav)**
Sits in `AppNav` as a heart-link but styled editorial, not emoji-heavy.

Layout:
```
┌──────────────── Bloom Together ────────────────┐
│ [Your Avatar]  ◈  Paired since Sep 21  ◈  [Their Avatar] │
│  12 day duo streak   •   3 active challenges              │
├──────────────── Shared Map ────────────────────┤
│  Today's Duo Map: Your sleep 7.2h + Their energy 8/10    │
│  "You both logged calm before 9am — morning synchrony"   │
├──────────────── Active Duels ──────────────────┤
│  💧 Hydration Duel — 4/7 days both hit goal   │
│  📚 Study Sprint — 120min combined / 200       │
│  🌙 Sleep Sync — avg bedtime gap: 42min        │
└───────────────────────────────────────────────┘
```

**3. What’s shared vs not (CRITICAL privacy design)**

| You Control Toggle | What Partner Sees | What They NEVER See |
|---|---|---|
| Mood | Valence + emoji only (e.g. "calm • 7/10") not your full note unless you tap Share | Your full `MoodEntry.note`, raw `stress` if you hide it |
| Trackers | `day aggregate` (goal met / not) + anonymized gap | Exact `waterMl`, `sleepMinutes` if you toggle off |
| Cycle | **Abstracted only:** "Follicular — high energy window" / "Rest phase" + `SymptomBloom` color dot | Bleed days, flow, sexual activity, raw logs — never via `partner_visible` view |
| Habits | Completion dots for shared habits only | Private habits |
| Stories | Auto “Duo Story” ring (gold) when you both post same day | — |

All stored in `partner_pairs (profile_a, profile_b, status, created_at)` + `partner_shares (profile_id, allow_mood,bool...)`. RLS: only pair member can read the filtered view.

**4. Challenges Engine (the sticky part)**

Not boring checklists. **3 archetypes:**

**a) Sync Challenges** — *do the same thing, same day*
- `7-Day Calm Streak` — both log mood + any calm/happy entry
- `Glass Together` — both hit water goal 5/7 days
- Reward: Duo petals → shared `CrestHall` emblem (see `src/components/progression/CrestHall.tsx`)

**b) Combined Challenges** — *pool your effort*
- `Study 10h Together` this week — your 3h + their 7h = unlock “Deep Work” theme
- `Move 150 min` — bridges distance when you’re long-distance

**c) Mirror Challenges** — *support opposite strengths*
- If your `Insights` says low energy mornings, partner gets nudge: “Send a spark?”
- One-tap `Nudge` → lands in partner's `NotificationCenter` as `kind: habit` with your avatar

All challenges are **derived from real logs** (`useHabits`, `useTrackers`, `useMoodSystem`) — no fake progress. `ProgressionStore` already handles `evaluateAchievements` = reuse for duo.

**5. Duo Insights (moat)**
- “You both sleep later on Sundays — avg +1.4h”
- “When you study >60min, partner’s mood +0.8 next day (n=14, evidence: moderate)” — uses existing `calculateCorrelations` but across pair, only when n>10
- Weekly email/push: `Bloom Together — Week 12: You mirrored calm on 5/7 days`

**Free vs Paid hook:**
- Free: 1 active duo challenge, basic sync (mood valence + 1 tracker)
- Plus/Premium: Unlimited challenges, full share toggles, Duo Insights, custom duo themes

> **Build effort:** Medium. Reuses `useHabits`/`useTrackers` + `NotificationCenter` + `Progression`. New tables + RLS + `/together` route + pairing flow. 2-3 weeks for a tight v1.

---

## 5 Fresh Updates Beyond Partner Mode (You asked for 5 — here are 6 so you can cut one)

### 1) Coach Limits + Coach Plus — Make “Copacha” Paid (Your #1 monetization lever)

**Problem today:** `src/lib/coach/edge.ts` is unlimited, strictly-online, `TIMEOUT_MS 20s`. No rate limit, no memory cap. At scale, LLM cost kills you. Right now it’s free infinity — perfect to gate.

**What Free gets (generous but not abusable):**
- **15 messages / week** (rolling) → soft counter in `prefsStore` + Supabase `coach_usage` (profile_id, week, count)
- **1 model only** (`provider: auto` → cheapest)
- **No attachments** — `CoachCamera` + `fileToCoachMedia` disabled → “Plus to analyze photos/PDFs”
- **7-day memory** — `CoachMemory` trimmed, no pinned memories
- **Terse/Brief only** — `register` locked, no `full` deep dives

**What Bloom Plus gets ($4.99/mo or $39/yr):**
- **Unlimited messages**, `TIMEOUT_MS 20s` priority, all providers (`providers.ts`)
- **Vision** — photo + PDF to Gemini, `isVisionType` allowed
- **Voice** — `useVoice`, `generate_speech` TTS + STT, personal voice `dayGreeting`
- **Infinite memory** + `pinned` memories, `CoachSidebar` history search
- **Sidecars** — `parseSidecars` actionable cards (habit create, tracker log from chat)
- Show paywall as calm bottom sheet (`BloomSheet`), never a blocking popup. "You've used 13/15 this week — go Plus to keep talking."

**Why it monetizes:** Coach is daily habit, high perceived value. Competitors (Calm, Finch) charge $69/yr for less. This alone can fund infra.

**Design note:** Keep `hasSupabaseConfig` guard — offline still shows honest “Coach needs connection” + retry, not a fake fallback (hard rule #4).

---

### 2) Seasonal Arena — Global + Duo Quests (Your Habit Retention Engine)

**What it is:** Every 30 days a new editorial season: “September: Deep Rest” / “October: Quiet Focus”. Not a gamified banner — a linen-paper poster using your `REWARD_ART` (serenity-strength.jpg etc).

Uses existing `ACHIEVEMENTS` engine (`src/lib/progression/achievements.ts` — 16 achievements) + `Rewards` catalog (`catalog.ts` 850-point themes).

**How it works:**
- 3 seasonal goals at a time (e.g. “Log sleep 12/30”, “Mood 20/30”, “Move 8/30”), derived from `evaluateGoals`
- Personal track + Duo track (if paired) + Global community % (“41% of Bloom reached Deep Rest” — anonymized aggregate, no individual data)
- Completion unlocks *exclusive* seasonal `ComponentDef` (theme/wallpaper/leaf icon) that *never returns* — FOMO done tastefully.

**Free:** See season, 1 goal active
**Plus:** All 3 goals, duo track, exclusive art

**Why it’s #2:** Gives free users a reason to *return daily* without paywall rage. Progression already has `RankBadge`, `RankPath` — just skin seasonal.

---

### 3) Wind-Down & Rise — Evening/Morning Ritual (Your “Jarvis cinematic” ask)

You said *make mood premium, Jarvis, cinematic*. `Atmosphere.tsx` already has bokeh/candle. Push further:

**Evening Wind-Down (9pm local, via `RemindersEngine` + `NotificationCenter`):**
- Push: “How did today feel in one breath?” → 1-tap `Composer` with `Weather` + `Energy` slider, haptics
- Micro-animation: page breathes, `MoodBlob` pulses with `motion` (framer)
- If missed, not shaming — `InsightsPanel` says “Not enough data yet” (honest rule)

**Morning Intent (user-set time, `useReminders`):**
- “Set one intention for today?” → creates lightweight `habit` draft or just stores `prefs` `todayIntent`
- `ConnectionMap` on `/` shows intent dot connected to mood later

Uses `src/assets/mood/*.jpg` + `src/styles/mood-motion.css` — add Lottie or `echarts` subtle gradient mesh.

**Free:** One ritual/day, basic prompt
**Plus:** Custom times, soundscapes (`useAmbientSound` + 8 audio loops), streak beads (`StreakBeads.tsx`)

**Effort:** Low — mostly UI + reminders. Huge premium feel.

---

### 4) Weekly Bloom Report 2.0 — Shareable Intelligence PDF

You have `src/components/report/WeeklyReportPage.tsx` but it’s quiet. Make it a *ferrari*:

- **Private PDF export** via `useExportBundle` + `exportAll.ts` — but designed editorially (Fraunces headings, mono metadata)
- Contains: `MoodChart` sparkline, `Volatility sd: 1.2`, `Best Day Sep 12: 8.8`, top `Emotions` distribution, `Correlations` (“Sleep ↔ Mood r=0.62 moderate”), `Anomalies` (“Low Sep 9, tied to screen 6h”)
- One-tap **Share Card** — `ShareCard.tsx` renders 1080×1920 story-ready image for `StoryComposer` / Instagram
- **Duo addition:** If paired, adds “Together” page: overlapping mood curves, shared streaks

Distribution: Email via `supabase/functions/push-send` (already exists) + in-app `NotificationCenter` `kind: insight`

**Free:** View report in-app, last 7D only
**Plus:** 30D/90D/1Y, PDF export, share card, email subscription, duo page

**Why:** Turns data into *artifact* — people pay to keep & share artifacts.

---

### 5) Atelier Pro — Theme Studio + Sound Atelier (Your Rewards Monetization)

`Rewards` + `Progression` are your most polished code (`CrestHall`, `Reveal`, `BloomSkin`). Monetize *cosmetics* ethically:

- **Current:** `REWARD_ART` 10 artworks, `THEMES` 6 at 850 pts (~2 weeks grind). Good.
- **Upgrade:** **Theme Studio** — user mixes `surface`, `--ci-luteal` etc tokens live, preview across `TrackersDesign Atlas/Ledger` instantly. Save as personal theme.
- **Sound Atelier** — `src/lib/sound` + `Rewards audio.ts` (hover/open/charge/reveal). Plus adds 12 ambient loops (rain on window, forest, cafe) selectable per page via `useAmbientSound`.

**Free:** 2 base themes, default sounds
**Plus:** Studio, all 10+ seasonal themes instantly (or 50% point discount), full sound library, custom app icons (`capacitor` `app-assets.mjs`), `StoryComposer` templates

**Price anchor:** Purely cosmetic so free never feels punished — but Plus feels *lusher*.

---

### 6) Cycle Together — Abstracted Partner Insight (Delicate, Powerful)

**Not** sharing cycle data — sharing *context*. Built on `src/lib/cycle/predict.ts` + `phaseScience.ts`:

- Owner opts in toggle: `Share rhythm hints with partner`
- Partner sees only: phase color + `PhaseWave` silhouette + one `TipsCard` line: “Energy is often lower — gentle support lands well here” (from `phaseScienceLine`, already non-diagnostic)
- No dates, no bleed, no symptoms — just the `VitalDials` energy band
- Duo insight: “Your focus windows often overlap in Follicular — good week to plan something demanding together”

**Free:** Off
**Plus:** On, with granular toggle + auto-expire (30 days, re-consent)

**Why include:** You’re the only tracker with a respectful cycle model. Owning “cycle + relationship intelligence, without surveillance” is a category-defining moat.

---

## The Paid Tier — Clean, Honest, Bloom-Aligned

Don’t do credits, gems, loot boxes. Do **Bloom Free / Bloom Plus / Bloom Duo**.

### Pricing Suggestion (test, adjust for your market)

| Tier | Price | Who | App Store Product |
|---|---|---|---|
| **Free** | $0 | Everyone forever, local-first | — |
| **Plus** | **$5.99/mo** or **$39.99/yr** (-44%) | 1 person, all premium | `bloom_plus_monthly` / `bloom_plus_yearly` |
| **Duo** | **$8.99/mo** or **$59.99/yr** | 2 people, both get Plus + Together insights | `bloom_duo_monthly` (family share via RevenueCat/Capacitor) |

Keep 7-day free trial on yearly. No ads. Ever.

### Feature Gate Table (what you asked: “apply limit in copacha dn all for free tier”)

| Feature | Free | Plus | Duo (both get Plus) |
|---|---|---|---|
| **Coach (Copacha)** | 15 msgs / week, no files, 7-day memory | Unlimited, vision, voice, pinned memory, 3 models | Same + duo context (coach knows you’re paired, with consent) |
| **Mood Intelligence** `/mood/intelligence` | 30D only, no heatmap/correlations export | 7D/30D/90D/1Y/custom, full `Heatmap` + `Correlations` + `Patterns`/`Anomalies`, PDF | + Duo overlap view |
| **Trackers** | 3 active, goals 7D history | 6 trackers, unlimited history, `Ledger`/`Atlas` premium views | Shared tracker duels |
| **Habits** | 3 habits, no pause stats | Unlimited, pause/archive, weekly analytics, `StreakBeads` | Shared habits |
| **Cycle** | Log + basic dial | `PredictionsCard`, `SymptomPhaseGrid`, `PhaseWave` advanced | `Cycle Together` abstract hints |
| **Stories** `/` `StoryComposer` | 1 story/day, 3 templates | Unlimited, all `TemplateBrowser` + pro fonts (`Caveat`, `Oswald`) + draw layers | Duo co-authored templates |
| **Rewards/Themes** | 2 themes, earn points slowly | Theme Studio, all art, 1.5× point multiplier, instant unlocks | Shared emblems, duo crests |
| **Together** `/together` | Pair, 1 challenge | Unlimited challenges, insights, nudges | Full |
| **Reports & Export** | View 7D in-app | Weekly PDF + share card + email + `exportAll` full bundle | Duo report page |
| **Storage** | Local + cloud sync if signed in | Same + priority support | Same |

**Implementation:** Gate via `getPref("bloom.entitlement")` + Supabase `profiles.entitlement` (`free|plus|duo`, `entitled_until`). Client checks entitlement on every premium component (`if !isPlus → show BloomSheet paywall`). Server enforces on `coach` edge function (count check) and on `habit`/`tracker` inserts (optional soft limit). Never brick local-first: free limits only matter when `hasSupabaseConfig` true — offline always works.

**Paywall UI:** `src/components/ui/bloom-sheet.tsx` already exists — use it. Calm, “Continue with Free” secondary, no dark pattern. Example copy: *“Bloom stays free for the basics. Plus just goes deeper — and supports us to keep it private.”*

### Capacitors / Stores
- iOS/Android: `capacitor` + RevenueCat or StoreKit 2 directly. Products declared in `capacitor.config.ts`. `bootNativeShell` already handles status bar — add purchase restore flow there.
- Web: Stripe Checkout via `supabase/functions/push-send` sibling `create-checkout`.
- Wrangler: `VITE_SUPABASE_URL` already in `wrangler.toml` — add `VITE_REVENUECAT_KEY`.

---

## Recommended Ship Order (so you don’t ship 6 things at once)

**Phase 1 — Monetization skeleton (1 week)**
1. Add `entitlement` + `coach_usage` tables, `BloomSheet` paywall component, gate Coach + 1 tracker limit
2. Integrate RevenueCat/Stripe (test mode)
3. Ship “Free limits” + Plus upgrade — start earning while you build Together

**Phase 2 — Together v1 (2 weeks)**
- `partner_invites` + `partner_pairs` + `/together` + 1 sync challenge
- This is your headline 2.0

**Phase 3 — Profit polish (2 weeks parallelizable)**
- Wind-Down Ritual + Weekly Report 2.0 + Seasonal Arena (all low-effort, high-delight)

**Phase 4 — Atelier Pro + Cycle Together**
- Cosmetic studio + abstract cycle hints (max premium feel, low risk)

Each phase keeps `npm run test` 559 tests green + `npm run lint` clean.

---

## What I Need From You to Start Building

1. **Confirm pricing** — $5.99/$39.99 + $8.99 duo okay, or want ₹-pricing for India first?
2. **Coach limit** — 15/week sound fair, or want 5/day stricter?
3. **Together privacy** — Are you okay with “valence only” default for mood share, or want note opt-in hidden completely?
4. **Pick ONE to spec next** — I’d suggest **Coach Gating + Entitlement** (you earn tomorrow) *or* **Together Pairing Flow** (you wow on Product Hunt). Which first?

I can turn any of the 6 into a clickable `/together` prototype or the actual `BloomSheet` paywall in one session — just say the word and I’ll branch it.

— Your Bloom co-pilot 🌱

*Sources in repo:* `src/lib/coach/edge.ts:7-68`, `src/hooks/useMoodSystem.ts:12-40`, `src/lib/mood/analytics.ts:15-80`, `src/lib/progression/achievements.ts:1-60`, `src/lib/rewards/catalog.ts:1-90`, `src/components/home/HomeSidebar.tsx`, `src/lib/supabase.ts`, `BLOOM_APP_PROMPT.md:1-120`
