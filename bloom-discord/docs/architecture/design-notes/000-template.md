# Design note NNN — <subsystem>

> Required by §38 of the expansion specification: a design note exists **before**
> implementation for any substantial subsystem. Copy this file, number it, fill
> every heading. A heading you cannot fill is the finding — write down what is
> unknown rather than deleting the section.

## Purpose

What problem this solves, in two or three sentences. If the honest answer is
"other platforms have it", stop.

## Owning bot

Exactly one of Guardian, Companion, Labs — or an explicit statement that this is
shared infrastructure and why. Name what the other two may read and what they
must never write.

## Permissions required

Every new Discord permission, with the reason. If none: say so explicitly, it is
the best possible answer. A permission increase for the lowest-trust bot needs a
paragraph, not a line.

## Intents required

Including whether any are privileged. If a privileged intent seems necessary,
first check whether a message context-menu command or a native Discord feature
covers the case.

## Database impact

New tables, new columns, indexes, and the retention answer: which allowlist does
this land in, or why does it hold data indefinitely. Sensitive columns get an
erasure answer too.

## Events involved

Gateway events consumed, internal events emitted, and what happens if one is
missed. Discord does not guarantee delivery.

## Commands and interactions

Command paths, custom id scheme, which branches defer and which cannot.

## Failure modes

What happens when the database is down, when Discord rejects the call, when the
member submits twice, when the job crashes mid-run. Each needs an answer, and
"it throws" is only acceptable when throwing is safe.

## Security implications

Who can invoke it, what they could do with it if the authorization check were
wrong, and whether any input is trusted that should not be.

## Privacy implications

What member-authored content is stored, who can read it, what appears in logs,
and what a member gets if they ask for erasure. Wellbeing-adjacent data is
sensitive by default.

## Testing plan

What is unit-tested with fakes, what needs a real database, and which claims are
only true if the database enforces them — those get mutation-tested.

## Rollback strategy

How this is turned off without a deploy (feature flag key), and whether the
migration is reversible. Forward-only migrations need a compensating plan.

## Open questions

Anything unresolved. §40: document the ambiguity instead of guessing.
