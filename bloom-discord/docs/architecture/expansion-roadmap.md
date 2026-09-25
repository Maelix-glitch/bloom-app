# Expansion roadmap

How the capability map in [`capability-matrix.md`](./capability-matrix.md) turns
into work, in the priority order §39 sets: security, onboarding, moderation,
support, community reliability, beta/product workflows, progression, advanced
integrations, experimental.

The specification's own instruction governs this document: **do not build ten
systems simultaneously.** Each phase below is a shippable unit that leaves the
platform working, and none of them starts without a design note.

---

## Phase 8 — Auto-moderation

The only unattended-hours capability on the list, and the reason it outranks
everything else: a wellbeing community's worst moments happen when no moderator
is awake.

Design note [001](./design-notes/001-auto-moderation.md) is written. The
approach reacts to Discord's native AutoMod rather than reading messages, which
means **no Message Content intent** — but it does need **Manage Guild** on
Guardian, and that decision should be made deliberately before any code.

Ships: automod event ingestion, escalation ladder, moderator review buttons,
per-channel policy, one-click reversal. Ceiling for automated action is a
timeout; kick and ban stay human.

## Phase 9 — Verification surface

The engine exists; the entry point does not. A member joining today must know to
type `/verify`.

Ships: a rules post with a verification button, the modal where it helps,
onboarding checklist state, re-verification, and failure handling with cooldowns.
No new permissions, no new intents, and most of it reuses the transition service
Guardian already owns.

Small, visible, and the highest ratio of member-experience improvement to risk on
the whole list.

## Phase 10 — Tickets and private cases

The largest genuine gap. Support currently happens in DMs and public channels,
which is exactly where private information leaks.

Needs a design note first, covering: private channel versus thread (a real
decision — threads are cheaper, private channels are more controllable), who may
claim, transcript storage and its retention window, and how a safety-related
ticket escalates into the moderation case system Guardian already has rather
than duplicating it.

Appeals (row F) fall out of this for free, which is why they are not their own
phase.

## Phase 11 — Feature flags, properly

`bot_settings` already does per-guild, per-bot, keyed, JSON-valued runtime
config, and `channel_settings` / `role_settings` exist unused. This phase adds
the evaluator: `OFF | ON | BETA | STAFF_ONLY | BETA_TESTERS_ONLY`, a documented
resolution order, and per-role and per-channel targeting.

Placed here deliberately — it is infrastructure that every later phase uses to
ship safely, and it is cheap because the storage already exists.

## Phase 12 — Feature registry and voting

`features` as a first-class table with a stable id and the lifecycle from §16.
Once it exists, voting has something to vote on, feedback and bugs can reference
a feature, and release notes have a source.

Several rows in the matrix are blocked on this one, which is why it comes before
them rather than after.

## Phase 13 — Bug workflow expansion

Today: three states. §15 wants seven, plus severity, priority, component,
version, platform, assignee and duplicate detection.

Straightforward once the feature registry exists to link against. Duplicate
detection should start as "staff marks a duplicate" — the existing
`--duplicate-of` already does this — before anything automatic is attempted.

## Phase 14 — Community automation

Weekly prompts, celebration messages, inactivity nudges, event reminders.

The scheduler, the per-guild switches, the cooldowns and the duplicate
prevention all exist and are tested — this phase is mostly content and channel
configuration on top of proven machinery. Every automation inherits the existing
enable/disable, channel selection, timezone and audit requirements.

The standing constraint applies hardest here: **the bot stays quiet by default.**
Adding six new scheduled messages is the easiest way to make this platform worse.

## Phase 15 — Achievements as a framework

Rarity, hidden achievements, progress tracking, repeatability, categories. Ranks
stay decoupled from it (D1) and achievements continue not to pay points.

## Phase 16 — Events and challenges

RSVP, attendance, recurring events; the challenge framework from §12. Both are
Companion's, both need design notes, and challenges may reference rewards but
must not become a second way to earn rank.

## Later, with a decision attached

| Item                | What has to be decided first                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Beta cohorts**    | How cohort access is granted — a role (Guardian must grant it) or a channel (Labs would need Manage Channels) |
| **Admin dashboard** | Discord commands or a web app. A web app is a second deployable, an auth story, and a much larger surface     |
| **GitHub**          | Optional adapter behind the existing interface. Never a dependency                                            |
| **AI**              | Separate service, provider-agnostic. Never silently performs moderation                                       |
| **Analytics**       | Aggregation over `command_usage`, purpose-limited. Not behaviour histories                                    |
| **Localization**    | Per-user timezones before any translation work                                                                |

---

## Standing rules for every phase

Carried forward from the original brief and reaffirmed by this expansion:

1. **One owning bot per feature.** No capability implemented twice.
2. **A design note before any substantial subsystem** — [template](./design-notes/000-template.md).
3. **Least privilege.** A new permission is an argument in a design note, not a
   line in a config.
4. **Nothing is ✅ until it exists in code.** The `Anti-spam | ✅ owns` row is
   the cautionary example.
5. **Quiet by default.** Every automation ships disabled.
6. **Reversible automation.** No irreversible automated punishment, ever.
7. **Least data.** Wellbeing-adjacent information is sensitive; do not collect
   what a feature does not need.
8. **Independently deployable.** Labs failing must not affect Guardian.
