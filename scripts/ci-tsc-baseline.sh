#!/usr/bin/env bash
# ci-tsc-baseline.sh — type check that fails on NEW errors only.
#
# Clean main carries 2 pre-existing TS4111 errors in
# src/hooks/useProgression.claim.test.tsx (index-signature property
# access). They are recorded, verbatim, in .github/tsc-baseline.txt.
# This script fails if `tsc --noEmit` reports any error NOT in that
# baseline — new errors can never slip in — while the known pair does
# not keep CI red forever. Baseline entries that stop occurring are
# reported as a warning so the baseline gets pruned when they are fixed;
# if you fix one, delete its line from the baseline in the same PR.
set -uo pipefail
cd "$(dirname "$0")/.."

BASELINE=".github/tsc-baseline.txt"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# tsc exits non-zero whenever errors exist — including just the known
# baseline pair — so its exit code is deliberately not used here; the
# comparison below is the verdict.
npx tsc --noEmit > "$WORK/tsc.txt" 2>&1
grep "error TS" "$WORK/tsc.txt" | sort -u > "$WORK/actual.txt" || true
sort -u "$BASELINE" > "$WORK/baseline.txt"

new_errors="$(comm -13 "$WORK/baseline.txt" "$WORK/actual.txt")"
fixed_errors="$(comm -23 "$WORK/baseline.txt" "$WORK/actual.txt")"

if [ -n "$fixed_errors" ]; then
  echo "::warning::These baseline errors no longer occur — remove them from $BASELINE:"
  echo "$fixed_errors"
fi
if [ -n "$new_errors" ]; then
  echo "New TypeScript errors beyond the checked-in baseline ($BASELINE):" >&2
  echo "$new_errors" >&2
  exit 1
fi
echo "tsc: no errors beyond the known baseline ($(wc -l < "$WORK/actual.txt" | tr -d ' ') known)."
