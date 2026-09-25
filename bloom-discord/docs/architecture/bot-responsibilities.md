# Bot responsibilities

Three applications, one guild, one database, strict boundaries. The boundaries
are not conventions — they are enforced by a capability manifest checked at
construction time and by an event-ownership map checked at registration.

## At a glance

This table assigns **ownership**. Ownership is not existence: a row can be
Guardian's and still be unbuilt. The `Built` column says which is which, and
[the capability matrix](./capability-matrix.md) is the detailed version.

| Area                               |  Guardian   | Companion  |    Labs    |  Built  |
| ---------------------------------- | :---------: | :--------: | :--------: | :-----: |
| Verification & onboarding          |   ✅ owns   |   reads    |   reads    | partial |
| Role assignment                    | ✅ **only** |     ❌     |     ❌     |   yes   |
| Moderation (warn/timeout/kick/ban) | ✅ **only** |     ❌     |     ❌     |   yes   |
| Purge / slowmode / lock            | ✅ **only** |     ❌     |     ❌     |   yes   |
| Reports & cases                    |   ✅ owns   |     ❌     |     ❌     |   yes   |
| Audit logging                      |   ✅ owns   | writes own | writes own |   yes   |
| Anti-spam                          |   ✅ owns   |     ❌     |     ❌     | **no**  |
| Welcome & introductions            |     ❌      |  ✅ owns   |     ❌     | **no**  |
| Daily check-ins, small wins        |     ❌      |  ✅ owns   |     ❌     |   yes   |
| Achievements & milestones          |     ❌      |  ✅ owns   |     ❌     | partial |
| Bloom Rewards points & ranks       |     ❌      |  ✅ owns   |     ❌     |   yes   |
| Challenges & community events      |     ❌      |  ✅ owns   |     ❌     | **no**  |
| Beta cohorts & testing access      |     ❌      |     ❌     |  ✅ owns   | blocked |
| Feature feedback & voting          |     ❌      |     ❌     |  ✅ owns   | partial |
| Bug intake & triage                |     ❌      |     ❌     |  ✅ owns   | partial |
| Release notes, sneak peeks, status |     ❌      |     ❌     |  ✅ owns   | **no**  |
| Experiments                        |     ❌      |     ❌     |  ✅ owns   | dropped |

---

## BLOOM GUARDIAN

**Trust level: highest.** The only bot with elevated Discord permissions.

Owns the member lifecycle from arrival to departure:

- **Verification and onboarding.** `@everyone → ✧ Early Bloom → ❋ Bloom Member`.
- **The role lifecycle.** The only writer of member roles, restricted by
  allow-list to exactly those two.
- **Moderation.** Warn, timeout, kick, ban, purge, slowmode, lock, mod-note.
- **Reports and cases.** `OPEN → IN_REVIEW → ESCALATED → RESOLVED → CLOSED`.
- **Audit logging.** Append-only, with the actor, target, reason and correlation
  id for every state-changing action.
- **Anti-spam.** Guardian's to own — and **not implemented**. No message intent
  is requested and no message event is handled today. The planned approach reacts
  to Discord's native Auto Moderation rather than reading messages, which keeps
  the Message Content intent unnecessary; see
  [design note 001](./design-notes/001-auto-moderation.md).

Intents: `Guilds`, `GuildMembers` (privileged), `GuildModeration`.

### Why only Guardian writes roles

Role assignment is the highest-risk operation the platform performs. Confining
it to one process means one code path to review, one audit trail, one place
where the hierarchy check lives, and one token whose compromise has that blast
radius. The capability manifest turns that from a convention into a
constructor-time failure.

---

## BLOOM COMPANION

**Trust level: standard.** No roles, no moderation.

- Welcome messages and introductions
- Daily check-ins and small wins
- Achievements and milestones
- **Bloom Rewards**: points and the nine ranks, Seedling → Master Bloom
- Challenges and community events

Intents: `Guilds` only. Companion reads onboarding and membership state from the
database — state Guardian writes — rather than from the gateway.

### Ranks are not roles

The nine ranks are database rows rendered in embeds. Nine Discord roles would
clutter the member list, need nine role writes per member, and require Companion
to hold Manage Roles. None of that buys anything the database does not already
provide.

### Points that mean something

The brief is explicit: no XP farming, no reward inflation, no fake stats. Points
are awarded for deliberate, rate-limited actions with durable duplicate
prevention. A member cannot check in twice for the same day, and a restart does
not reset that — the cooldown lives in Postgres, not in memory.

---

## BLOOM LABS

**Trust level: standard.** No roles, no moderation.

- Beta cohorts and testing rounds
- Feature feedback and voting
- Bug intake and triage
- Experiments
- Release notes, sneak peeks, feature status

Intents: `Guilds` only.

### Beta Tester is not a staff role

`◌ Beta Tester` grants access to testing channels and nothing else. It carries
no moderation power and no elevated trust. It is granted manually by staff:
automating it would require a second bot with role-write access, doubling the
blast radius of a token leak for a workflow that happens a few times per cohort.

---

## Shared state, separate processes

All three read and write one Postgres schema (`bloom_discord`), which is what
lets Companion greet someone based on a state transition Guardian performed.

Cross-bot safety comes from three mechanisms:

**Event ownership.** All three receive the same gateway events. `EVENT_OWNERSHIP`
declares which bot may act on each, with a written rationale, and registering a
handler for an event a bot does not own throws at startup. A member joining
produces exactly one welcome, because "just don't write that handler" is not a
control.

**Capability manifests.** Each bot declares what it may do. `assertCapability`
runs in the constructor of anything privileged, so wiring a role service into
Companion fails at boot rather than at the moment it would have changed
someone's roles.

**Durable idempotency.** Anything with a visible side effect claims a key in
Postgres first. Two replicas of the same bot, or a redelivered event after a
gateway resume, produce one action.

---

## The boundary that matters most

> Only Guardian performs role transitions. Companion and Labs read onboarding
> state but never modify it.

Enforced in four places:

1. `BOT_CAPABILITIES` — only Guardian declares `role:write`.
2. `DiscordRoleService` — asserts that capability in its constructor.
3. `isRoleWritePermitted` — allow-lists exactly two role ids.
4. The permission matrix — only Guardian's install URL requests Manage Roles, so
   the other two cannot write roles even if every code-level check were bypassed.

There is deliberately no `setOnboardingState` on the shared identity repository.
It arrives in Phase 1, on Guardian's side of the boundary.
