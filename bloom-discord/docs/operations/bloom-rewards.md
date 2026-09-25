# Bloom Rewards

Points, ranks, check-ins and small wins. This is the part of the platform most
able to do quiet harm, so it is the part with the most rules written down.

## What it is for

The brief describes a journey: meaningful action → Bloom Points → milestone →
rank. What it rules out is longer than what it asks for — no XP farming, no
reward inflation, no fake stats, no giant embeds, no manufactured urgency. Those
are not decorative constraints. A points system is a machine for changing
behaviour, and in a community about consistency and wellbeing, the wrong nudge
is worse than no nudge.

So the design target is not engagement. It is that a member who ignores the
points entirely loses nothing, and a member who watches them closely is never
pushed.

## These are not the Bloom app's points

The Bloom app has its own progression: Bloom Points earned from verified
personal records, where the cheapest goal pays 100, the named ladder runs to
25,000 across twelve ranks, and past that it continues in seasons forever.

Discord's points pay 5 for showing up. They are a different economy measuring a
different thing, and the Phase 0 note asking for the two ladders to be
reconciled was answered in Phase 5 with: they cannot be, and should not be.
Mapping community chatter onto personal progress would either inflate the first
or cheapen the second.

They are therefore kept apart and named apart — the app has **Bloom Points**,
this has **Bloom Rewards points** — and nothing in Discord claims to reflect
app progress. There is also no account link between a Discord user and a Bloom
profile, so Discord could not read those totals even if it should.

## What each action pays

| Action             | Points | Limit                            |
| ------------------ | -----: | -------------------------------- |
| `/checkin`         |      5 | Once per calendar day            |
| `/win`             |     10 | Three paid wins per calendar day |
| Staff manual award |  1–500 | Administrator, always audited    |
| Staff correction   |      — | Negative entry, never an edit    |

Both automatic numbers are deliberately small relative to the ladder, and both
are constants in `@bloom/shared-types` that everything reads. That is the point
of having them there: an economy does not usually inflate by decision, it
inflates through a series of individually reasonable increases, and a constant
makes any such change one visible diff.

**Nothing multiplies.** No streak bonus, no combo, no weekend double points, no
catch-up award for a member who fell behind. A streak is _shown_ because it is a
true fact about someone's participation, and it changes nothing about what they
earn — the moment a streak pays, missing a day acquires a cost, and charging
someone for a bad week is the wrong incentive for a wellbeing community.

**The cap is on the reward, never on the participation.** A fourth win in a day
still posts, still gets seen, and simply does not pay. The reply says so without
a word of discouragement, and that wording is asserted in a test.

## The ladder

Nine ranks, from Seedling to Master Bloom, at 0 / 50 / 150 / 350 / 700 / 1,200 /
2,000 / 3,200 / 5,000 points.

At a realistic 5–15 points a day, First Bloom arrives in the first week, In
Bloom around two months, and Master Bloom beyond a year of genuine
participation. The gaps widen on purpose: even spacing rewards volume, widening
spacing rewards staying.

Rank is **derived from the balance, never stored**. A stored rank is a second
source of truth that drifts, and the version that drifts is always the one a
member is looking at.

## How the ledger protects itself

The rules live in the schema rather than in the service, because a service can
forget and a constraint cannot. Full detail in
[the schema reference](../reference/database-schema.md#point_events--phase-5);
the short version:

- **Append-only.** No balance column, no `UPDATE` path. A balance is
  `SUM(points)`, so it cannot disagree with the rows that produced it.
- **Corrections are entries.** Staff fix a mistake by appending a negative
  `adjustment` with a reason and an actor, never by editing history.
- **A replay pays once.** `UNIQUE (guild_id, idempotency_key)` decides, not the
  application. Ten workers replaying one award insert one row between them.
- **Every award is attributable.** A CHECK requires an actor on manual entries
  and forbids one on automatic entries, so "who gave me these points?" always
  has an answer.
- **One check-in per local day**, enforced by a primary key rather than a
  `SELECT` that races with the `INSERT` after it.
- **No negative balances.** A correction that would overdraw is refused, and two
  concurrent corrections are serialised by an advisory lock — there is no row to
  lock when the balance is a sum.

## Days, timezones and streaks

"Have you checked in today?" is a question about a calendar day in a particular
place, not a 24-hour window. A member who checks in at 23:50 and again at 00:10
has checked in on two days; one who checks in at 09:00 and 17:00 has checked in
on one.

So the day is the calendar date in `BLOOM_TIMEZONE`, resolved through `Intl`
(which knows about daylight saving) and **stored** on the check-in row. Storing
it means changing `BLOOM_TIMEZONE` later cannot rewrite the meaning of check-ins
already recorded.

Streaks are derived from those dates on every read, never stored as a counter. A
counter has to be maintained by something that runs every night, and the night
it does not run it starts lying — which is worse than not having the feature,
because members compare streaks with each other. Yesterday counts as unbroken,
so nobody is told their streak is zero at nine in the morning before they have
had a chance to check in.

## What is recorded, and what is not

| Recorded                                   | Not recorded                |
| ------------------------------------------ | --------------------------- |
| That a member checked in, and on which day | Anything about how they are |
| That a win was shared, and what it paid    | The text of the win         |
| Who made a manual award, and why           | —                           |

`/checkin` takes no text at all. The obvious design is a mood field; it would
make this platform the custodian of a daily record of how everybody in the
community is feeling, which is sensitive data with no operational use and real
consequences if it leaked.

`/win` does take text, and that text goes to `#small-wins` and nowhere else —
not the ledger, not the audit row, not the logs. A member's own words belong in
the place they chose to put them. A test asserts a phrase given to `/win` cannot
be found anywhere in the ledger, the audit trail or the captured logs.

## Turning it off

`FEATURE_REWARDS=false` — the default — switches off the economy without
switching off the community features. `/checkin` still records the day, `/win`
still shares the win, and both say plainly that no points were added.
`/companion profile` reports that rewards are off rather than showing an empty
economy that looks broken.

The check-in row in that state has a null `point_event_id`, which is an honest
representation rather than a gap: the participation happened and earned nothing.
Back-filling points for it when the flag is switched on later would be inventing
history, and the platform does not do that.

## Operating it

There is no administrator command for points yet — `/companion admin award` is
planned, not built. Until it exists, a correction means a SQL insert, and it
must be an insert:

```sql
-- Correct a double award. Never UPDATE or DELETE a point_events row.
INSERT INTO bloom_discord.point_events
  (guild_id, user_id, kind, points, reason, awarded_by, idempotency_key)
VALUES
  ('<guild>', '<member>', 'adjustment', -10,
   'Awarded twice on 2026-03-12 after a redeploy',
   '<your user id>', 'manual-correction-2026-03-12-<member>');
```

The CHECK constraints will refuse this if you omit the reason or the actor, and
the length floor will refuse a throwaway idempotency key. That is intended: a
correction with no explanation is indistinguishable from a mistake six months
later.

### Common questions

**"My points did not go up."** Check `FEATURE_REWARDS`. Then check whether the
daily cap was already reached — `/companion profile` lists recent entries with
their kinds, which usually answers it in one look.

**"Two people have the same total but different ranks."** They do not; rank is a
pure function of the balance. What differs is when they last looked, since the
profile is read live.

**"The leaderboard is empty."** It is period-scoped. An empty board means nobody
has earned anything in the last 7 days, which in a quiet week is correct.

**"Someone's total looks wrong."** Read their ledger. Every point has a row, a
kind, a timestamp and — if a human was involved — an actor and a reason:

```sql
SELECT created_at, kind, points, reason, awarded_by
FROM bloom_discord.point_events
WHERE guild_id = '<guild>' AND user_id = '<member>'
ORDER BY created_at DESC;
```

That query is the whole argument for an append-only ledger. It always answers.
