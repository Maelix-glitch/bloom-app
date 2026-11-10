# Migration dependency analysis — forward references and the smallest safe correction

Status: **approved and applied on 6 November 2026.** The renames in §4 option A are
in place with byte-identical file contents; §8 records the post-fix verification.
Scope: `supabase/migrations/` (25 files: 19 application, 6 Vitalis). P2.2 lifecycle
logic is not touched by anything proposed here.

## 1. Why this exists

A `supabase db push` against a genuinely empty Supabase project fails before any
Vitalis migration runs:

```
Applying migration 20260826_reward_delivery.sql...
Applying migration 20260828_profile_identity_stories.sql...
ERROR: relation "public.profiles" does not exist (SQLSTATE 42P01)
```

A disposable-project run on 6 November 2026 recorded one version and three tables
before stopping (`docs/vitalis-p2.2-hosted-verification-evidence.md` §1.1). The
repository cannot currently provision a new environment, so the acceptance
criterion "a full `db push` from empty matches the local result" is unmet for
reasons that predate P2.2.

## 2. Method

A static analyzer read all 25 files in filename order, extracted every object each
file creates (`table`, `function`, `type`, `view`, `sequence`, `role`, `schema`)
and every object each file references (`alter table`, `references`, `from`/`join`/
`into`/`update`, `on … for select|insert|…`, `create trigger … on`, `create index
… on`), stripped line comments, and reported each reference whose _first creator_
sorts later than the referrer.

Limitations, stated so the result is not over-trusted:

- only names created somewhere in this corpus are considered; `auth.*`,
  `storage.*` and `pg_catalog` are out of scope and always exist on Supabase;
- dynamic SQL (`execute format(...)`) is invisible to it;
- it treats `drop … if exists` as no requirement (correct: those are guarded);
- it ignores cross-file ordering _within_ a single file, which was checked by
  reading the files.

Ordering model that matters: the CLI applies migrations in **filename order**.
That was observed directly — the hosted push applied
`20260907_cycle_periods` → `20260907120000_habit_pause` → `20260908_mood_context`,
which is lexicographic, not numeric-token order.

## 3. Result: four forward references, six objects

Every other file in the folder — including all six Vitalis migrations — has **zero**
forward references. The Vitalis set is clean; it is blocked only transitively by the
application ordering.

| #   | Referrer                                     | Needs                                                            | Created by                          | Impact                                                                                                                      |
| --- | -------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | `20260828_profile_identity_stories.sql`      | `profiles`                                                       | `20260825_core_tables.sql`          | **Fatal, observed.** `42P01` at the first `alter table public.profiles`; push stops, one version and three tables recorded. |
| 2   | `20260906_today_home.sql`                    | `profiles`                                                       | `20260825_core_tables.sql`          | **Fatal, latent.** Same `42P01` at its first `alter table public.profiles`.                                                 |
| 3   | `20260908_mood_context.sql`                  | `mood_entries`                                                   | `20260825_core_tables.sql`          | **Fatal, latent.** `42P01` on `mood_entries`.                                                                               |
| 4   | `20260910160000_story_interaction_names.sql` | `story_views`, `story_reactions`, `story_replies`, `story_gifts` | `20260910150000_story_platform.sql` | **Fatal, latent.** Its four guarded `add column if not exists` statements run before the tables exist.                      |

Why the failure is expensive rather than merely annoying: a failed push leaves the
versions it already applied recorded. The next push resumes after them, so the
pre-migration files look "done" while the tables they needed are still missing.
That is a plausible origin of the hand-ordering described in
`20260825_core_tables.sql`'s own header.

The file already knows. Its header says:

> `profiles`, `mood_entries`, `coach_messages` and `coach_memory` only ever existed
> in the legacy setup guide … the 20260828 migration's `alter table public.profiles`
> failed outright. … Run once in the Supabase SQL editor — **FIRST on a fresh
> project (before 20260826_reward_delivery.sql)**.

The knowledge exists; only the filename disagrees with it.

## 4. Correction options

### A — move the two creators/referrers into dependency order (recommended)

Two renames, **zero content changes**:

| Before                                       | After                                        | Why                                                                                                                           |
| -------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `20260825_core_tables.sql`                   | `20260825_core_tables.sql`                   | Its own header says it must run first on a fresh project. Sorts before `20260826`, fixing edges 1–3 at once.                  |
| `20260910160000_story_interaction_names.sql` | `20260910160000_story_interaction_names.sql` | Sorts after `20260910150000_story_platform.sql` (its four tables) and still before `20260914_story_canvas.sql`. Fixes edge 4. |

Checked before proposing:

- `20260825` is free; no file uses that date.
- Nothing between `20260825` and `20260828` needs any object that `core_tables`
  creates to be _absent_; `20260826` references none of them (analyzer: no edge).
- `core_tables` uses `gen_random_uuid()` (three times). That is built in from
  PostgreSQL 13, and Supabase runs 15+. If a pre-13 target ever matters, the
  smallest addition is one line, `create extension if not exists pgcrypto;`, at the
  top of the file — to be decided at review, not now.
- `20260910160000` sorts between `20260910150000` and `20260914` because the ninth
  character decides (`0` < `4`). Adjacent alternative: `20260910150001`.
- Both renamed files are fully idempotent: `core_tables` has 26 `if not exists`
  guards, and the story file is four `add column if not exists` statements. Re-running
  them is safe, which matters for §5.

### B — move the four referrers later

Four renames instead of two, same effect. Strictly more churn; rejected.

### C — a bootstrap migration that duplicates the core DDL

A new `20260825_…` file that copies the `create table` statements out of
`core_tables`. It works on a fresh project, but creates two sources of truth for
the same schema; drift is silent and immediate. Would need a generator plus a
`--check` test (as the seed does) to be safe. Rejected for now: more machinery than
two renames, and it still leaves the duplicate authoring problem.

### D — make the referrers tolerate a missing table

Wrap each `alter table` in `to_regclass(...) is not null`. The migration then
"succeeds" while silently not adding `display_name`, `profile_name` and the rest —
a schema that looks migrated and is not. Rejected: it converts a loud failure into
silent drift.

### E — keep filenames, apply a dependency-ordered bootstrap by hand

What the last two runs actually did (fixpoint script). It works today but keeps the
standard toolchain unable to provision an environment, so CI, preview branches and
disaster recovery all depend on a human running the right script. Rejected as the
permanent answer; the script remains useful as a fallback.

## 5. History consequences of option A (please review)

Two renamed files mean two **new version numbers**. On any project that recorded
the old versions:

- the old rows remain in `supabase_migrations.schema_migrations`;
- the new versions are pending and sort _before_ already-applied versions, so
  `db push` will refuse them without `--include-all`;
- `--include-all` then re-applies two idempotent files. That is a genuine apply,
  not an artificial history entry, and it is the same thing that already happened
  successfully in the hosted run, where 19 app files were re-applied over an
  existing schema and all succeeded.

Read-only pre-check for the reviewer, on the target project (no writes):

```sql
select version, name
  from supabase_migrations.schema_migrations
 order by version;
```

Record whether `20260909` and `20260910120000` appear at all. If the project was
built through the SQL editor, history may be empty or partial — in that case the
fix is exactly what is needed, because there is no recorded order to contradict.

Explicitly **out of scope** for this correction:

- rewriting or fabricating migration history (`migration repair` on 8-digit
  versions is not even available — it rejects them as `invalid version number`);
- normalising every prefix to 14 digits. It is a real hygiene issue (the tooling
  expects 14 digits; ordering currently works only because lexicographic order
  happens to equal chronological order here), but it renames up to 14 files and
  must be its own reviewed change;
- touching P2.2 lifecycle SQL, seeds, or the production project.

## 6. Verification plan (execute only after approval)

1. On a **disposable** project: `db push` from empty → all 25 versions apply, no
   `42P01`, `max(version) = 20261112`.
2. Object counts, Vitalls-only: 13 tables / 11 triggers / 37 policies; then the six
   migrations' own static tests (`lifecycle-migration.test.ts`) stay green.
3. Seed via the importer route → `6 / 4 / 3 / 2 / 2 / 4 / 3`.
4. `npm run test` — the 107-file, 1181-test baseline must stay green. The harness
   lists only the six Vitalis files, so renaming application migrations cannot
   affect it; that is a claim to confirm by running it, not to assume.
5. `npx tsc --noEmit`, ESLint, Prettier, `npm run build`.
6. Update the now-stale filename references: this analysis, the hosted checklist
   and evidence docs, the header comment in `scripts/vitalis-hosted-verify-baseline.mjs`,
   and the explanatory comments in `src/lib/profile/profileService.ts` and its test
   (comments only — no behaviour change).
7. Re-run the U6 role-rollback probe; it is independent, and re-confirming it costs
   one disposable project.

## 7. Residual risks

- The production project's migration history is unknown and this analysis does not
  inspect it. Any rename must be gated on the read-only pre-check in §5.
- Mixed 8-digit and 14-digit prefixes mean correctness currently depends on the
  CLI sorting filenames. If Supabase ever compares numeric tokens, the effective
  order changes completely. Worth its own change; not this one.
- The analyzer cannot see dynamic SQL. A spot check found none in the affected
  files, but it is a boundary of the method, not a guarantee.

## 8. Post-fix verification

The two creators were renamed on 6 November 2026 (`20260825_core_tables.sql`,
`20260910160000_story_interaction_names.sql`), contents byte-identical (SHA-256
`bbc8c761a76a10ff…` and `85f99d16760f3b91…` before and after), every reference updated.

Verified on disposable Supabase projects, all deleted afterwards; `bloom-app` was not
touched.

| Check                                        | Result                                                        |
| -------------------------------------------- | ------------------------------------------------------------- |
| `db push` from a genuinely empty project     | exit 0, 25 migrations, latest `20261112`, no `42P01`          |
| schema after push                            | 13 Vitalis tables, 11 triggers, 37 policies                   |
| both renamed files re-applied with `psql -f` | exit 0, zero `ERROR` lines, 45 tables / 25 versions unchanged |
| forward references in the static analysis    | 0 remain                                                      |

Runtime order is now `20260825_core_tables` < `20260826_reward_delivery` <
`20260828_profile_identity_stories`, so the dependency matches the filenames and no
deferral or baseline is needed. The fixpoint baseline in
`scripts/vitalis-hosted-verify-baseline.mjs` is kept only as a fallback for projects
whose recorded history predates the rename.

Production history is still unknown to this analysis; the read-only pre-check in §5
remains the gate before applying the rename there.
