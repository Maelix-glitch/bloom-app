# Design note 003 — Beta cohort access

**Status:** awaiting approval. Nothing implemented, deliberately.
**Question:** when a member joins a beta cohort, how do they actually get access?

The cohort data model is easy and has never been the blocker. The blocker is a
boundary question: Labs owns beta testing, Guardian owns every role, and cohort
access is the one place those two facts collide. Guessing here would either
break the three-bot boundary or quietly expand the lowest-trust bot's
permissions, so this note lays out the options and stops.

---

## What is agreed regardless of the option

- A cohort is a database fact: `cohorts` and `cohort_members`, owned by Labs.
- **`◌ Beta Tester` implies no staff power.** It is testing access, nothing else.
- Labs never writes roles. That rule does not bend for this feature.
- Joining and leaving are auditable, and leaving revokes access.

---

## Option A — Guardian-owned role assignment, requested by Labs

Labs records the membership and asks Guardian to grant `◌ Beta Tester`.
Guardian applies its usual hierarchy checks and audits the change.

The interesting part is _how_ Labs asks. Three mechanisms, in increasing order
of honesty:

1. **Labs calls a Guardian HTTP endpoint.** Introduces runtime coupling between
   two processes that are supposed to fail independently — if Guardian is down,
   joining a cohort fails. Rejected on those grounds.
2. **A database queue table Guardian polls.** No runtime coupling: Labs writes a
   row, Guardian acts when it can, and a Guardian outage delays the grant
   instead of failing it. Needs a job, and a member may wait up to one poll
   interval.
3. **Guardian reconciles from cohort state directly.** No queue at all —
   Guardian periodically compares `cohort_members` to who holds the role and
   fixes the difference. Self-healing after any outage, and it repairs manual
   drift too. Slowest to take effect.

**Pros:** boundaries intact; one bot still owns every role; works with Discord's
own permission model, so channel access is ordinary role permissions.
**Cons:** cross-bot latency; a new queue or reconciliation job; the member
experience is "you will have access shortly" rather than immediately.

**Recommended sub-option: 3**, with 2 as an accelerator if the delay annoys
people. Reconciliation is the only one that is correct after a crash.

---

## Option B — Channel-based access

No role. Labs adds a per-member permission overwrite on the beta channels.

**Pros:** no role, no cross-bot request, immediate.
**Cons:** **Labs would need Manage Channels** — a permission increase for the
lowest-trust bot, and one that lets it alter any channel's permissions, not just
beta ones. Discord also caps overwrites per channel, so a large cohort hits a
ceiling a role would not. Access becomes invisible: a member's roles no longer
say what they can see, which makes an audit harder. And every new beta channel
must be wired up individually.

**Assessment:** the permission cost is the problem. Labs holding Manage Channels
undermines the reason there are three bots.

---

## Option C — Explicit alternatives

**C1 — Discord's own Onboarding / self-assignable roles.** Members pick the beta
role themselves from Discord's native onboarding. No bot involvement at all, so
no permission changes anywhere. Bloom then _reads_ who holds the role and treats
that as cohort membership. Loses staff control over who joins, and cohort
membership stops being a Bloom-owned fact — cohort size, eligibility and
invite-only cohorts all become impossible.

**C2 — Cohorts without access control.** A cohort is a mailing list: Labs
records membership, pings the cohort in an existing channel, and nobody gets
access to anything they did not already have. Zero permission changes, zero
cross-bot coupling.

This is worth taking seriously. "Beta testing" for a private community may need
a _list of people to notify and collect feedback from_ far more than a private
channel. It is the smallest thing that could work, and it is reversible — if a
private space turns out to be necessary, Option A still applies later.

**C3 — Manual grant, Bloom tracks state.** Labs records the cohort; a staff
member assigns the role by hand; Guardian's existing observed-role cache
reconciles the truth. No new permissions, no new coupling, and it is what
happens today anyway. Does not scale past a handful of testers.

---

## Comparison

| Option                         | New permissions           | Cross-bot coupling | Immediate | Staff control |
| ------------------------------ | ------------------------- | ------------------ | :-------: | :-----------: |
| **A** Guardian grants the role | none                      | queue or reconcile |    no     |      yes      |
| **B** Channel overwrites       | **Labs: Manage Channels** | none               |    yes    |      yes      |
| **C1** Native self-assign      | none                      | none               |    yes    |    **no**     |
| **C2** No access control       | none                      | none               |    yes    |      yes      |
| **C3** Manual grant            | none                      | none               |    no     |      yes      |

---

## Recommendation

**C2 now, A later if needed.**

Start with cohorts as a tracked list with no access control. It needs no new
permissions, no cross-bot machinery, and it answers the question actually worth
answering first — _is a private beta space needed at all, or is a list of
testers enough?_ Nobody knows yet, and building Option A to find out is the
expensive way to learn.

If a private space does turn out to be necessary, Option A sub-option 3
(Guardian reconciles from cohort state) is the correct shape, and C2's schema is
exactly what it reconciles against. Nothing is wasted.

**Option B should be rejected outright**, not deferred. Giving Labs Manage
Channels to save a reconciliation job trades an architectural guarantee for
convenience.

---

## Open questions for approval

1. Is a private beta _channel_ actually wanted, or is a tracked list of testers
   with feedback prompts sufficient?
2. Are cohorts invite-only (staff adds you) or opt-in (you join)? This decides
   whether C1 is even viable.
3. Should leaving a cohort revoke channel access immediately, or at the end of a
   testing round?

Nothing will be implemented until question 1 is answered.
