#!/usr/bin/env bash
# ci-smoke.sh — serve the built worker and check it answers like the app.
#
# Expects the worker build output at .output/server (run the build step
# first). Serves it with wrangler dev from the repo root — the config
# path is relative to the repo root; running inside .output/server
# breaks config resolution. Checks: / 200, one app route 200, and a
# nonsense path 404 (the branded not-found page), then kills the server.
set -uo pipefail
cd "$(dirname "$0")/.."

PORT="${CI_SMOKE_PORT:-8791}"
BASE="http://127.0.0.1:$PORT"
LOG="$(mktemp)"

# setsid puts wrangler in its own process group: wrangler spawns workerd
# children, and killing just the wrangler PID leaves them serving.
setsid npx wrangler dev --config .output/server/wrangler.json --port "$PORT" \
  > "$LOG" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill -TERM -- "-$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  rm -f "$LOG"
}
trap cleanup EXIT

up=0
for _ in $(seq 1 45); do
  if curl -s -m 2 -o /dev/null "$BASE/"; then
    up=1
    break
  fi
  # If wrangler died during startup, stop waiting and say so.
  kill -0 "$SERVER_PID" 2>/dev/null || break
  sleep 2
done
if [ "$up" -ne 1 ]; then
  echo "ERROR: worker did not start serving on $BASE" >&2
  cat "$LOG" >&2 || true
  exit 1
fi

fail=0
check() {
  code="$(curl -s -m 10 -o /dev/null -w '%{http_code}' "$BASE$1")"
  echo "$1 -> $code (expect $2)"
  [ "$code" = "$2" ] || fail=1
}
check / 200
check /profile 200
check /ci-smoke-nonsense-path 404

if [ "$fail" -ne 0 ]; then
  echo "ERROR: smoke check failed" >&2
  exit 1
fi
echo "smoke passed"
