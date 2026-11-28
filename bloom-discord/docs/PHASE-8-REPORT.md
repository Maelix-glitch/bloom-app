# Phase 8 — Completion: Guardian anti-spam and the Labs pipeline

The phase that builds what the earlier phases deliberately left out.

Two gaps were named in every report since they were deferred: Guardian owned
anti-spam on paper and did not implement it, and Labs was intake only — the
commands reference listed cohorts, voting, feature status and release notes
as specified-but-absent, with the reason for each absence written down. This
phase removes both gaps, in each case by supplying the thing whose absence
was the reason: for anti-spam, a design that never touches message content;
for Labs, the tables that make the commands honest.

It also closes the deferred list. After this phase the commands reference
has no "not built yet" section left — only the two **dropped** items
(`/labs admin experiment start`, `/companion admin schedule`), which stay
dropped.

---

## What was built

### Guardian: auto-moderation (design note 001, implemented)

Guardian reacts to Discord's native Auto Moderation instead of reading
messages. Discord detects and blocks server-side; the
`AUTO_MODERATION_ACTION_EXECUTION` event is what Guardian escalates on.

| Surface                                     | Policy                | What it does                           |
| ------------------------------------------- | --------------------- | -------------------------------------- |
| `AUTO_MODERATION_ACTION_EXECUTION` handler  | —                     | Records, escalates, alerts             |
| `/guardian automod status`                  | Moderator (read tier) | Switch, policies, 24h/7d volume        |
| `/guardian automod threshold`               | Moderator             | Set count / window / timeout per scope |
| `/guardian automod exempt`                  | Moderator             | Exempt a role from escalation          |
| Alert buttons: Confirm / Reverse / Escalate | Moderator             | One-click review on every alert        |

The ladder: offences inside a policy's window count up; at the threshold
the member is timed out, the action is recorded like a moderator's own —
except the actor is null — and a case opens with origin `automation`. The
ceiling is a timeout. Nothing in this feature bans, and if Discord's own
action was already a timeout, Guardian records and cases it without timing
out twice. The feature is off per guild (`automod.enabled`) until staff
turn it on, and with no policy row an execution is recorded and alerted
on, never acted on.

### Labs: the pipeline

| Command                                    | Policy       | What it does                       |
| ------------------------------------------ | ------------ | ---------------------------------- |
| `/labs feature status [name]`              | Bloom Member | The pipeline, with backing counts  |
| `/labs vote <feature>`                     | Bloom Member | Back a feature — again to withdraw |
| `/labs cohort list / join / leave`         | Bloom Member | Self-service cohort membership     |
| `/labs release latest`                     | Bloom Member | The newest published release notes |
| `/labs admin feature-add / feature-status` | Moderator    | Maintain the pipeline              |
| `/labs admin cohort-create`                | Moderator    | Open a cohort, optionally closed   |
| `/labs admin release-publish`              | Moderator    | Publish notes; announces the post  |

Behind them: migrations `0013_automod.sql` and `0014_labs_pipeline.sql`, an
`AutomodRepository`, a pipeline half of the Labs repository, two services,
and the fakes and integration tests that keep both honest.

---

## Four decisions worth defending

### The schema bent, not the audit rule

Design note 001 requires an automated action to be indistinguishable from a
human one except for its actor, which is null. The schema disagreed:
`moderation_actions.actor_id` and `moderation_cases.opened_by` were
`NOT NULL`. Migration 0013 relaxes both rather than inventing a sentinel
"automod user" — a fake member who appears in histories, can be mentioned,
and would eventually be timed out by someone. The precedent was already in
the schema: `case_events.actor_id` and `audit_events.actor_id` are nullable
for exactly this reason. These two columns were the outliers.

### A parallel ladder, counted in events

Automod offences count only automod events, never the human warning ladder.
The alternative — one shared ladder — lets a spam wave at 03:00 push a
member most of the way to a ban before a human has seen a single message.
The two histories are linked through the case, where a moderator reads
both; they are not summed by a counter nobody supervises.

### Backing is rows, not a counter

A vote is a row in `labs_feature_votes`; voting again deletes it. There is
no integer to increment wrongly, no way to back a feature twice, and the
number shown is `count(*)` over facts. The copy calls it _backing_, never
a ballot: it is a signal about what members would use, and the replies say
so, because a member who believes the top feature is promised has been
misled by vocabulary.

### Cohorts grant nothing, structurally

The commands reference deferred cohorts pending "a staff answer on how
channel access is granted". The answer is that Labs does not grant it. The
cohort tables have no role, channel or permission column; joining writes a
membership row and the reply says access is a separate staff grant. This
keeps the platform's oldest rule — only Guardian writes roles — true by
construction rather than by care, and means a Labs bug cannot widen
anyone's access.

---

## The database

Migration `0013_automod.sql`: `automod_events` (with a partial unique index
that makes a redelivered execution a no-op, and **no content column**),
`automod_policies` (threshold triples are all-set-or-all-null by CHECK),
the two actor relaxations above, and retention at 180 days.

Migration `0014_labs_pipeline.sql`: `labs_features` (names unique per guild
case-insensitively), `labs_feature_votes`, `labs_cohorts`,
`labs_cohort_members`, `labs_release_notes`, and the
`labs_feature_status` enum, which an integration test holds identical to
the TypeScript union.

---

## Tests

37 new tests (1,376 → 1,413): 24 for auto-moderation (the ladder, the
window, exemptions, hierarchy refusal, the review buttons' service paths,
a privacy test asserting a polluted payload stores no content), 13 for the
pipeline through the real dispatcher — including one that proves joining a
cohort changes no Discord role. Two opt-in integration suites cover the
SQL a fake cannot prove: the partial-index dedupe, the expression-index
policy scopes, the vote toggle, and both enums' agreement with their
unions.

---

## What was not built

Nothing on the deferred list remains. Two things were considered and left
out on purpose:

| Left out                             | Why                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AutoMod rule management from Discord | Staff create rules in Discord's own UI, where Discord validates them; Guardian consumes the events. Duplicating rule CRUD adds a second, worse editor. |
| Cohort channel automation            | The decision above: access stays a manual staff grant. Automating it would repeal the rule that makes cohorts safe.                                    |

---

## Known limitations

1. **Still never connected to Discord.** Unchanged since Phase 0 and still
   the largest untested surface. The automod payload shape is taken from
   the installed `discord-api-types` (0.38.55); a live event may yet teach
   something the types do not.
2. **Migrations 0013 and 0014 have not been applied to a real PostgreSQL
   in this environment** — no database was reachable from it. Their
   integration suites are written and run under
   `BLOOM_INTEGRATION_TESTS=1` wherever one exists; until they have run,
   the SQL is reviewed, not proven. This is stated here rather than
   smoothed over, because the expression-index `ON CONFLICT` in the
   automod repository is exactly the kind of SQL that deserves a real
   engine's opinion.
3. **The Docker image has still never been built** (no daemon), and CI is
   still not active. Both are verified as far as this environment allows —
   the workflow's commands are the local verify chain — and no further.
   Validation did catch one real defect: `docker-compose.prod.yml` set the
   legacy `pids_limit` alongside a `deploy.resources.limits` block, which
   Compose refuses as a project; the limit now lives in the deploy block
   (`pids: 256`) and both compose files parse.
4. **The two rank economies remain unreconciled** (Phase 5's flag, still a
   product decision).

---

## Verification

```
pnpm run build        # clean
pnpm run typecheck    # clean
pnpm run lint         # clean
pnpm run format:check # clean
pnpm run test         # 1,413 passed / 66 files
```

Integration suites (`automod`, `labs-pipeline`) are excluded by default and
run with `BLOOM_INTEGRATION_TESTS=1` against a migrated database.

---

## Next step

The launch sequence in the production-readiness document, unchanged: a
staging guild, one real gateway connection, command registration, and a
rehearsed backup. Everything on the build list is done; what remains is
meeting reality.
