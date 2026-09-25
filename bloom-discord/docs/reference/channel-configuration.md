# Channel configuration

## The rule

**Channels are resolved by id, never by name.** A channel renamed from
`#general` to `#the-garden` keeps working. Matching on names would also let
anyone with Manage Channels redirect a bot's output by renaming something.

Channel ids are optional individually. A feature whose channel is unset refuses
to run and says which variable to set, rather than guessing a destination.

## Structure

The category names are Discord's; only the channel ids matter to the platform.

### ✦ WELCOME

| Channel            | Variable                  | Posts here | Purpose                                                                      |
| ------------------ | ------------------------- | ---------- | ---------------------------------------------------------------------------- |
| `#welcome`         | `CHANNEL_WELCOME`         | Guardian   | Verification prompt. Read-only to members; the only interaction is a button. |
| `#rules`           | `CHANNEL_RULES`           | Guardian   | Read-only. Referenced by onboarding.                                         |
| `#getting-started` | `CHANNEL_GETTING_STARTED` | Guardian   | Read-only orientation.                                                       |

### 📢 BLOOM UPDATES

| Channel                | Variable                      | Posts here |
| ---------------------- | ----------------------------- | ---------- |
| `#announcements`       | `CHANNEL_ANNOUNCEMENTS`       | Labs       |
| `#release-notes`       | `CHANNEL_RELEASE_NOTES`       | Labs       |
| `#development-updates` | `CHANNEL_DEVELOPMENT_UPDATES` | Labs       |

### 🌿 THE GARDEN

| Channel           | Variable                 | Posts here |
| ----------------- | ------------------------ | ---------- |
| `#introductions`  | `CHANNEL_INTRODUCTIONS`  | Companion  |
| `#daily-check-in` | `CHANNEL_DAILY_CHECK_IN` | Companion  |
| `#small-wins`     | `CHANNEL_SMALL_WINS`     | Companion  |

### 🏆 PROGRESS

| Channel          | Variable                | Posts here |
| ---------------- | ----------------------- | ---------- |
| `#achievements`  | `CHANNEL_ACHIEVEMENTS`  | Companion  |
| `#milestones`    | `CHANNEL_MILESTONES`    | Companion  |
| `#bloom-rewards` | `CHANNEL_BLOOM_REWARDS` | Companion  |
| `#challenges`    | `CHANNEL_CHALLENGES`    | Companion  |

Companion announces an earned award in `#milestones` or `#achievements`
according to its kind. Both are optional: leaving one unset means awards of
that kind are still granted and the member is still told in their own reply,
but nothing is posted to the server. Neither channel needs to be writable by
members — everything Companion posts there is a short announcement, and a
channel members can post in becomes a place to ask why they have not got one
yet.

### 🛠️ BLOOM LAB

| Channel            | Variable                  | Posts here | Access        |
| ------------------ | ------------------------- | ---------- | ------------- |
| `#beta-testing`    | `CHANNEL_BETA_TESTING`    | Labs       | ◌ Beta Tester |
| `#feature-testing` | `CHANNEL_FEATURE_TESTING` | Labs       | ◌ Beta Tester |

### 💡 IDEAS & FEEDBACK

| Channel             | Variable                   | Posts here |
| ------------------- | -------------------------- | ---------- |
| `#feedback`         | `CHANNEL_FEEDBACK`         | Labs       |
| `#feature-requests` | `CHANNEL_FEATURE_REQUESTS` | Labs       |
| `#voting`           | `CHANNEL_VOTING`           | Labs       |
| `#feature-status`   | `CHANNEL_FEATURE_STATUS`   | Labs       |

### 🐛 BUGS & SUPPORT

| Channel        | Variable              | Posts here |
| -------------- | --------------------- | ---------- |
| `#bug-reports` | `CHANNEL_BUG_REPORTS` | Labs       |
| `#support`     | `CHANNEL_SUPPORT`     | Labs       |

### 🔒 BLOOM TEAM — private

| Channel       | Variable             | Posts here | Access |
| ------------- | -------------------- | ---------- | ------ |
| `#moderation` | `CHANNEL_MODERATION` | Guardian   | Staff  |
| `#reports`    | `CHANNEL_REPORTS`    | Guardian   | Staff  |
| `#internal`   | `CHANNEL_INTERNAL`   | all        | Staff  |

Private channels need the relevant bot's role added to their permission
overwrites explicitly. Server-wide View Channel does not override a channel-level
deny — this is the most common cause of "it works everywhere except one channel".

### AI channels

`#ai-coach`, `#ai-feedback`, `#ai-lab` are **not** bot-integrated. There is no
live AI chat by design: `#ai-coach` is a curated showcase, `#ai-feedback`
collects feedback, `#ai-lab` is discussion. Any future AI work is a separate
module behind an interface, not hard-coded to one provider.

## Permissions per channel

Minimum for a channel a bot posts in:

- View Channel
- Send Messages
- Embed Links
- Read Message History (to edit a message it posted earlier)

Add Send Messages in Threads and Create Public Threads where a feature uses
threads. Guardian additionally needs Manage Messages where it pins the
verification prompt, and Manage Channels where `/slowmode` and `/lock` apply.

## Scheduled messages

Every scheduled post requires, without exception:

- an **enable/disable** switch (global via `FEATURE_SCHEDULED_MESSAGES`, plus a
  per-guild setting);
- an explicitly **configured channel** — never a default, never a guess;
- **timezone awareness** — cron expressions are evaluated in a named IANA zone,
  so "09:00" stays 09:00 across DST;
- **rate limiting** and a **cooldown**;
- **duplicate prevention** through a database lease, so two replicas post once;
- an **audit log** entry.

The scheduler enforces the lease, the timezone and the enable switch structurally
— a job cannot opt out of them.

## Verifying

```bash
pnpm diagnostics
```

Reports which channel ids are set and which are missing. It cannot verify that
an id points at a channel the bot can actually see — that needs a live
connection, and is checked at startup by the running bot.
