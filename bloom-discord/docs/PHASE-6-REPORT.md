# Phase 6 — Milestones and achievements

Recognition that pays nothing.

Phase 5 built an economy. This phase builds the thing an economy usually
swallows: a permanent record of what a member has actually done, kept separate
from the points so that neither can inflate the other.

---

## What was built

Eleven awards, granted automatically from counts the database can reproduce,
announced once, worth zero points.

| Key                         | Name                       | Earned by                                     |
| --------------------------- | -------------------------- | --------------------------------------------- |
| `milestone.checkins.1`      | First Check-in             | Check in on 1 day                             |
| `milestone.checkins.10`     | Ten Days                   | Check in on 10 days                           |
| `milestone.checkins.50`     | Fifty Days                 | Check in on 50 days                           |
| `milestone.checkins.100`    | One Hundred Days           | Check in on 100 days                          |
| `milestone.checkins.250`    | Two Hundred and Fifty Days | Check in on 250 days                          |
| `milestone.wins.1`          | First Win                  | Share 1 small win                             |
| `milestone.wins.10`         | Ten Wins                   | Share 10 small wins                           |
| `milestone.wins.50`         | Fifty Wins                 | Share 50 small wins                           |
| `achievement.returned`      | Came Back                  | Check in again after a month or more away     |
| `achievement.both_in_a_day` | Arrived and Shared         | Check in and share a win on the same day, ×10 |
| `achievement.six_months`    | Six Seasons                | Check in during six different calendar months |

Thresholds widen rather than repeat, for the same reason the rank ladder does:
even spacing rewards volume, widening spacing rewards staying. Eleven, not
fifty — a wall of badges is a collection game, and a test caps the list at
fifteen so growth has to be a decision.

---

## Three decisions worth defending

### No award grants points

The two systems never touch. Points measure recent participation and are meant
to lose relevance; an award is a permanent record that something happened. If a
milestone paid, the loop would close — participate to earn points, earn points
to hit a milestone, hit a milestone to earn more points — and a loop that feeds
itself is exactly the XP farming the brief rules out.

The same separation means awards count **actions**, not balances, so they are
unaffected by `FEATURE_REWARDS`. A member who checked in fifty times did that
whether or not the server was paying for it.

### No award for a perfect run

This is a deliberate divergence from the Bloom app, which has "Seven Days
Strong" and "Thirty Strong" and is right to have them.

The difference is visibility. An app badge is between a member and themselves.
A Discord award is announced to the server. Phase 5 established that a streak
displays but never multiplies, so that missing a day costs nothing — and a
public, permanent badge for an unbroken run hands that cost straight back, with
an audience. `achievement.returned` is the intentional inversion: the only
award in the set that requires having been away.

A unit test asserts that no definition's key, name or condition contains
`streak`, `in a row`, `consecutive`, `every day` or `perfect`, so this cannot be
reintroduced as an oversight by someone who has not read this page.

### Evaluation lives in the command, not in a service

Neither service knows the other exists. `RewardsService` has never heard of
milestones; `AwardsService` has never heard of a check-in — it re-derives counts
from the records either way. The two are composed in the command handler:

```ts
const granted = await deps.awards.evaluate({ guildId, userId, correlationId });
return copy.checkedInMessage({ ...result, granted });
```

Adding another action that should trigger an evaluation is one line, not a
dependency. The alternative — having the rewards service grant awards — would
have made the ledger the thing that decides what a milestone is, and then no
action that pays nothing could ever earn one.

Evaluation is **pull-based**: after an action, load held keys, skip everything
already held, and run the participation query only if something is still
outstanding. A member who holds every award they can currently reach costs one
indexed lookup per check-in.

---

## Files

### Added

| File                                                            | What                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| `database/migrations/0007_awards.sql`                           | `member_awards`                                          |
| `packages/database/src/repositories/awards.ts`                  | `PostgresAwardsRepository` — grant, list, heldKeys, mark |
| `apps/companion/src/features/awards/definitions.ts`             | The eleven awards, as pure predicates over counts        |
| `apps/companion/src/features/awards/service.ts`                 | Evaluate, announce, progress, recent                     |
| `apps/companion/src/features/awards/messages.ts`                | Copy                                                     |
| `apps/companion/src/features/awards/commands.ts`                | `milestones`, `achievements`, `admin award`              |
| `apps/companion/src/features/awards/awards.test.ts`             | 25 tests                                                 |
| `packages/database/src/repositories/awards.integration.test.ts` | 19 tests against live PostgreSQL                         |

### Changed

`rewards.ts` (repository) gained `participation()`. `rewards/service.ts` gained
`manualAward()`. `rewards/commands.ts` and `rewards/messages.ts` surface earned
awards in the `/checkin` and `/win` replies. `deps.ts`, `main.ts`, `commands.ts`
and `companion.harness.ts` wire the service through. `fake-repositories.ts`
gained `FakeAwardsRepository` and a fake `participation`.

**Dependencies added: none.**

---

## Migration `0007_awards.sql`

```
member_awards
  PRIMARY KEY (guild_id, user_id, award_key)
  kind        CHECK IN ('milestone','achievement')
  award_key   CHECK ~ '^[a-z][a-z0-9_.]{2,60}$'
  evidence    jsonb, counts only
  earned_at, announced
```

**The primary key is the entire once-only rule.** A check-in and a shared win
seconds apart both trigger an evaluation; without it, both would insert and the
member would get two public announcements for one milestone. `ON CONFLICT DO
NOTHING` means exactly one caller is told `granted`, and only that caller
announces.

`evidence` holds `{"checkIns": 10, "threshold": 10}` — never member-authored
text. It exists so a grant stays explicable after a threshold is retuned:
without it, a milestone awarded at ten check-ins under an old rule is
indistinguishable from a bug once the rule says fifty.

`announced` is a separate flag from the grant because they are different
effects with different failure modes. Discord being unreachable must not stop
an award being earned.

Nothing is stored that could drift. Every count an award is granted on comes
from `participation()`, one CTE over `check_ins` and `point_events` computed on
read.

---

## Commands

| Command                                             | Policy          |
| --------------------------------------------------- | --------------- |
| `/companion milestones`                             | ❋ Bloom Member  |
| `/companion achievements`                           | ❋ Bloom Member  |
| `/companion admin award <member> <points> <reason>` | ◈ Administrator |

Both listings show earned **and** unearned awards with their conditions. A
hidden award is a guessing game, and a guessing game is a thing to optimise.
Both reply ephemerally and both state plainly that awards pay nothing.

`admin award` is Administrator, not Moderator: changing a member's standing in a
shared economy is not a moderation action. Capped at ±500, reason mandatory,
refuses anything that would take a balance below zero, and a negative amount is
recorded as an `adjustment` rather than a `manual_award` so a correction never
reads as a gift. Audited at **warn** severity — it is quiet, unilateral, and it
changes how a member appears to everyone else.

This closes the last "planned, not built" entry in the rewards runbook: a
correction no longer requires hand-written SQL.

---

## Environment and permissions

**No new environment variables.** `CHANNEL_MILESTONES` and
`CHANNEL_ACHIEVEMENTS` already existed and are now read. Both are optional —
unset means the award is granted and the member told, but nothing is posted.

**No new Discord permissions.** Companion's integer is unchanged at
`319975148608`; announcing an award needs View Channel, Send Messages and Embed
Links, which it already had for `#small-wins`.

---

## Tests

**568 passing across 37 files**, up from 524 across 35.

The 19 integration tests exist because two properties cannot be tested any other
way, and both were confirmed by mutation:

- Removing `ON CONFLICT DO NOTHING` in favour of `DO UPDATE` broke the race
  test — three concurrent grants must yield exactly one `granted`.
- Removing `AT TIME ZONE` from the participation CTE broke the pairing test — a
  win at 22:00 UTC must count as the next day's win under `Australia/Sydney`,
  because `point_events` stores an instant and `check_ins` stores a date.

Three existing rewards tests were rewritten during this phase. They asserted on
`messaging.sent.at(-1)`, which silently meant "the shared win" until a first win
started earning a milestone announced immediately after it. They now look the
message up by channel — a better assertion that was previously passing for a
positional reason.

---

## Known limitations

1. **The two economies still do not talk.** Unchanged from Phase 5 and still an
   open product decision: the Discord ladder has nine ranks and the Bloom app
   has twelve plus seasons, six names overlap at different thresholds, and
   nothing maps between them. Awards now add a second overlapping surface —
   this platform's `Ten Days` and the app's `Seven Days Strong` are different
   things with a similar shape. Worth resolving before either is announced to
   members.
2. **No backfill.** A server that has been running Phase 5 for a month grants
   its milestones on each member's next action, not on deploy. This is
   deliberate — a deploy that announced two hundred milestones at once would be
   the spam the brief forbids — but it means the announcements lag reality by
   one interaction.
3. **`achievement.returned` can only be earned once.** Someone who leaves and
   returns repeatedly is recognised for the first return only. Granting it again
   would reward leaving.
4. **Still never connected to Discord.** `discord.com` is unreachable from this
   environment, so the announcement path is covered by a fake messaging adapter
   and has not round-tripped a live API response. Unchanged since Phase 0 and
   stated in every report since.
5. **No award revocation.** Nothing deletes from `member_awards`, and there is
   no command to undo a grant. A grant made on bad data would need a SQL delete
   and a note. Acceptable while every award derives from counts the database
   owns.

---

## Next step

**Phase 7 — Bloom Labs.** The third bot has no commands and currently refuses to
start. It needs the cohort model, `/feedback`, `/labs bug report`, voting and
feature status — the same layering, and the first use of modals and select menus
outside Guardian's report flow.

Before that, one question is worth answering: **do the Discord ranks and the
Bloom app ranks become one ladder?** It has been open since Phase 5 and every
phase since has widened the surface that depends on the answer.
