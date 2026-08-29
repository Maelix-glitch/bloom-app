# Bloom backend setup

## Cycle intelligence — run `20260829_cycle_intelligence.sql`

After the Profile migration, also run
`migrations/20260829_cycle_intelligence.sql` in the SQL editor. It is
idempotent and additive:

- ensures `cycle_entries` exists with all advanced-log columns
  (flow, temperature, cervical mucus, LH tests, pain, activity,
  contraception, energy, sleep, mood, symptoms, notes)
- unique index on `(profile_id, date)` — the upsert key the app uses
- `updated_at` trigger
- **owner-only RLS on every action, `anon` revoked entirely** — cycle
  data is never readable cross-user and never appears in public profile
  responses (the public profile function reads only profiles, stories,
  and highlights)

The React Cycle page (`/cycle`) reads and writes this same table; the
legacy `public/bloom/cycle.html` remains untouched for compatibility.


## Profile 2.0 — identity, privacy, stories, highlights

Run `migrations/20260828_profile_identity_stories.sql` in the Supabase SQL
editor. It is additive and safe to re-run:

- extends the existing `profiles` row with `display_name`, `username`, `bio`,
  `avatar_path`, `accent`, `featured` (legacy `profile_name` rows keep working;
  the value is copied into `display_name` once)
- creates `profile_privacy` (profile + story visibility, private by default),
  `stories` (24h lifetime, `expires_at`, soft `deleted_at`),
  `story_highlights` + `story_highlight_items`
- enforces every privacy rule with RLS; `get_public_bloom_profile()` is the
  only path to another person's data and it returns public fields only
- creates the public `profile-media` storage bucket, namespaced by user id
  (`{user}/avatar.jpg`, `{user}/stories/{uuid}.jpg`), writes scoped by policy

Until the migration is applied, the Profile page still renders gracefully and
each section shows a calm "try again" state.

---

# Bloom Rewards setup

The Rewards page is a curated delivery system. It does not generate rewards from mood, XP, points, streaks, or demo data.

## 1. Apply the schema

Run `migrations/20260826_reward_delivery.sql` in the Supabase SQL editor. It creates:

- `app_admins` — the allow-list of reward administrators
- `reward_items` — draft/published/revoked reward records
- `reward_assignments` — the per-user published/claimed delivery state
- RLS policies and security-definer RPCs for user and admin actions

## 2. Grant administrator access

After the intended administrator has an Auth account, run this manually from a trusted SQL editor session:

```sql
insert into public.app_admins (user_id)
values ('THE_AUTH_USER_UUID');
```

Do not expose a Supabase service-role key in the browser. The admin UI uses the protected RPCs and the signed-in user's `auth.uid()`.

## 3. Use the admin console

Sign in as the allow-listed administrator and open `/admin/rewards`.

1. Create a draft.
2. Add the title, description, image URL, type, details, admin message, and dates.
3. Select one or more Auth users.
4. Publish the reward.

Drafts are not returned to user pages. Published rewards are returned only to their assigned users. Claiming is performed by the `claim_reward` RPC, which checks the signed-in user and published assignment again on the server.

## 4. User visibility rules

`get_my_rewards()` uses `auth.uid()` and returns only rewards assigned to the current user that are published and inside their publication window. Expired or revoked unpublished deliveries are not returned. A claimed reward can remain visible as the user's own history when appropriate.
