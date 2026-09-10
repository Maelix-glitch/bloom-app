#!/usr/bin/env bash
# Bloom — pull the latest Rewards progression work from the Arena branch.
#
# Run this from inside your local clone, in the VS Code terminal:
#
#     bash scripts/update-from-arena.sh
#
# It is deliberately careful: it will not throw away work you have not saved,
# and it tells you exactly what it did. Nothing here touches your database or
# your .env — this is code only.

set -euo pipefail

BRANCH="arena/01a087e8-bloom-app"
REMOTE="origin"

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }
warn() { printf '\033[33m%s\033[0m\n' "$1"; }

# ---------------------------------------------------------------- sanity ----
if [ ! -d .git ]; then
  warn "This does not look like a git repo."
  echo "Open the folder that contains bloom-app, then run this again."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  warn "You have uncommitted changes."
  git status --short
  printf '\n'
  read -r -p "Stash them, pull, then restore them? [y/N] " reply
  case "$reply" in
    [yY]) STASHED=1; git stash push -u -m "before arena pull $(date +%F-%H%M)" ;;
    *)    echo "Stopped. Commit or stash your work, then run this again."; exit 1 ;;
  esac
else
  STASHED=0
fi

# ------------------------------------------------------------------ pull ----
say "Fetching $REMOTE"
git fetch "$REMOTE" "$BRANCH"

say "Switching to $BRANCH"
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" --track "$REMOTE/$BRANCH"
fi

say "Pulling the latest"
git pull --ff-only "$REMOTE" "$BRANCH"

# --------------------------------------------------------------- restore ----
if [ "$STASHED" = "1" ]; then
  say "Restoring your changes"
  git stash pop || warn "Stash did not apply cleanly — your work is safe in: git stash list"
fi

# ----------------------------------------------------------- dependencies ----
if [ -f package.json ]; then
  say "Installing dependencies"
  if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
    pnpm install
  elif command -v npm >/dev/null 2>&1; then
    npm install
  else
    warn "No npm or pnpm found — skipping install."
  fi
fi

# ------------------------------------------------------------ where you are ----
say "Done"
git --no-pager log --oneline -5
printf '\n'
echo "Start the app with:  npm run dev"
echo "Then check /rewards — that is the journey page."
