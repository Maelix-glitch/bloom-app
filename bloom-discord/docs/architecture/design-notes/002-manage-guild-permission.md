# Design note 002 — Manage Guild for Guardian

**Status:** decision requested. Nothing implemented.
**Question:** should Guardian hold Manage Server, and is there a way to avoid it?

This note exists because [design note 001](./001-auto-moderation.md) proposes
auto-moderation built on Discord's native AutoMod, and that approach needs one
permission Guardian does not currently have.

---

## 1. Why it is required

Discord delivers `AUTO_MODERATION_ACTION_EXECUTION` **only to applications
holding Manage Guild**. This is Discord's rule, not an implementation choice —
the documentation states plainly that all Auto Moderation gateway events are
sent only to bots with that permission.

Creating, reading or updating AutoMod rules through the API requires it too.

So the permission buys two distinct things, and they are separable:

| Capability                               | Needs Manage Guild |
| ---------------------------------------- | :----------------: |
| **Receive** AutoMod execution events     |        yes         |
| **Manage** AutoMod rules from Bloom      |        yes         |
| React to an event (timeout, case, audit) |         no         |

Guardian's current integer is `1497064631510`; bit 5 (`1 << 5`) is clear. Adding
it gives `1497064631542`.

## 2. What else it grants

This is the part that deserves scrutiny, because Manage Guild is broad. Holding
it also allows:

- editing server settings — name, icon, region, verification level, system
  channel, AFK settings
- viewing and managing **invites**, including creating and deleting them
- managing **integrations**, including other applications' webhooks
- changing the server's vanity URL, banner and splash
- with Manage Roles (which Guardian already has), a meaningfully larger blast
  radius if the bot's token is ever compromised

None of that is needed. There is no scope narrower than "Manage Guild" that
delivers AutoMod events; Discord does not offer a per-event permission.

**The honest framing:** this is not a small permission, and the justification is
one gateway event. A compromised Guardian token already means role assignment,
bans and message deletion. Manage Guild adds server-configuration and invite
control on top of that — bad, but not a change of category.

## 3. Can AutoMod be configured manually instead?

**Yes, partly — and this is the most useful finding in this note.**

The two capabilities separate cleanly:

- **Rule authoring** can be done entirely by hand. A human creates the spam,
  mention-spam and keyword rules in Server Settings → AutoMod. Discord enforces
  them server-side whether or not any bot is connected. Bloom never needs the
  API for this.
- **Reacting** to a rule firing cannot. Without Manage Guild the events are
  simply not delivered, and Guardian has no way to know a rule triggered.

So manual configuration removes the _rule management_ half of the requirement
but not the _event_ half. If Guardian is to escalate, open cases or run appeals
off the back of AutoMod, it needs the permission. If it is not, Bloom does not
need the permission at all — and also does not get any of the Bloom-specific
value, because Discord's native actions stop at block, alert and timeout, with
no memory across incidents.

There is one further alternative worth naming and rejecting: Guardian could
watch the **AutoMod alert channel** and parse the system messages Discord posts
there. That needs Message Content, which is a privileged intent and strictly
worse than Manage Guild — it would mean receiving every message in that channel
as text. Rejected.

## 4. The minimum practical permission model

Recommended, in preference order:

**Option A — Manage Guild, rules authored by hand. (Recommended.)**
Guardian holds Manage Guild solely to receive events. Rules are created by staff
in the Discord UI and Bloom never calls the rule API. The permission matrix
records that the bit is held for event delivery only, and a test asserts Bloom
issues no AutoMod rule writes. Smallest capability surface that still delivers
escalation, cases and appeals.

**Option B — Manage Guild, rules managed by Bloom.**
Adds `/guardian automod` rule management. More convenient, more surface, and it
puts Bloom in a position to change server configuration. Only worth it if staff
find hand-editing rules painful in practice — which is unknown today, so it
should not be assumed.

**Option C — no Manage Guild.**
Native AutoMod still runs, still blocks messages and still applies timeouts.
Bloom does none of it: no escalation across incidents, no automod cases, no
appeals, and `automod_events` is never written. The capability matrix row stays
**Not Built** and the platform remains honest about it.

Option C is a legitimate answer. Choosing it means accepting that unattended
moderation is Discord's alone, which for a small private community may be
entirely sufficient.

### If Option A is chosen

- Guardian permission integer: `1497064631510` → `1497064631542`
- Intent: `AUTO_MODERATION_EXECUTION` (**not** privileged)
- Message Content: still not requested, by any bot
- Companion and Labs: unchanged, and must never receive these events
- Permission matrix gains a row stating the bit is held for event delivery only
- A test asserts no code path calls the AutoMod rule endpoints

## Open question for approval

Which option? The recommendation is **A**, on the grounds that it is the only
one that delivers the Bloom-specific value and its alternative (Message Content)
is worse. But C is defensible and costs nothing, and this is a judgement about
how much trust to place in one bot's token rather than a technical problem with
a correct answer.

No code will be written for auto-moderation until this is answered.
