# Bloom capability matrix

The long-term capability map required by §36 of the expansion specification, and
the honest answer to "what does this platform actually do today".

Every row is classified against what is **in the repository right now**, not
against what was planned, described in a phase report, or implied by a table
elsewhere in these docs. Where those disagree, this document is correct and the
other one gets fixed.

## Status vocabulary

| Mark | Meaning                                                                  |
| ---- | ------------------------------------------------------------------------ |
| ✅   | **Built.** Shipped, tested, and running in the code you can read today   |
| 🟡   | **Partial.** A working subset exists; named gaps remain                  |
| 📐   | **Designed.** A design note exists; no implementation                    |
| 📋   | **Proposed.** On the map, no design note yet — needs one before any code |
| ⛔   | **Blocked.** Cannot start until a named dependency resolves              |
| 🚫   | **Not planned.** A decision was made against it; the reason is recorded  |

A capability is only ✅ if it would survive someone reading the source. "The
table exists" is not built. "The repository method exists" is not built — that
mistake has already been made twice here, and both times the capability was
dormant for weeks while the docs claimed otherwise.

---

## The matrix

| #   | Capability             | Owner     | Status | Where it stands                                                                       |
| --- | ---------------------- | --------- | :----: | ------------------------------------------------------------------------------------- |
| A   | **Moderation**         | Guardian  |   ✅   | warn, timeout, untimeout, kick, ban, unban, purge, slowmode, lock, unlock, notes      |
| B   | **Cases**              | Guardian  |   ✅   | Five-state lifecycle, case numbers, events, assignment, history                       |
| C   | **Reports**            | Guardian  |   ✅   | `/report` modal, private intake, case linkage                                         |
| D   | **Auto-moderation**    | Guardian  |   📐   | **Not built.** Design note 001 exists. Was falsely marked "owns" — see below          |
| E   | **Raid / join gating** | Guardian  |   📋   | Nothing. Account-age and join-velocity rules are unwritten                            |
| F   | **Appeals**            | Guardian  |   📋   | Nothing. Depends on tickets (H)                                                       |
| G   | **Verification**       | Guardian  |   🟡   | `/verify` + role transition + history + attempt records. **No button/modal flow**     |
| H   | **Tickets / support**  | Guardian  |   📋   | Nothing. The highest-value unbuilt subsystem                                          |
| I   | **Roles (lifecycle)**  | Guardian  |   ✅   | `@everyone → Early Bloom → Bloom Member`, hierarchy-checked, Guardian-only            |
| J   | **Roles (self-serve)** | Guardian  |   📋   | No menus. Allow-list model specified, unimplemented                                   |
| K   | **Audit logging**      | Shared    |   ✅   | Append-only, correlation ids, fingerprinted report content                            |
| L   | **Observability**      | Shared    |   ✅   | Structured JSON, six severities, correlation ids throughout                           |
| M   | **Health**             | Shared    |   ✅   | Real checks, `/health` + `/ready`, per-process heartbeat, cross-bot peers             |
| N   | **Analytics**          | Shared    |   🟡   | `command_usage` + `errorStats` exist. No aggregation, no dashboard, no reporting      |
| O   | **Scheduling**         | Shared    |   ✅   | Locked scheduler, leases, per-guild switches, two live jobs                           |
| P   | **Community prompts**  | Companion |   🟡   | Daily check-in prompt only. Weekly/inactivity/celebration prompts unbuilt             |
| Q   | **Check-ins / wins**   | Companion |   ✅   | `/checkin`, `/win`, daily limits, cooldowns, idempotency                              |
| R   | **Rewards & ranks**    | Companion |   ✅   | Append-only ledger, nine ranks, `/profile`, `/rank`, `/leaderboard`                   |
| S   | **Achievements**       | Companion |   🟡   | 11 awards, data-driven, none grants points. **Not a general framework**               |
| T   | **Milestones**         | Companion |   ✅   | `/milestones`, recognition without payment                                            |
| U   | **Profiles**           | Companion |   🟡   | `/profile` exists. No interests, badges, or staff-vs-public split                     |
| V   | **Challenges**         | Companion |   📋   | Nothing. Framework specified in §12, unbuilt                                          |
| W   | **Events / RSVP**      | Companion |   📋   | Nothing                                                                               |
| X   | **Reminders**          | Companion |   📋   | Nothing beyond the scheduler that would power them                                    |
| Y   | **Reputation**         | Companion |   🚫   | Not planned as a separate system — rewards already is it. See below                   |
| Z   | **Bug tracking**       | Labs      |   🟡   | Intake, numbering, `/queue`, `/triage`. **Three states, not the seven in §15**        |
| AA  | **Feedback**           | Labs      |   ✅   | `/feedback` with categories, daily limits, storage                                    |
| AB  | **Voting / polls**     | Labs      |   📋   | Nothing. Needs the feature registry (AC) to vote on                                   |
| AC  | **Feature management** | Labs      |   📋   | Nothing. The spine §16 describes; several other rows depend on it                     |
| AD  | **Release notes**      | Labs      |   📋   | Nothing. Review step is a hard requirement                                            |
| AE  | **Beta cohorts**       | Labs      |   ⛔   | Blocked: needs a staff decision on how channel access is granted                      |
| AF  | **Experiments**        | Labs      |   🚫   | **Dropped** (D2), not deferred                                                        |
| AG  | **Feature flags**      | Shared    |   🟡   | `bot_settings` powers job switches. No per-role/channel/percentage targeting          |
| AH  | **Admin dashboard**    | —         |   📋   | Nothing. Largest single item in the spec; needs its own decision                      |
| AI  | **GitHub integration** | Labs      | 🚫→📋  | Interface-only was the Phase 0 rule. No adapter. Optional, never a dependency         |
| AJ  | **AI**                 | —         |   📋   | Nothing, deliberately. Separate service, never a core dependency                      |
| AK  | **Voice**              | —         |   🚫   | Not planned. No voice permissions requested                                           |
| AL  | **Localization / TZ**  | Shared    |   🟡   | All timestamps UTC, per-guild timezone in scheduling. No user-level timezone, no i18n |
| AM  | **Data retention**     | Shared    |   ✅   | Nightly allowlist prune, erasure CLI, documented windows                              |
| AN  | **Backups**            | —         |   ⛔   | **Human task.** Supabase PITR must be enabled and a restore rehearsed                 |
| AO  | **Rate-limit safety**  | Shared    |   🟡   | discord.js handles REST limits; no Bloom-side bounded backoff or send queue           |
| AP  | **Bot independence**   | Shared    |   ✅   | Three processes, three tokens, shared packages are compile-time only                  |

---

## Live validation status

Separate from the build status above, because a passing test suite is not
evidence of a live integration and the two must not be conflated.

| Surface                                     | Validated                                     |
| ------------------------------------------- | --------------------------------------------- |
| Config, database, migrations                | ✅ Real PostgreSQL, 8 migrations, idempotent  |
| Process startup, feature registration       | ✅ All three, independently                   |
| Structured logging and secret redaction     | ✅ Real processes, raw token absent from logs |
| Health reporting and cross-bot heartbeat    | ✅ Live HTTP capture, three heartbeat rows    |
| Bot independence                            | ✅ Broken Guardian, other two unaffected      |
| Production dependency tree (`prune --prod`) | ✅ All three start; migrate CLI runs          |
| **Container image**                         | ❌ Rehearsed only — no runtime available      |
| **Gateway connection**                      | ❌ `discord.com` unreachable here             |
| **Command registration**                    | ❌ Needs a live token                         |
| **A real interaction and its mutation**     | ❌ Needs a live token                         |

Details and reproduction: [staging validation](../operations/staging-validation.md).
The blocked rows have a runbook: [staging runbook](../operations/staging-runbook.md).

## The rows that need explaining

### D — Auto-moderation was marked "owns" and does not exist

`bot-responsibilities.md` carried a row reading `Anti-spam | ✅ owns | ❌ | ❌`,
and `main.ts` says Guardian handles "anti-spam" in its header comment. There is
no implementation. No message intent is requested, no message event is handled,
and the string "spam" appears nowhere in a code path. That table meant "this
would be Guardian's if it existed", which is not what a ✅ communicates. It has
been corrected to separate ownership from existence.

The design note (001) lands on an approach worth stating here because it changes
the permission conversation: **Discord's native AutoMod does the detection**,
server-side, and Guardian reacts to the result. Discord supports `SPAM`,
`MENTION_SPAM`, `KEYWORD` with Rust-flavoured regex, `KEYWORD_PRESET` and
`MEMBER_PROFILE` triggers natively, and emits `AUTO_MODERATION_ACTION_EXECUTION`
when one fires.

That means Bloom needs **no Message Content intent** to have working spam,
mention-spam and link filtering. The event carries `user_id`, `rule_trigger_type`,
`channel_id` and `matched_keyword` without it; only `content` and
`matched_content` are gated behind the privileged intent, and Bloom does not
need either. Bloom's value is the layer Discord does not provide: escalation,
case creation, appeals, thresholds, audit.

The cost is one new permission. `AUTO_MODERATION_ACTION_EXECUTION` is only
delivered to apps holding **Manage Guild**, which Guardian does not currently
have — its permission integer has bit 5 clear. That is a real least-privilege
decision, not a formality, and it belongs in the design note rather than in a
quiet permission bump.

### D (continued) — the permission question is now written up

[Design note 002](./design-notes/002-manage-guild-permission.md) answers the
four questions asked of it: Manage Guild is required because Discord delivers
AutoMod events only to apps that hold it; it additionally grants server
settings, invite and integration control; AutoMod rules **can** be authored by
hand, which removes half the requirement but not the event half; and the
minimum practical model is to hold the bit for event delivery only and never
call the rule API. Awaiting a decision — no code until then.

### G — Verification works but has no button

`/verify` performs the real transition with hierarchy checks, attempt records and
history. What §5 asks for — a button on a rules post, a modal, an onboarding
checklist — does not exist. The gap is the **entry surface**, not the engine, so
this is the cheapest high-visibility improvement on the list.

### S — Achievements are a list, not a framework

Eleven awards, data-driven, none paying points. §11 asks for rarity, hidden
achievements, progress tracking and repeatability. None of those columns exist.
Calling the current state a "framework" would be the same error as D.

### Y — Reputation is deliberately not a second system

§10 asks for a contribution model that resists farming. Bloom Rewards already
_is_ that model: fixed award sizes, daily caps, cooldowns, idempotency, and no
points for message volume. A parallel reputation score would be a second
currency competing with the first, and would reintroduce exactly the farming
incentive §10 warns against. Recorded as a decision rather than left as a gap.

### AE — Beta cohorts: options written, awaiting approval

[Design note 003](./design-notes/003-beta-cohorts.md) compares Guardian-owned
role assignment (A), channel overwrites (B) and three explicit alternatives (C).
Recommendation: start with cohorts as a tracked list with no access control,
because nobody yet knows whether a private beta _space_ is needed or whether a
list of testers is enough — and Option A remains available later against the
same schema. Option B is recommended for outright rejection: it would give Labs
Manage Channels, trading an architectural guarantee for convenience.

### AE (background) — why it was blocked

The schema could carry cohorts tomorrow. What is missing is a staff answer to:
when someone joins a cohort, how do they get access? If the answer is "a role",
only Guardian may grant it, and Labs must ask — which is a cross-bot request
path that does not exist yet. If the answer is "a private channel with member
overwrites", Labs needs Manage Channels, which is a permission increase for the
lowest-trust bot. **This is the ambiguity §40 says to document instead of
guessing**, and it is why cohorts have not been quietly built.

### AG — Feature flags have a foundation nobody has noticed

`bot_settings` is already per-guild, per-bot, keyed, JSON-valued, and read at
runtime by the job gate. That is most of a flag framework. What §20 adds is
targeting — per-role, per-channel, `BETA_TESTERS_ONLY`, percentage — and,
usefully, `channel_settings` and `role_settings` already exist as empty tables
with no reader. The expansion does not need new storage so much as an evaluator
and a resolution order.

### AN — Backups are still not real

Nothing has changed here and it should not be buried. There is no evidence any
backup is configured, and none can be produced from this environment. Until
somebody enables PITR on the Supabase project **and restores from it once**,
this platform has no recovery story, only a recovery document.

---

## What this platform is genuinely good at today

Worth stating plainly, because the unbuilt column is long and the built column is
load-bearing:

- **Three bots that cannot violate each other's boundaries.** Not by convention
  — Companion and Labs do not hold Manage Roles, do not request the members
  intent, and the role service does not exist in their dependency graph.
- **Every state change is audited**, with a correlation id that threads a single
  interaction through every log line it produces.
- **Nothing pays out twice.** Idempotency keys, database-level cooldowns, and
  effects claimed before they are performed.
- **Real health.** Checks that do work, `unknown` when a check cannot run, worst
  component wins, and peers reported as observations with an age.
- **712 tests**, including integration tests against real PostgreSQL, and
  mutation testing on the claims that only a database can enforce.

The foundation is the expensive part, and it is finished. What remains is mostly
_features on top of it_ — which is the good direction for this kind of debt.

---

## Deliberate non-goals

| Not building              | Why                                                               |
| ------------------------- | ----------------------------------------------------------------- |
| Message-prefix commands   | Interaction-only. No parsing, no Message Content intent           |
| Voice features            | No permission requested; no Bloom use case identified             |
| Live AI chat              | Budget, and the brief. Any AI arrives as a separate service       |
| Third-party bots          | Dyno/Carl-bot/MEE6 as dependencies. Bloom owns its core workflows |
| Generic XP                | Farming incentive; rewards already solves this properly           |
| Experiments command       | An announcement with extra steps (D2)                             |
| Public moderation history | Privacy. Staff surfaces and member surfaces expose different data |
