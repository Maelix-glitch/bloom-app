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
