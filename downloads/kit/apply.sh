#!/usr/bin/env bash
# ============================================================================
#  Bloom — Rewards page kit
#
#  Run one command in the VS Code terminal, from inside the extracted folder:
#
#      bash apply.sh
#
#  What it does:
#    1. finds your bloom-app project (or clones it if you don't have one)
#    2. copies only the Rewards page files into it
#    3. removes the two old shop files the new page replaces
#    4. installs dependencies if they are missing
#    5. offers to start the app
#
#  Nothing here touches your database, your .env, or anything outside the
#  Rewards feature. Every file it overwrites is backed up first.
# ============================================================================

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILES="$HERE/files"
BRANCH="arena/01a087e8-bloom-app"
REPO="https://github.com/Maelix-glitch/bloom-app.git"
STAMP="$(date +%Y%m%d-%H%M%S)"

say()  { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '\033[33m%s\033[0m\n' "$1"; }
die()  { printf '\033[31m%s\033[0m\n' "$1"; exit 1; }

# ------------------------------------------------------------- find project --
# A bloom-app project is: package.json + src/routes/rewards.tsx
is_project() {
  [ -f "$1/package.json" ] && [ -f "$1/src/routes/rewards.tsx" ]
}

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  for candidate in "$HERE/bloom-app" "$HERE/.." "$PWD" "$PWD/.." "$PWD/bloom-app"; do
    if is_project "$candidate"; then TARGET="$(cd "$candidate" && pwd)"; break; fi
  done
fi

if [ -n "$TARGET" ] && ! is_project "$TARGET"; then
  die "That folder is not a Bloom project (no package.json / src/routes/rewards.tsx): $TARGET"
fi

# ------------------------------------------------------------ clone if new --
if [ -z "$TARGET" ]; then
  warn "No Bloom project found near this folder."
  printf 'Clone Bloom into %s/bloom-app and continue? [Y/n] ' "$HERE"
  read -r reply
  case "${reply:-y}" in
    [yY]*)
      command -v git >/dev/null 2>&1 || die "git is not installed."
      say "Cloning $BRANCH"
      git clone --branch "$BRANCH" --single-branch "$REPO" "$HERE/bloom-app"
      TARGET="$HERE/bloom-app"
      ok "Cloned to $TARGET"
      ;;
    *) die "Stopped. Re-run with your project path:  bash apply.sh /path/to/bloom-app" ;;
  esac
fi

say "Bloom project: $TARGET"

# --------------------------------------------------------------- back up ----
BACKUP="$HERE/backup-$STAMP"
say "Backing up anything that is about to change → $(basename "$BACKUP")"
COUNT=0
while IFS= read -r rel; do
  [ -f "$TARGET/$rel" ] || continue
  mkdir -p "$BACKUP/$(dirname "$rel")"
  cp "$TARGET/$rel" "$BACKUP/$rel"
  COUNT=$((COUNT + 1))
done < <(cd "$FILES" && find . -type f | sed 's|^\./||')
ok "$COUNT existing file(s) saved (restore by copying them back)"

# ------------------------------------------------------------------ copy ----
say "Installing the Rewards page"
COPIED=0
while IFS= read -r rel; do
  mkdir -p "$TARGET/$(dirname "$rel")"
  cp "$FILES/$rel" "$TARGET/$rel"
  COPIED=$((COPIED + 1))
done < <(cd "$FILES" && find . -type f | sed 's|^\./||')
ok "$COPIED file(s) in place"

# --------------------------------------------------------------- remove -----
if [ -f "$HERE/remove.txt" ]; then
  REMOVED=0
  while IFS= read -r rel; do
    [ -n "$rel" ] || continue
    if [ -f "$TARGET/$rel" ]; then
      rm -f "$TARGET/$rel"
      REMOVED=$((REMOVED + 1))
    fi
  done < "$HERE/remove.txt"
  if [ "$REMOVED" -gt 0 ]; then
    ok "$REMOVED old shop file(s) removed (the new page replaces them)"
  fi
fi

# ---------------------------------------------------------------- deps ------
cd "$TARGET"
if [ ! -d node_modules ]; then
  say "Installing dependencies (this can take a minute)"
  npm install
else
  ok "Dependencies already installed"
fi

# --------------------------------------------------------------- verify -----
if [ -f node_modules/.bin/tsc ]; then
  say "Checking the code compiles"
  if node_modules/.bin/tsc --noEmit 2>&1 | grep -vE "BloomCycleAI|ReflectSheet|usePeriodLog|cycle-classic" | grep -q .; then
    warn "TypeScript reported issues above. The app may still run — check the message."
  else
    ok "No type errors in the Rewards feature"
  fi
fi

# ------------------------------------------------------------------ next ----
say "Done"
printf '  Rewards page files are in: %s\n' "$TARGET"
printf '  Backup of replaced files:  %s\n' "$BACKUP"
printf '\n  Start it with:  \033[1mnpm run dev\033[0m   (then open /rewards)\n\n'

printf 'Start the app now? [Y/n] '
read -r start
case "${start:-y}" in
  [yY]*) printf '\n'; exec npm run dev ;;
  *)     printf '  When you are ready:  cd "%s" && npm run dev\n' "$TARGET" ;;
esac
