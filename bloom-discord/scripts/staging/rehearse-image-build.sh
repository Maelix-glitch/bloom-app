#!/usr/bin/env bash
#
# Rehearse the container build without a container runtime.
#
#   ./scripts/staging/rehearse-image-build.sh
#
# This is NOT a container build and does not produce an image. It executes the
# same sequence of steps the Dockerfile does, in a scratch copy of the
# repository that respects .dockerignore, and then runs the result.
#
# It exists because the thing most likely to be wrong in a multi-stage Node
# image is not the image — it is the assumption that the application still runs
# after `pnpm prune --prod` removes every dev dependency. That failure is
# invisible until someone builds the image and starts a container, and it is
# fully reproducible here.
#
# When a Docker daemon is available, prefer the real thing:
#   docker build -t bloom-discord:local .
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAGE="${BLOOM_REHEARSAL_DIR:-/tmp/bloom-image-rehearsal}"

printf '\nContainer build rehearsal (no daemon, no image)\n\n'

rm -rf "$STAGE"
mkdir -p "$STAGE"

# Mirror .dockerignore. *.tsbuildinfo matters more than it looks: leave one in
# place and `tsc --build` decides everything is up to date and emits nothing,
# so the rehearsal "passes" with no dist/ at all.
printf '  copying source (honouring .dockerignore)\n'
tar --exclude=node_modules \
    --exclude=dist \
    --exclude='*.tsbuildinfo' \
    --exclude=coverage \
    --exclude=.env \
    --exclude='.env.*' \
    --exclude=.git \
    --exclude='*.log' \
    -cf - -C "$ROOT" . | (cd "$STAGE" && tar xf -)

cd "$STAGE"

printf '  stage 1: pnpm install --frozen-lockfile\n'
pnpm install --frozen-lockfile >/dev/null 2>&1

printf '  stage 2: tsc --build\n'
pnpm exec tsc --build >/dev/null 2>&1

for bot in guardian companion labs; do
  [[ -f "apps/$bot/dist/main.js" ]] || { printf '  FAIL: apps/%s/dist/main.js not emitted\n' "$bot"; exit 1; }
done
printf '        three entry points emitted\n'

printf '  stage 2b: pnpm prune --prod\n'
BEFORE=$(du -sm node_modules | cut -f1)
pnpm prune --prod >/dev/null 2>&1
AFTER=$(du -sm node_modules | cut -f1)
printf '        node_modules %sM -> %sM\n' "$BEFORE" "$AFTER"

# The actual point of this script.
printf '  stage 3: run each entry point against the pruned tree\n'
if [[ -f "$ROOT/.env" ]]; then
  cp "$ROOT/.env" "$STAGE/.env"
  set -a
  # shellcheck disable=SC1091
  . "$STAGE/.env"
  set +a
else
  printf '  (no .env — run scripts/staging/setup-staging.sh first)\n'
  exit 1
fi

FAILED=0
for bot in guardian companion labs; do
  OUT=$(HEALTH_PORT=0 timeout 25 node "apps/$bot/dist/main.js" 2>&1 || true)
  if grep -q 'Cannot find module' <<<"$OUT"; then
    printf '        FAIL %-10s missing module under --prod:\n' "$bot"
    grep -o "Cannot find module '[^']*'" <<<"$OUT" | head -1 | sed 's/^/          /'
    FAILED=1
  elif grep -q 'startup.features_ready' <<<"$OUT"; then
    printf '        ok   %-10s starts and registers features\n' "$bot"
  else
    printf '        FAIL %-10s did not reach feature registration\n' "$bot"
    FAILED=1
  fi
done

printf '  stage 3: compiled migrate CLI (tsx is a dev dependency and is gone)\n'
if node packages/database/dist/cli/migrate.js --status >/dev/null 2>&1; then
  printf '        ok   migrate CLI runs\n'
else
  printf '        FAIL migrate CLI does not run under --prod\n'
  FAILED=1
fi

printf '\n'
if [[ $FAILED -eq 0 ]]; then
  printf 'Rehearsal passed. The production dependency tree runs all three bots.\n'
  printf 'This is still not an image build — see docs/operations/staging-validation.md.\n\n'
else
  printf 'Rehearsal FAILED. The image would build and the containers would crash.\n\n'
  exit 1
fi
