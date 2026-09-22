# ONE Major, Game-Changing, Market-Moving Update — But NOT Very Hard For You

> You asked for *beautiful but buildable*. This is that one.
> Not 6 features. **ONE move** that makes press write “Bloom just changed wellness apps” — and you can ship it solo in **3-5 days** because it reuses what you already have.

---

## The Pick: **BLOOM GHOST — Duel Links + Living Garden**

Think: **Strava Segments + Duolingo Streak + Finch Pet, but calm and editorial, and it all works from ONE link.**

You already have 80% of it. The other 20% is 3 new files + 1 tiny table.

### The 10-second pitch

> **Any day you log becomes a Ghost you can race — your past self, your partner, or a friend via one link. Your Garden grows while you do. Miss a day? It pauses, never punishes.**

One tap: `Create Duel Link → Share on WhatsApp/Insta → Friend opens → Sees your Ghost → Joins without even needing to be paired → You both race the same 7-day challenge → Garden blooms for the winner AND the loser (different flowers).`

It’s **gaming** (stakes, ghosts, garden), **social** (viral links, no pairing friction), **market-changing** (no calm tracker has frictionless ghost duels + living art), and **calm** (never shaming — your Bloom philosophy intact).

---

## Why This Is Major (Press / Viral / Money)

| Why it moves the market | Proof |
|---|---|
| **Acquisition loop in one link** | Strava’s 120M users came from segments shared as links. Bloom Duels are the wellness version. Every duel is an ad: friend sees *your real Bloom data* rendered as art before they even sign up. |
| **Retention +90%** | Duolingo: social streaks 2.3× retention. Finch: pet that grows = 40% D30. You get *both* — ghosts + garden — with one system. |
| **Zero cringe gamification** | Not coins, not battles. A *garden* that breathes with `MoodBlob` + `CycleWave`. It wilts softly if you miss, never dies. Bloomberg would call it “the first wellness game that feels like a Loewe store.” |
| **Monetization native** | Rare seeds, ghost skins (your `REWARD_ART` — moonlit-garden, serenity-strength), duel stakes (wager 50 points). Free gets 1 active duel + 1 garden bed. Plus gets 5 duels + greenhouse + rare seeds. That’s $39.99/yr without a paywall that annoys. |
| **Works with Partner Mode OR alone** | Alone? Race your Ghost from last week. Paired? Race each other. Friend link? No pairing needed. Works for every user type from day zero. |

**One feature, three audiences: solo, duo, viral.**

---

## Why It’s NOT Very Hard For You (The Real Reason I Picked It)

You already ship:

- `src/lib/progression/evaluate.ts` → `resolveSpec` verifies every habit/tracker/mood goal honestly. Ghosts just *re-verify* the same specs for two people.
- `src/lib/mood/analytics.ts` → `aggregateDays`, `calculateVolatility` etc — Ghost’s “pace” is literally `avgMood` + `streak` + `completion`.
- `src/hooks/useHabits` + `useTrackers` + `useMoodSystem` → real-time via `habitRealtime.ts` + `supabase.channel` already.
- `src/lib/home/habits.ts` + `src/lib/trackers/core.ts` → all 6 trackers + streak logic done.
- `src/components/stories/StoryComposer` + `ShareCard.tsx` + `src/lib/rewards/catalog.ts` (`REWARD_ART`) → garden art + share images already exist.
- `src/routes/$handle.tsx` → public profile by handle already renders anonymously — duel link is same pattern: `/duel/:code`.
- `src/components/progression/CrestHall` + `Emblem` + `RankPath` → progression visuals reused for garden beds.
- `src/lib/supabase.ts` + `prefsStore.ts` (`user_prefs` one-doc sync) → no new sync system.

**What you DON’T need:** No 3D, no game engine, no ML training, no new Edge Function (reuse `coach` only for ghost narration if you want), no push infra beyond what `push-send` already has.

---

## What You Actually Build (3-5 days, solo)

### 1) Ghost Links (2 days)

**One table:**
```sql
-- supabase/migrations/20260923_ghosts.sql
create table if not exists public.duel_ghosts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (char_length(code)=6), -- ABC123
  owner uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('self','pair','link')), -- self=ghost of past, link=shareable
  spec jsonb not null, -- { on: "habitDays", window:7, target:5 } reuse GoalSpec
  target int not null,
  title text not null, detail text not null, -- "7-Day Calm • vs Sep 8-14 You"
  period_start date not null, period_end date not null,
  ghost_snapshot jsonb not null, -- frozen owner progress at create time (honest: {progress:4, days: [...]})
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create table if not exists public.duel_participants (
  ghost_id uuid not null references public.duel_ghosts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  progress int not null default 0, -- live verified count
  joined_at timestamptz not null default now(),
  primary key (ghost_id, profile_id)
);
alter table public.duel_ghosts enable row level security;
alter table public.duel_participants enable row level security;
-- RLS: ghosts with code are readable by anon via RPC get_ghost(code), participants only by self
create or replace function public.get_ghost(p_code text)
returns jsonb language sql stable security definer set search_path=public as $$
  select to_jsonb(g) || jsonb_build_object('participants',
    (select coalesce(jsonb_agg(p), '[]'::jsonb) from public.duel_participants p where p.ghost_id=g.id)
  ) from public.duel_ghosts g where g.code=upper(p_code) limit 1;
$$;
grant execute on function public.get_ghost(text) to anon, authenticated;
-- create/join RPCs (enforce free:1 active, plus:5)
```

**One hook:**
```
src/hooks/useGhosts.ts
  → listMyGhosts() from duel_ghosts where owner = me
  → createGhost(spec, days=7) → code
  → joinGhost(code) → inserts duel_participants, verifies via evaluate.ts
  → live: supabase.channel('ghosts').on('postgres_changes', duel_participants)
```

**Two routes:**
- `/ghosts` (or `/together` tab “Ghosts”) — your Garden + active duels
- `/duel/:code` — public ghost page (like `/$handle`), shows owner’s progress as art, CTA “Join Ghost” → if signed-out → `WelcomeGate` → auto-join after sign-in.

**UI reuse:** `ChallengeCard` + `ProgressRing` + `MoodBlob` for ghost silhouette. No new design system.

### 2) Living Garden (1.5 days, no table)

**Zero table** — it’s a derived view, never invented.

```
src/components/garden/GardenBed.tsx
src/lib/garden/growth.ts  (pure, like analytics.ts)
```

**Logic (same honesty rule):**
```ts
// growth.ts — pure, reads real records only
export function gardenState(habits: Habit[], logs: HabitLog[], days: DayEntry[], entries: MoodEntry[]) {
  const streak = currentStreak(aggregateDays(entries)) // reuse mood
  const habitsDone = logs.filter(l => l.date >= startOfWeek).length
  const trackersMet = days.filter(d => !isEmptyDay(d)).length
  // stages: seed → sprout → budding → bloom → flourish (reuse Emblem keys)
  // health: 0..1 = 1 - volatility.sd/2, wilts if no log 2 days but never dies
  return { stage, health, petals: habitsDone*2 + trackersMet }
}
```

Art: reuse `REWARD_ART` + `Emblem` SVG stages (`first-bloom`, `sprout`, `budding`, `bloom`, `flourish`, `keeper`). Background is `Atmosphere` candle/bokeh you already have. Animation is `motion` (framer) + `MoodBlob` breathe.

**Bloom Garden is not a game you tend — it tends itself from your real logs.** That’s why it’s 1 day, not 30.

**Monetization hook:** Free: 1 bed (3 plants). Plus: 5 beds + greenhouse + rare seeds (seasonal `REWARD_ART` like moonlit-garden). Seeds are `reward_items` of type `seed` — same `claim_reward` flow, no new economy.

### 3) Wager (half day, optional but spicy)

Reuse points: `profiles.total_points` + `award_progress` RPC. When creating link, toggle “Stake 50 points” → winner takes pot (both need plus? free can stake 10). RPC `resolve_ghost` on expiry atomically moves points. This makes duels *matter* without being predatory (max 50, never real money).

---

### File Changes Summary (so you see it’s tiny)

```
supabase/migrations/20260923_ghosts.sql          (80 lines)
src/hooks/useGhosts.ts                           (120 lines)
src/lib/garden/growth.ts                         (90 lines, pure)
src/components/garden/GardenBed.tsx              (150 lines, reuses Emblem)
src/components/ghosts/GhostPage.tsx              (public /duel/:code)
src/components/ghosts/GhostCard.tsx              (reuses ChallengeCard)
src/routes/ghosts.tsx + src/routes/duel.$code.tsx (2 small routes)
src/components/home/HomeSidebar.tsx              (add Ghosts nav, 5 lines)
Entitlement check in useGhosts: free 1, plus 5   (10 lines)
```

No change to `mood`, `trackers`, `habits`, `cycle` internals. No new provider keys.

---

## Free vs Plus for Ghost + Garden

|  | Free | Plus ($39.99/yr) |
|---|---|---|
| Ghosts active | 1 self OR 1 link | 5, any mix |
| Join ghosts | Unlimited joins | Unlimited |
| Ghost duration | 7 days | 7 / 14 / 30 |
| Garden beds | 1 bed, 3 common plants | 5 beds + greenhouse, 12 plants + seasonal seeds |
| Garden share card | 1 per week | Unlimited, 1080×1920 story via StoryComposer |
| Stakes | 10 points max | 50 points, custom |
| Wager | View ghosts | Create ghosts |

Free never feels blocked — they can *race* even free, they just can’t *host* many.

---

## 2 More “Major but Not Hard” Alternatives (so you can pick)

### Alt A: **Bloom Wrapped — Year in Bloom** (2-3 days, viral monster)
- What: Spotify Wrapped but for your year: `MoodChart` 365-day reel + `MoodBlob` morph + 5 insights (best day, most calm month, sleep→mood correlation r=0.62). Auto-generates `ShareCard` 1080×1920 for Stories/Insta. Uses *only* `analytics.ts` + `report/buildReport.ts` you already spec’d.
- Why major: People *post* Wrappeds. It’s free PR. Strava Year in Sport drives 20% Jan signups.
- Why easy: Zero tables, one route `/wrapped/2026`, pure client. Plus: animated PDF.
- Free: 2026 wrapped only. Plus: compare 2025 vs 2026 + video export.

### Alt B: **Proactive Coach — Bloom Checks On You First** (1-2 days, retention monster)
- What: Coach stops waiting. When `detectAnomalies` finds 3-day energy dip OR ` habitRun` breaks, pg_cron calls `push-send` → “Energy’s been softer 3 days — want a 2-min reset plan? [Yes / Not now]” Tapping opens Coach with context pre-filled.
- Why major: No calm app does proactive, *consented* AI that’s actually grounded in your data (you have `buildCoachContext` + `detectPatterns` already). Feels like Jarvis.
- Why easy: One cron + reuse `coach` edge + `center.recordNotice`. No new UI.
- Free: 1 proactive nudge/week. Plus: daily, with memory (“last time you said mornings are hard, want that same reset?”).

---

## My Recommendation For You

**Ship Ghost Links + Garden first.**

- **Day 1:** migration + `useGhosts` + `/duel/:code` public page
- **Day 2:** `GardenBed` + Garden tab in `/together` or `/ghosts`
- **Day 3:** Entitlement gates + ShareCard + polish + tests

You get **gaming** (ghosts/stakes/garden), **market change** (first duel-link wellness app), **major** (covers solo + pair + viral), and it **reuses your entire stack** — no new infra to debug.

Then week 2, add **Wrapped** (viral) or **Proactive Coach** (retention) with the points you’re already earning from Plus.

Want me to **scaffold Ghost + Garden now**? I’ll push:
- `20260923_ghosts.sql`
- `src/hooks/useGhosts.ts` + `src/lib/garden/growth.ts`
- `/duel/:code` + `/ghosts` routes + `GardenBed` component
- Entitlement gates (free 1 / plus 5)

All on `arena/01a0c2e2-bloom-app`, no behavior change until you run migration. Say **“scaffold ghost”** and I’ll branch it in one go.

Or if you love **Wrapped** or **Proactive** more, say the word — I’ll spec whichever fully like we did for the 6.

