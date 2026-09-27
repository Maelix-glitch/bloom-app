# Staging validation — results

What was actually executed, what it proved, and what remains unproven. Run on
2026-09-25 against the repository at the commit this document was added in.

Reproduce with:

```bash
./scripts/staging/setup-staging.sh
pnpm build && pnpm db:migrate
./scripts/staging/validate-staging.sh      # 29 checks
./scripts/staging/rehearse-image-build.sh  # production dependency tree
```

---

## The twelve requested steps

| #   | Step                                       | Result                                                       |
| --- | ------------------------------------------ | ------------------------------------------------------------ |
| 1   | Reproducible container build               | ⚠️ **Rehearsed, not built** — no container runtime available |
| 2   | Three processes build and start            | ✅ All three, independently                                  |
| 3   | Scratch PostgreSQL                         | ✅ PostgreSQL 17, throwaway cluster                          |
| 4   | Migrations against staging                 | ✅ 8 applied, none pending, idempotent on re-run             |
| 5   | Three apps connect with distinct tokens    | ✅ Config layer; ❌ gateway unreachable                      |
| 6   | Guardian → private staging guild           | ❌ **Blocked** — `discord.com` unreachable, no real token    |
| 7   | Gateway connection and readiness lifecycle | 🟡 Half: the disconnected half is proven, connected is not   |
| 8   | Register Guardian commands                 | ❌ **Blocked** — needs a live token                          |
| 9   | Execute a real command through Discord     | ❌ **Blocked**                                               |
| 10  | Verify the database mutation it produced   | ❌ **Blocked**                                               |
| 11  | Structured logging and health reporting    | ✅ Both, against real processes                              |
| 12  | One bot failing does not stop the others   | ✅ Proven                                                    |

Two hard environment limits, both verified rather than assumed:

```
docker/podman/buildah/nerdctl   absent
https://discord.com/api/v10/gateway   connection failed (000)
https://gateway.discord.gg            connection failed (000)
https://github.com                    200
```

Egress works; Discord specifically does not resolve. Steps 6–10 are not
skipped — they are impossible here, and they are written up as
[the staging runbook](./staging-runbook.md) for an operator with a real guild.

---

## What the automated run proves

29 checks, 0 failures.

**Processes start independently.** Each of the three reaches the database,
registers its features, and serves health — with no other bot running. Command
counts observed: Guardian 9, Companion 3, Labs 2.

**Structured logging is real, and redacts.** Every line is one JSON object with
a `correlation_id` threading a startup. Tokens appear as `"token":"[redacted]"`
and client ids as `"1111…1111"`. A check greps each log for the raw token and
fails if it appears; it does not.

**Health reporting is real, and honest.** A live capture during startup:

```json
{
  "status": "down",
  "components": {
    "discord_gateway": { "status": "down", "detail": "Websocket is not connected." },
    "database": { "status": "up", "detail": "Reachable.", "latencyMs": 2 },
    "role_placement": {
      "status": "unknown",
      "detail": "The startup role audit has not completed yet."
    }
  },
  "peers": []
}
```

Three properties worth naming: the gateway reports `down` rather than an assumed
`up`; a check that cannot run reports `unknown`, which is not the same as `up`;
and the aggregate is the **worst** component, not an average.

**The heartbeat works across processes.** All three wrote their own
`system_health` row:

```
guardian:gw=false:db=true  companion:gw=false:db=true  labs:gw=false:db=true
```

Each says "I am running and my gateway is down" — which is the distinction
between a process that is absent and one that is disconnected, and the reason
the heartbeat starts before the gateway rather than after it.

**Independence.** Guardian was given a broken configuration and failed fast
naming the missing key; Companion and Labs then started fully. A failure in one
bot does not propagate.

**The production dependency tree runs.** `pnpm prune --prod` takes
`node_modules` from 141 MB to 31 MB, and all three entry points plus the
compiled migrate CLI still start against it. This is the failure that would
otherwise be discovered by building an image and watching the containers crash.

---

## Two fixes this validation produced

Running the thing found what reading it did not.

**Health started after the gateway.** A bot that could not reach Discord served
no health endpoint at all — so the one moment an operator most needs to ask
"what is wrong" was the one moment nothing answered. Connection refused is not a
diagnosis. The health server now starts before login. No status semantics
changed: the gateway check still reports `down` until it is up, so `/ready` is
still 503 until the bot is genuinely usable — it just says so out loud.

**The heartbeat started after the gateway too**, with the same consequence: a
disconnected bot wrote no row, so its peers could not distinguish "not running"
from "running but cut off". Also moved.

Neither was visible from the test suite, because the test suite does not start a
process.

---

## What is still unproven

Unchanged by this exercise, and not diminished by 29 passing checks:

1. **No interaction has ever made a round trip.** Command registration, modal
   submission, button routing, deferral timing and the 3-second acknowledgement
   window are all unobserved.
2. **No image has been built.** The rehearsal executes the Dockerfile's steps but
   assembles nothing: the base image, the non-root user, `tini` as PID 1, the
   `HEALTHCHECK`, and layer caching are all unverified.
3. **Privileged intent approval is untested.** Guardian requests Server Members.
   Whether the portal toggle is correctly set can only be learned by connecting.
4. **Rate limits have never been encountered**, because nothing has ever made a
   Discord API call.
5. **Role hierarchy enforcement is untested against a real guild.** The check
   reads live role positions; it has only ever read fakes.

The honest summary is the same as before, one line shorter: everything that can
be verified without a Discord token or a container runtime now has been, and
nothing that requires either has been.
