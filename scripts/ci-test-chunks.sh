#!/usr/bin/env bash
# ci-test-chunks.sh — the full test suite, run in deterministic chunks.
#
# Why chunks: this is the exact split the local sign-off gate uses
# (10 chunks over the sorted test-file list). A single `npx vitest run`
# over ~290 files lets vitest's worker processes accumulate memory until
# a worker dies mid-run — and a worker that dies leaves files unreported,
# which must never read as a pass. Chunking bounds each process's
# lifetime, gives one clear log per chunk, and makes CI verify exactly
# what the local gate verifies.
#
# The enumeration mirrors vitest.config.ts: every src/**/*.test.ts(x)
# except the config's own exclusion, *.integration.test.ts (those need a
# live PostgreSQL and run separately via `npm run test:db`).
set -uo pipefail
cd "$(dirname "$0")/.."

CHUNKS="${CI_TEST_CHUNKS:-10}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

find src -name "*.test.ts" -o -name "*.test.tsx" \
  | grep -v '\.integration\.test\.tsx\?$' \
  | sort > "$WORK/all.txt"
total="$(wc -l < "$WORK/all.txt")"
echo "test files: $total in $CHUNKS chunks"

split -n "l/$CHUNKS" -d "$WORK/all.txt" "$WORK/chunk-"

fail=0
ran=0
for chunk in "$WORK"/chunk-*; do
  n="$(wc -l < "$chunk")"
  ran=$((ran + n))
  echo "=== chunk $(basename "$chunk"): $n files ==="
  # File paths in this repo contain no spaces; xargs passes them as argv.
  xargs -a "$chunk" npx vitest run || fail=1
done

echo "files run: $ran / $total"
if [ "$ran" -ne "$total" ]; then
  echo "ERROR: chunk split lost files ($ran of $total)" >&2
  exit 1
fi
if [ "$fail" -ne 0 ]; then
  echo "ERROR: one or more chunks failed" >&2
  exit 1
fi
echo "all chunks passed"
