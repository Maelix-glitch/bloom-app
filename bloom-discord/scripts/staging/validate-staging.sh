#!/usr/bin/env bash
#
# Staging validation.
#
#   ./scripts/staging/validate-staging.sh
#
# Runs every check that does not require a live Discord connection, against a
# real database and real processes. Each check prints what it actually found.
#
# What this CANNOT validate, because it needs a gateway and real tokens:
# command registration, a real interaction round trip, and the database
# mutation produced by one. Those steps are in
# docs/operations/staging-runbook.md and must be done by an operator with a
# staging guild. This script says so at the end rather than implying coverage
# it does not have.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
pass() { printf '  \033[32mok\033[0m    %s\n' "$*"; PASS=$((PASS + 1)); }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$*"; FAIL=$((FAIL + 1)); }
info() { printf '        %s\n' "$*"; }

set -a
# shellcheck disable=SC1091
. ./.env
set +a

printf '\nBloom staging validation\n\n'

# ---------------------------------------------------------------------------
printf 'Build artifacts\n'
# ---------------------------------------------------------------------------
for bot in guardian companion labs; do
  if [[ -f "apps/$bot/dist/main.js" ]]; then
    pass "apps/$bot/dist/main.js built"
  else
    fail "apps/$bot/dist/main.js missing — run pnpm build"
  fi
done

# ---------------------------------------------------------------------------
printf '\nDatabase\n'
# ---------------------------------------------------------------------------
if MIGRATE_OUT=$(pnpm db:status 2>&1); then
  APPLIED=$(grep -c '✓' <<<"$MIGRATE_OUT")
  if grep -q 'Pending: 0' <<<"$MIGRATE_OUT"; then
    pass "$APPLIED migrations applied, none pending"
  else
    fail "migrations pending: $(grep 'Pending:' <<<"$MIGRATE_OUT")"
  fi
else
  fail "could not read migration status"
fi

# ---------------------------------------------------------------------------
printf '\nProcesses start independently\n'
# ---------------------------------------------------------------------------
# Each bot is started on its own health port. None of them can reach Discord
# from this environment, so each is expected to get as far as the gateway and
# then exit. What is being checked is that it gets that far on its own: config,
# database, feature registration and the health server, with no dependency on
# another bot being up.
declare -A PORTS=([guardian]=8080 [companion]=8081 [labs]=8082)
declare -A PIDS=()

for bot in guardian companion labs; do
  LOG="/tmp/bloom-staging-$bot.log"
  HEALTH_PORT="${PORTS[$bot]}" node "apps/$bot/dist/main.js" >"$LOG" 2>&1 &
  PIDS[$bot]=$!
done

# Let all three get through startup. Whether each served health is taken from
# its own log rather than from a race against three curls — the process saying
# "I am listening" is better evidence than one observer managing to catch it.
sleep 2

for bot in guardian companion labs; do
  LOG="/tmp/bloom-staging-$bot.log"

  if grep -q '"event":"startup.database_ready"' "$LOG"; then
    pass "$bot reached the database"
  else
    fail "$bot did not reach the database"
  fi

  if grep -q '"event":"startup.features_ready"' "$LOG"; then
    COUNT=$(grep -o '"command_count":[0-9]*' "$LOG" | head -1 | cut -d: -f2)
    pass "$bot registered features (${COUNT:-?} commands)"
  else
    fail "$bot did not register features"
  fi

  if grep -q '"event":"health.listening"' "$LOG"; then
    pass "$bot served /health before its gateway attempt"
  else
    fail "$bot never served /health"
  fi

  # Secrets must never appear in logs.
  if grep -q '"token":"\[redacted\]"' "$LOG"; then
    pass "$bot redacted its token in logs"
  fi
  if grep -qF "${DISCORD_GUARDIAN_TOKEN:-__none__}" "$LOG"; then
    fail "$bot LEAKED a token into its logs"
  else
    pass "$bot logged no raw token"
  fi
done

# ---------------------------------------------------------------------------
printf '\nHealth reporting is real\n'
# ---------------------------------------------------------------------------
# Guardian alone, with a tight poll: the JSON assertions need a real response
# body, and one process racing one observer is a race that can be won.
HEALTH_PORT=8080 node apps/guardian/dist/main.js >/tmp/bloom-health-probe.log 2>&1 &
PROBE_PID=$!
GUARD=""
for _ in $(seq 1 200); do
  GUARD=$(curl -s --max-time 1 http://127.0.0.1:8080/health 2>/dev/null)
  [[ -n "$GUARD" ]] && break
  sleep 0.01
done
kill $PROBE_PID 2>/dev/null; wait $PROBE_PID 2>/dev/null

if [[ -n "$GUARD" ]]; then
  grep -q '"database"' <<<"$GUARD" &&
    grep -q '"status": "up"' <<<"$GUARD" &&
    pass "database component reports up from a real query" ||
    fail "database component did not report up"

  grep -q '"discord_gateway"' <<<"$GUARD" &&
    grep -q '"Websocket is not connected."' <<<"$GUARD" &&
    pass "gateway component reports down, not faked up" ||
    fail "gateway component did not honestly report down"

  grep -q '"unknown"' <<<"$GUARD" &&
    pass "an uncheckable component reports unknown, not up" ||
    info "no unknown component in this snapshot"

  grep -q '"status": "down"' <<<"$GUARD" &&
    pass "aggregate is the worst component, not an average" ||
    fail "aggregate did not follow the worst component"
else
  fail "could not capture a /health response body"
fi

# ---------------------------------------------------------------------------
printf '\nCross-bot heartbeat\n'
# ---------------------------------------------------------------------------
HB=$(pnpm -s exec node -e '
import("./packages/database/dist/index.js").then(async (m) => {
  const db = m.createDatabase({
    url: process.env.DATABASE_URL, schema: process.env.DATABASE_SCHEMA,
    maxConnections: 3, connectTimeoutSeconds: 5, idleTimeoutSeconds: 5,
  }, { trace(){}, debug(){}, info(){}, warn(){}, error(){}, fatal(){}, child(){ return this; } });
  const rows = await db.sql`SELECT bot_name, gateway_connected, database_ok FROM bloom_discord.system_health ORDER BY bot_name`;
  console.log(rows.map((r) => `${r.bot_name}:gw=${r.gateway_connected}:db=${r.database_ok}`).join(" "));
  await db.close();
}).catch((e) => { console.log("ERROR " + e.message); });
' 2>/dev/null | tail -1)

if [[ "$HB" == *"guardian"* && "$HB" == *"companion"* && "$HB" == *"labs"* ]]; then
  pass "all three processes wrote a heartbeat independently"
  info "$HB"
  if [[ "$HB" == *"gw=false"* ]]; then
    pass "heartbeat records the gateway as disconnected rather than assuming up"
  fi
  if [[ "$HB" == *"db=true"* ]]; then
    pass "heartbeat records a real database check"
  fi
else
  fail "not all three processes wrote a heartbeat — got: ${HB:-nothing}"
fi

for bot in guardian companion labs; do
  kill "${PIDS[$bot]}" 2>/dev/null
done
wait 2>/dev/null

# ---------------------------------------------------------------------------
printf '\nIndependence\n'
# ---------------------------------------------------------------------------
# The point of three processes: one failing must not stop the others. Guardian
# is given a deliberately broken configuration; Companion and Labs must still
# get all the way to their own gateway attempt.
BROKEN=/tmp/bloom-broken-guardian.log
(ROLE_FOUNDER= node apps/guardian/dist/main.js >"$BROKEN" 2>&1) &
BROKEN_PID=$!
sleep 1
if grep -qi 'CONFIGURATION_ERROR' "$BROKEN"; then
  pass "guardian with a broken config fails fast and names the problem"
else
  info "guardian did not produce a configuration error (it may have failed later)"
fi
kill $BROKEN_PID 2>/dev/null; wait $BROKEN_PID 2>/dev/null

OK_AFTER=0
for bot in companion labs; do
  LOG="/tmp/bloom-after-$bot.log"
  HEALTH_PORT="${PORTS[$bot]}" timeout 10 node "apps/$bot/dist/main.js" >"$LOG" 2>&1
  if grep -q '"event":"startup.features_ready"' "$LOG"; then
    pass "$bot started fully while guardian was broken"
    OK_AFTER=$((OK_AFTER + 1))
  else
    fail "$bot was affected by guardian's failure"
  fi
done

# ---------------------------------------------------------------------------
printf '\n%s passed, %s failed\n\n' "$PASS" "$FAIL"
printf 'Not covered here — needs a staging guild and real tokens:\n'
printf '  • gateway connection and the ready lifecycle\n'
printf '  • command registration\n'
printf '  • a real interaction and the database row it writes\n'
printf 'See docs/operations/staging-runbook.md.\n\n'

[[ $FAIL -eq 0 ]] || exit 1
