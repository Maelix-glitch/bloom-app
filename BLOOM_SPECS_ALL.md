# Bloom — Full Technical Spec for 6 Updates

> **How to use this doc:** Each section is build-ready. An engineer (or AI) can take any one section and ship it without reading the others. Shared foundation is in §0.
>
> **Stack context:** TanStack Start + React + Tailwind v4 + Supabase (Auth/Postgres/RLS/Storage/Edge Functions) + Capacitor + Wrangler. See `BLOOM_APP_PROMPT.md` / `BLOOM_NEXT_ROADMAP.md`. All paths relative to repo root.

---

## §0 — Cross-Cutting: Entitlements & Gating (do this first)

You cannot ship any paid feature correctly without this. Every other spec depends on it.

### 0.1 Goal
One source of truth for “what this account may do.” Works offline, survives no-config, never fabricates.

### 0.2 Model

**DB — `profiles` additions (Supabase migration `20260922_entitlements`):**

```sql
-- enum
do $$ begin create type bloom_tier as enum ('free','plus','duo'); exception when duplicate_object then null; end $$;

alter table public.profiles add column if not exists tier bloom_tier not null default 'free';
alter table public.profiles add column if not exists entitled_until timestamptz; -- null = lifetime / free
alter table public.profiles add column if not exists duo_paired_with uuid references auth.users(id) on delete set null; -- denormalized cache, authority is partner_pairs

-- client helper view: what the browser is allowed to see about itself
create or replace view public.my_entitlement as
  select id as profile_id, tier, entitled_until,
         (tier in ('plus','duo') and (entitled_until is null or entitled_until > now())) as is_plus,
         (tier = 'duo' and (entitled_until is null or entitled_until > now())) as is_duo
  from public.profiles where id = auth.uid();
grant select on public.my_entitlement to authenticated;
```

**Local mirror — `prefsStore` (so paywall reads never wait for network):**
- Prefs key: `bloom.entitlement` → `{ tier: 'free'|'plus'|'duo', until: string|null, updatedAt: string }`
- Written by `syncPrefs` after `pullPrefs`, and by purchase webhook. Read via `getPref("bloom.entitlement", parse, {tier:'free',until:null})`
- For `hasSupabaseConfig === false` → always `free`, never block local-first.

**Helper:**
```
src/lib/billing/entitlement.ts
  export type Tier = 'free'|'plus'|'duo'
  export function isPlus(tier: Tier, until: string|null): boolean
  export function useEntitlement(): { tier, isPlus, isDuo, loading }
```

Hook `useEntitlement()`:
- `useSyncExternalStore` on `PREFS_CHANGED` + `supabase.auth.onAuthStateChange` + poll `my_entitlement` once on mount
- Returns `loading:true` until first read — **never flash plus then revoke**. Paywalled UI shows skeleton while loading.

### 0.3 Gating UI — BloomSheet Paywall

**Component:** `src/components/system/EntitlementSheet.tsx` (wraps `src/components/ui/bloom-sheet.tsx`)
- Props: `{ open, onClose, feature: string, tierNeeded: 'plus'|'duo', contextLine?: string }`
- Copy: title “Bloom Plus”, body “Bloom stays free for the basics…”, two CTAs: Primary “Start 7-day free trial — $39.99/yr” + Secondary “Continue with Bloom Free”
- Never full-screen, never dark-pattern. On free tier, premium cards show 70% opacity + lock icon + sheet on tap. Premium users never see sheets.

**Rules (honor hard rules):**
1. **Degrade to local, never brick.** If `!hasSupabaseConfig` or offline, allow the action locally; sync will enforce later. Never show “Failed to load entitlement”.
2. **Server is authority.** Edge Function `coach` and any write-path re-checks `profiles.tier` from JWT. Client check is UX only.
3. **No flashing.** Use `useEntitlement().loading` skeletons.

### 0.4 Billing Plumb

- **Web:** Stripe Checkout via new Edge Function `supabase/functions/billing` → `profiles.tier` update via service-role webhook (`stripe webhook → supabase`).
- **iOS/Android:** RevenueCat (or StoreKit directly) → JS bridge in `src/lib/native-shell.ts` adds `onPurchaseRestored(tier)` that writes `profiles.tier` via RPC `claim_purchase(receipt)`.
- **Products:** `bloom_plus_monthly`, `bloom_plus_yearly`, `bloom_duo_monthly`, `bloom_duo_yearly` declared in `capacitor.config.ts` + RevenueCat dashboard.
- **Restore:** `Profile → Restore Purchases` button calls `billing/restore`.

**Migration file:** `supabase/migrations/20260922_entitlements.sql` (above)

**Tests:**
- `src/lib/billing/entitlement.test.ts` — isPlus logic, tier parsing, grace for `until` null
- Manual: flip `profiles.tier` in SQL, verify `my_entitlement` + client sheet appears/disappears within 2s.

---

## §1 — Coach (Copacha) Limits — “Bloom Plus for Coach”

> Your #1 revenue lever. Smallest code, biggest willingness-to-pay.

### 1.1 User Stories
- As a free user I can ask Coach ~2x/day without hitting a wall, but heavy use nudges me to Plus.
- As a Plus user I can attach photos/PDFs, speak, and Coach remembers what I told it last month.

### 1.2 Current State
- `src/lib/coach/edge.ts` → `supabase.functions.invoke(COACH_FUNCTION, {body: EdgeRequest})` with no limit.
- `src/hooks/useCoachSystem.ts` stores `conversations` in `localStorage bloom.coach.*` + `coach_messages` table; no count.
- `supabase/functions/coach/index.ts` has provider orchestration + `LENGTH_RULE` but no quota.

### 1.3 Data Model

**New table `coach_usage`:**
```sql
create table if not exists public.coach_usage (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  week_start date not null default date_trunc('week', now())::date, -- Monday
  count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.coach_usage enable row level security;
revoke all on public.coach_usage from anon, authenticated;
-- Only the edge function's service role writes; users read their own row via RPC
create or replace function public.my_coach_usage()
returns table (week_start date, count int, limit int, remaining int)
language sql stable security definer set search_path=public as $$
  select u.week_start, u.count,
         case when (select is_plus from public.my_entitlement) then 9999 else 15 end as limit,
         greatest(0, case when (select is_plus from public.my_entitlement) then 9999 else 15 end - coalesce(u.count,0)) as remaining
  from public.coach_usage u where u.profile_id = auth.uid()
  union all
  select date_trunc('week', now())::date, 0,
         case when (select is_plus from public.my_entitlement) then 9999 else 15 end,
         case when (select is_plus from public.my_entitlement) then 9999 else 15 end
  where not exists (select 1 from public.coach_usage where profile_id = auth.uid())
  limit 1;
$$;
grant execute on function public.my_coach_usage() to authenticated;
```
Plus users get 9999 (practically unlimited) but still counted for abuse detection.

### 1.4 Edge Function Changes (`supabase/functions/coach/index.ts`)

**Before LLM call:**
```ts
const usage = await getOrCreateUsage(auth.uid)
const { is_plus } = await getEntitlement(auth.uid)
const limit = is_plus ? 9999 : 15
if (usage.count >= limit) {
  return corsJson(req, 429, { error: "limit_reached", remaining: 0, limit, is_plus })
}
 // attach guards
if (!is_plus && body.image) return corsJson(req, 402, {error:"plus_required", feature:"vision"})
if (!is_plus && body.register === 'full') body.register = 'brief' // downgrade, don't error
```
**After success:** `incrementUsage(auth.uid)` (atomic `count+1` + rotate `week_start` if new week).

Add `limit`/`remaining` to success response so client updates pill instantly.

### 1.5 Client Changes

**Files:**
- `src/lib/coach/edge.ts` — handle `429` → `{ok:false, reason:"limit", detail:"15/week"}`
- `src/hooks/useCoachSystem.ts` — before `ask()`, call `my_coach_usage()` (cached 30s). If `remaining===0` & !isPlus → don't call edge, show `EntitlementSheet` with contextLine “You’ve used 15/15 this week.”
- `src/components/coach/Composer.tsx` — add usage pill: `13/15 this week • Resets Monday` (reads `my_coach_usage()`). When `remaining <=3`, pill turns amber, CTA “Go Plus”.
- `src/components/coach/Composer.tsx` — if !isPlus, disable camera/file button with lock icon → sheet “Plus to analyze photos.”
- `src/components/coach/CoachSidebar.tsx` — if !isPlus, memories list capped at 7 days, pin button → sheet.

**Copy (calm):**
- Limit reached title: “You’re at this week’s limit”
- Body: “Bloom Plus keeps the conversation going — unlimited messages, photos, and memory. Or pick it up Monday.”
- Primary: “Try Plus free”  Secondary: “Maybe later”

### 1.6 Gating Tiers
| Capability | Free (15/wk) | Plus |
|---|---|---|
| Text Q&A | ✓ (brief/normal) | ✓ (all registers including `full`) |
| History length | Last 24 conversations, 120 msg each (same) | same, but pinned search |
| Memory | 7-day window, no pin | Unlimited, pinned, forgot handled |
| Image/PDF | ✕ (button locked) | ✓ Gemini vision |
| Voice | ✕ | ✓ TTS/STT via `voice` lib |
| Providers | auto (cheapest) | all, health-aware |

### 1.7 Tests & QA
- `src/lib/coach/edge.test.ts` — add cases: 429 limit, 402 vision needs plus, register downgrade
- `useCoachSystem` mock: `remaining 0` shows sheet, no network call
- Edge: deploy to staging, set user to free, send 16 messages — 16th gets 429 with correct JSON.
- Ensure offline (`!hasSupabaseConfig`) never hits limit — coach shows “needs connection” path unchanged.

---

## §2 — Bloom Together v1 — Partner Invite + Duo Space

> Flagship 2.0. Private duo, not a social network.

### 2.1 User Stories
- I send a link/ handle request, they accept, we get a shared `/together` page.
- We see a Duo Map, active challenges, and can nudge each other.
- I control per-category what they see; Cycle is abstracted, never raw.

### 2.2 IA
New nav entry: between Mood & Rewards. `HomeSidebar.tsx` adds:
```
{ label:"Together", route:"/together", icon: Hearts, showWhen: pairedOrInvitable }
```
Locked state (unpaired) shows “Invite your person” empty state with same component.

### 2.3 Data Model

**Tables:**
```sql
create table if not exists public.partner_invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null check (char_length(code)=6),
  from_profile uuid not null references public.profiles(id) on delete cascade,
  to_profile uuid references public.profiles(id) on delete set null, -- null = link invite
  status text not null check (status in ('pending','accepted','expired','revoked')) default 'pending',
  expires_at timestamptz not null default now() + interval '48 hours',
  created_at timestamptz not null default now()
);
create index if not exists partner_invites_code_idx on public.partner_invites(code);
create index if not exists partner_invites_from_idx on public.partner_invites(from_profile);

create table if not exists public.partner_pairs (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.profiles(id) on delete cascade,
  b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null check (status in ('active','unpaired')) default 'active',
  check (a <> b),
  unique(a,b)
);
-- ensure unordered uniqueness: store lower id first via trigger
create or replace function public.normalize_pair() returns trigger language plpgsql as $$
begin if new.a > new.b then perform set_config('pair.tmp', new.a::text,true); new.a:=new.b; new.b:=current_setting('pair.tmp')::uuid; end if; return new; end; $$;
drop trigger if exists partner_pairs_normalize on public.partner_pairs;
create trigger partner_pairs_normalize before insert on public.partner_pairs for each row execute function public.normalize_pair();

create table if not exists public.partner_shares (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  allow_mood boolean not null default true,      -- valence only if true
  allow_mood_note boolean not null default false,-- extra toggle
  allow_trackers jsonb not null default '{"sleep":true,"water":true,"study":false,"movement":true,"energy":true,"screen":false}'::jsonb,
  allow_habits boolean not null default true,    -- only shared habits
  allow_cycle_hint boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_challenges (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.partner_pairs(id) on delete cascade,
  kind text not null check (kind in ('sync','combined','mirror')),
  title text not null, detail text not null,
  target int not null, progress_a int not null default 0, progress_b int not null default 0,
  state text not null check (state in ('active','completed','expired')) default 'active',
  period_start date not null, period_end date not null,
  created_at timestamptz not null default now()
);
create index if not exists partner_challenges_pair_idx on public.partner_challenges(pair_id, state);

create table if not exists public.partner_nudges (
  id uuid primary key default gen_random_uuid(),
  from_profile uuid not null references public.profiles(id) on delete cascade,
  to_profile uuid not null references public.profiles(id) on delete cascade,
  kind text not null, -- 'spark' | 'hydration' | 'study'
  created_at timestamptz not null default now()
);
-- rate limit: 3 nudges per pair per day via RLS check
```

**RLS:**
- `partner_invites`: `from_profile = auth.uid() OR to_profile = auth.uid()` can select; insert only `from_profile = auth.uid()`; accept via RPC `accept_invite(code)` (security definer, checks expiry, creates `partner_pairs`, marks invite accepted, enforces 1-pair limit).
- `partner_pairs`: select where `a=auth.uid() OR b=auth.uid()`; no direct update except via `unpair()` RPC (sets status unpaired, 7-day cooldown enforced via `created_at` check).
- `partner_shares`: own row only.
- Views for duo consumption:
```sql
create or replace view public.partner_visible_days as
 -- filtered DayEntry aggregates, only goal-met booleans per tracker per allow_trackers
 -- implementation reads partner_shares of the *other* profile
```
Keep abstraction: `partner_visible_days` never exposes `waterMl` exact if toggle false, only `met_goal boolean`.

For v1, simpler: client fetches partner's days via RPC `get_partner_snapshot()` that returns filtered aggregates per `partner_shares`. Never raw `mood_entries.note`.

### 2.4 RPCs
- `create_invite_link() returns code` — generates 6-char, inserts.
- `accept_invite(p_code)` — atomic: validate, create pair, init `partner_shares` rows + `coach_usage` untouched.
- `request_pair_by_handle(p_handle)` — creates `partner_invites` with `to_profile` lookup via `profiles.username`.
- `unpair()` — marks pair `unpaired`, triggers `NotificationCenter` system notice both sides.
- `get_partner_snapshot()` — returns `{ profile, shares, dayAggregatesLast7, challengeProgress }` filtered.
- `nudge_partner(p_kind)` — inserts `partner_nudges`, enforces 3/day, also `recordNotice` for recipient's bell.

### 2.5 Frontend

**Routes/pages:**
- `src/routes/together.tsx` — wrapper (entitlement check: free can see, but 1 challenge limit shows sheet)
- `src/components/together/TogetherPage.tsx` — layout: Hero (pair avatars + streak), DuoMap, ChallengesGrid, NudgeBar, SharesSettings link
- `src/components/together/DuoMap.tsx` — reuses `ConnectionMap` but with 2 nodes. Inputs: `myDays` (from `useTrackers`) + `partnerSnapshot`. No new analytics lib — reuse `analyzeTrackers` / `aggregateDays`.
- `src/components/together/ChallengeCard.tsx` — props `challenge: PartnerChallenge`, shows `progress_a + progress_b / target`, uses `RankBadge` style progress.
- `src/components/together/InviteSheet.tsx` — two tabs: “Share link” (copy `bloom.app/join/ABC123` + QR) + “By handle” (search `profiles.username`).
- `src/components/together/SharesSheet.tsx` — toggles per `partner_shares` (uses `setPref` mirror for instant UI, then `pushPrefs` + server update).
- `src/components/together/NudgeButton.tsx` — one-tap, shows undo 5s, writes `partner_nudges`.

**Hooks:**
- `src/hooks/useTogether.ts` — owns invite/pair/shares/challenges; similar to `useMoodSystem`: `useSyncExternalStore` + Supabase realtime on `partner_*` tables; exposes `{ pair, invites, challenges, snapshot, createInvite, accept, nudge }`.
- Integrates `NotificationCenter` — pairing requests + nudges are `recordNotice({kind:'system', url:'/together'})`.

**Pairing flow UI states:**
1. Unpaired empty: hero “Bloom, alone together” + CTA Invite (`InviteSheet`).
2. Pending (you sent): “Waiting for @handle” + cancel.
3. Pending (they sent you): Bell badge + `/together` banner “@handle wants to pair” → Accept/Decline.
4. Paired: full page.
5. Unpaired cooldown: “You can pair again in 5 days.”

### 2.6 Challenges Engine Detail (reuses progression)

- Define 8 seed challenges in `src/lib/together/challenges.ts` (mirrors `ACHIEVEMENTS` shape):
  ```ts
  {id:'sync-calm-7', kind:'sync', title:'7-Day Calm', detail:'Both log calm/happy', target:7, verify: (aDays,bDays)=> count days both have calm}
  ```
- `evaluatePartnerProgress(pairId)` — pure function reading both `DayAggregate[]` (my + partner filtered). Called on every `useTrackers` change + partner snapshot polling (30s + realtime). Never invents.
- Progression tie-in: completing a duo challenge calls `recordAward`? No — duo rewards are `RewardAssignments` of type `duo_emblem` via RPC `award_partner_challenge`, not points.

**Free vs Plus:**
- Free: 1 active challenge (oldest), no custom, no Mirror nudges limit 1/day.
- Plus: 3 active + create custom (pick trackers + target + period).

### 2.7 Edge Cases
- Unpair → keep challenge history (`state:expired`), streak resets.
- Partner deletes account → pair auto `unpaired` via FK cascade, other side gets system notice.
- Offline: Invite link copies locally, acceptance queues until online; DuoMap shows cached `partnerSnapshot` with “Updated 2h ago”.

### 2.8 Tests
- `src/lib/together/verify.test.ts` — sync/combined verification, partnerShares filtering, 1-pair limit.
- RLS tests via `supabase` test helper (mock JWT).

---

## §3 — Seasonal Arena — Monthly Quests

### 3.1 Goal
Give free users a reason to return daily; give Plus users bragworthy exclusives.

### 3.2 Model

**Table `seasons`:**
```sql
create table if not exists public.seasons (
  id text primary key, -- '2026-09'
  title text not null, -- 'Deep Rest'
  theme text not null, -- art key from REWARD_ART
  starts_on date not null, ends_on date not null,
  goals jsonb not null -- [{id, title, detail, domain, spec, target, points}]
);
-- seed via migration: 20260922_seasons.sql with 12 rows
create table if not exists public.season_progress (
  profile_id uuid not null references auth.users(id) on delete cascade,
  season_id text not null references public.seasons(id) on delete cascade,
  goal_id text not null,
  progress int not null default 0,
  completed boolean not null default false,
  claimed boolean not null default false,
  primary key (profile_id, season_id, goal_id)
);
```
Reuses `GoalSpec` verification from `src/lib/progression/evaluate.ts` — same `resolveSpec` function.

### 3.3 Frontend
- `src/components/progression/SeasonArena.tsx` — poster card (uses `REWARD_ART`) + 3 goal rows (reuse `Goals.tsx`).
- Route: `Rewards` tab “Season” alongside existing Atelier/Journey (add `Season` tab in `src/components/rewards/`).
- Global % : `public.season_stats` mat view (anonymized count of completers) polled once daily — no individual data.

**Free:** see season, 1 goal active (first). Others show lock → sheet.
**Plus:** all 3 goals, duo track (shows partner progress alongside), exclusive reward.

---

## §4 — Wind-Down & Rise Rituals

### 4.1 Goal
Cinematic, 60-second bookends for the day that make mood feel premium without extra taps.

### 4.2 Spec

**Times:**
- Defaults: Wind-Down 21:00, Rise 08:00 local (from `useReminders` + `localDay`).
- Stored in `prefs` `bloom.ritual.times` → `{ windDown:"21:00", rise:"08:00", windEnabled:true, riseEnabled:true }` + synced via `user_prefs`.

**Triggers:**
- `RemindersEngine.tsx` already fires habit reminders. Add two new kinds: `evening` (wind-down) + `morning` (rise) in `src/lib/reminders`.
- Uses `NotificationCenter` (`kind: evening`) + `recordNotice`. Tapping notification deep-links to `/?ritual=evening` which opens `RitualSheet`.

**UI:**
- `src/components/ritual/RitualSheet.tsx` (BloomSheet variant)
  - Wind-Down: breathing animation (MoodBlob pulse + `Atmosphere` candle.jpg backdrop), 1 slider `energy` + 1 emotion chip + optional 1-line note (same `Composer` but stripped to 30s). Writes `MoodEntry` with `timestamp: now()`.
  - Rise: intent prompt “One thing to shape today?” → saves `prefs` `todayIntent` or creates `Habit` draft via `habitToDraft`.
- `src/lib/ritual/sound.ts` — 3 free, 12 Plus ambient loops (reuses `useAmbientSound`). Controlled by `bloom.ritual.sound` pref.

**Free:** 1 ritual/day, default prompts, no sound picker.
**Plus:** custom times, sound library, streak beads for rituals.

**Non-shaming copy:** If missed, `Insights` says “No wind-down last night — tomorrow’s there.”

---

## §5 — Weekly Bloom Report 2.0

### 5.1 Goal
Turn private analytics into a saveable, shareable artifact.

### 5.2 Data
Already computed: `MoodChart` days, `calculateVolatility`, `emotions`, `correlations`, `patterns`, `anomalies` from `useMoodSystem`. Reuse verbatim.

**New lib:** `src/lib/report/buildReport.ts` — pure, given `entries`, `range`, `trackers Days` returns serializable `ReportDoc`.

### 5.3 Export
- `src/components/report/WeeklyReportPage.tsx` upgrade: editorial layout (Fraunces headings, mono captions, `MoodGraph` mini + `Heatmap` 7×4).
- PDF: client-side `window.print()`-friendly page + `exportAll()` JSON bundle for backup (already). Plus users get `Generate PDF` (uses `src/lib/report/pdf.ts` via `jspdf` or server `supabase/functions/report` that renders same HTML).
- Share Card: `ShareCard.tsx` 1080×1920 canvas (uses `canvas` or `html2canvas`) — posts to `StoryComposer` as pre-filled story (Duo page adds side-by-side curves).

**Delivery:**
- In-app: `NotificationCenter` `kind: insight` every Monday 09:00 local (“Your Week in Bloom”).
- Email: `supabase/functions/push-send` already sends pushes — add weekly cron (pg_cron) calling `push-send` for `season_insight` kind if `is_plus`.

**Free:** View last 7D in-app.
**Plus:** 30D/90D/1Y, PDF, share card, email, duo page.

---

## §6 — Atelier Pro — Theme Studio + Sound Atelier

### 6.1 Goal
Monetize cosmetics ethically — pay for *lusher*, not for basics.

### 6.2 Theme Studio

**Current:** `REWARD_ART` 10 artworks, `THEMES` 6 at 850pts (hard-earned). Keep.

**New:** `src/components/atelier/ThemeStudio.tsx`
- Live controls for `oklch()` tokens: `--background`, `--surface`, `--surface-2`, `--violet/sky/amber/sage/rose`, `--ci-*`. Sliders update `document.documentElement.style` live via `BloomSkin` (`src/components/rewards/BloomSkin.tsx`).
- Preview strip: `TrackersDesign Atlas` mini + `MoodChart` mini live-updating.
- Save: writes `prefs` `bloom.theme.custom` (Plus only) + option to publish as `reward_items` of type `theme` for self.

**Free:** 2 base themes (Velvet Night, Ink Serenity), no studio.
**Plus:** Studio + all 10 seasonal themes at 50% point cost + instant unlock option.

### 6.3 Sound Atelier

- `src/lib/sound/catalog.ts` — 15 loops (3 free: rain, forest, cafe; 12 Plus: ocean, fireplace, etc.) stored at `/public/sounds/`.
- `src/hooks/useAmbientSound.ts` already loops — add picker in `Profile → Personalization`.
- Per-page binding: `bloom.sound.map` → `{ "/":"rain", "/mood":"candle", "/together":"forest" }`.

**QA:** Ensure audio never auto-plays without user gesture (browser policy); respect `prefers-reduced-motion`.

---

## §7 — Cycle Together (Abstracted)

> Most delicate. No raw data ever leaves the device except an abstract hint, and only with explicit consent + expiry.

### 7.1 Principle
Follow existing Bloom conviction: *“Never diagnose, never imply clinical authority”* + privacy-by-default. Copy `phaseScience.ts` tone.

### 7.2 Model

Extend `partner_shares` flag `allow_cycle_hint boolean` (already in §2 schema).

**Derived hint (client-computed, never stored raw):**
```ts
function cycleHintForPartner(cycleState: CycleState): Hint | null {
  // cycleState from useCycleSystem → only phase + band
  if (!cycleState.tracking || !shares.allow_cycle_hint) return null
  return {
    phaseLabel: cycleState.phaseLabel, // "Follicular" only if tracking
    energyBand: bandOf(cycleState), // "steady" | "high" | "rest" — from phaseScience
    tip: phaseScienceLine(cycleState.phase, 'partner') // one calm line
  }
}
```
Partner sees: `PhaseWave` silhouette in muted color + `tip` text + no dates, no bleed, no symptoms, no `HistoryTable`.

**Consent:** Toggle in `PrivacySheet` → confirm modal “Share only phase energy band, auto-expires in 30 days” → writes `partner_shares.allow_cycle_hint=true` + `hint_expires_at` (new col) default `now()+30d`. Re-prompt on expiry.

**Free:** off, toggle disabled → sheet “Plus + Together”
**Plus+Paired+HintOn:** visible.

### 7.3 Tests
- Ensure `get_partner_snapshot()` never returns `periodCloud` rows when hint is on — only `Hint`.
- `cycleCloud.test.ts` already asserts anon revoked — add hint test.

---

## Cross-Feature Wiring

- **Entitlement everywhere:** every spec checks `useEntitlement()` before showing/activating. Never assume plus.
- **Prefs mirroring:** All user-chosen settings (ritual times, theme, shares) live in `user_prefs` via `prefsStore` so phone ↔ laptop stay in sync without extra tables.
- **Realtime:** `habits`/`habit_logs`, `tracker_days`, `mood_entries`, `partner_*` all subscribed via `supabase.channel` alongside existing `habitRealtime.ts`.

---

## Ship Order (reconfirmed)

1. **§0 Entitlement + §1 Coach** (1 week) — revenue from day 7
2. **§2 Together v1** (2 weeks) — headline
3. **§4 Rituals + §5 Report 2.0** (parallel, 1-1.5 weeks) — polish that feels “2030”
4. **§3 Seasonal Arena + §6 Atelier + §7 Cycle Hint** (1-2 weeks) — cosmetics + moat

Each phase: `npm run test` (559 tests) + `npm run lint` green, no `public/manifest` break, no local-first regression.

---

## Next Step

Pick one § to become the next branch. Recommended first cut: **§0 + §1** (migrations + EntitlementSheet + coach limits) — it’s the smallest diff that lets you charge, and it unblocks every other §’s gating in the same PR.

If you want, I can now:
- generate `supabase/migrations/20260922_*.sql` files for §0/§1/§2,
- scaffold `src/lib/billing/entitlement.ts` + `EntitlementSheet.tsx`,
- and open a PR, all without touching `main`’s behavior for free users.

Just say “scaffold §0+§1” or “scaffold Together” and I’ll branch it.
