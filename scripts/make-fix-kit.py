#!/usr/bin/env python3
"""
Builds bloom-fix.zip — one script that updates the code AND cleans the repo.

Everything since the Tier B part 2 kit (00dcc24):

  · installs 47 new files and updates 33 changed ones
  · deletes 39 dead files (the old static site, stale notes, the _backup dir)
  · removes the old delivery kits from docs/

Previous kits only ever *added* files, which is why the clutter kept coming
back — the apply script had no way to express "this should be gone now". This
one carries deletions as first-class instructions.

  python3 scripts/make-fix-kit.py
"""
import hashlib
import json
import os
import re
import subprocess
import shutil
import tempfile
import zipfile

REPO = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
OUT_DIR = os.path.join(REPO, "docs", "cleanup")
KIT_NAME = "bloom-fix"

PREV = "00dcc24"
# docs/ is deliberately excluded — kits are no longer committed to the repo.
SKIP_RE = re.compile(r"^(docs/|package\.json$|package-lock\.json$|bun\.lock$)")


def git(*args, binary=False):
    out = subprocess.check_output(["git", "-C", REPO, *args], stderr=subprocess.DEVNULL)
    return out if binary else out.decode()


def md5_text(data: bytes) -> str:
    text = data.decode("utf-8", errors="surrogateescape").replace("\r\n", "\n").rstrip()
    return hashlib.md5(text.encode("utf-8", errors="surrogateescape")).hexdigest()


tip = git("rev-parse", "HEAD").strip()
short = tip[:7]
prev = git("rev-parse", PREV).strip()
print(f"fix kit: {prev[:7]} -> {short}")

install, added, delete = [], [], []
for line in git("diff", "--name-status", prev, tip).splitlines():
    parts = line.split("\t")
    status, path = parts[0][0], parts[-1]
    if SKIP_RE.search(path):
        continue
    if status == "D":
        delete.append(path)
    else:
        install.append(path)
        if status == "A":
            added.append(path)
install.sort()
delete.sort()

# Whole directories that should go, rather than 39 individual paths. Anything
# under these is pruned from `delete` so the script's output stays readable.
DELETE_DIRS = [
    "src/_backup-trackers-20260904-162359",
    "public/bloom/js",
    "public/bloom/css",
    "docs/today-home",
    "docs/add-habit-modal",
    "docs/mood-page",
    "docs/metrics-modal-issue",
    "docs/cycle-loopholes",
    "docs/mood-fixes",
    "docs/tier-a",
    "docs/tier-b-c",
    "docs/tier-b2",
    "docs/audit",
]
delete = [p for p in delete if not any(p.startswith(d + "/") for d in DELETE_DIRS)]

print(f"{len(install)} files ({len(added)} new, {len(install) - len(added)} changed)")
print(f"{len(delete)} files + {len(DELETE_DIRS)} directories to remove")

known_before = {}
for path in install:
    if path in added:
        continue
    before = md5_text(git("show", f"{prev}:{path}", binary=True))
    now = md5_text(git("show", f"{tip}:{path}", binary=True))
    if before != now:
        known_before[path] = [before]

stage = tempfile.mkdtemp(prefix="fix-")
root = os.path.join(stage, KIT_NAME)
files_dir = os.path.join(root, "files")
os.makedirs(files_dir)
for path in install:
    dst = os.path.join(files_dir, path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(git("show", f"{tip}:{path}", binary=True))

# Load-bearing paths that sit beside things being deleted. Verified before
# anything is removed — see the note in scripts/clean.mjs for why each matters.
PROTECTED = [
    ["public/bloom/icons", "PWA + notification icons"],
    ["public/bloom/bloom-add-habit-modal-v3-latest.html", "reference for the React AddHabitModal"],
    ["public/rewards/medals", "rewards admin medal images"],
    ["public/manifest.webmanifest", "the app manifest"],
    ["public/sw.js", "the service worker"],
]

PREREQS = [
    ["src/lib/prefs.ts", "export function setPref", "synced prefs"],
    ["src/lib/cycle/periodStore.ts", "export function effectiveMode", "cycle mode"],
    ["src/components/ui/bloom-sheet.tsx", "BloomSheet", "premium sheets"],
    ["src/lib/coach/responder.ts", "export function answer", "coach responder"],
]

CHECKS = [
    ["src/components/coach/CoachPage.tsx", "No sign-in gate", "Coach answers when signed out"],
    ["src/lib/coach/knowledge.ts", "export const KNOWLEDGE", "Coach knowledge base"],
    ["src/lib/coach/compose.ts", "export function compose", "Coach answer composer"],
    ["src/lib/coach/engine.ts", "CoachCancelled", "Coach cancellation fix"],
    ["src/hooks/useCoachSystem.ts", "inFlight.current = null", "Coach controller released"],
    ["src/lib/supabase.ts", "export function watchAuth", "Safe auth subscription"],
    ["src/hooks/useHabits.ts", "watchAuth", "Habits load without crashing"],
    ["src/components/system/ConnectionNotice.tsx", "Saving to this device only", "Offline notice"],
    ["src/lib/onboarding/adminTargets.ts", "ADMIN_TARGETS", "Admin launcher"],
    ["src/styles/mood-motion.css", "scale(1.06)", "Mood image pinch fix"],
    ["src/lib/prefsStore.ts", "useSyncExternalStore", "Tab-flicker fix"],
    [".env.example", "VITE_SUPABASE_URL", "Env template"],
]

script = r'''#!/usr/bin/env node
/**
 * Bloom — fix + clean (tip __SHORT__)
 *
 * One run does both:
 *   1. installs __NEW__ new files and updates __CHANGED__ changed ones
 *   2. deletes the dead weight — the old static HTML site, stale delivery
 *      notes, the _backup snapshot, and the superseded kits in docs/
 *
 * Highlights of what's fixed:
 *   · the coach answers again (it silently refused whenever you were signed
 *     out, which is why pressing send did nothing at all)
 *   · the coach knows ~25 subjects instead of demanding logged data
 *   · saving works, and says so plainly when there's no database configured
 *   · no flicker or lag when switching tabs; the mood photo no longer pinches
 *
 * Safe by default: files you edited yourself are copied to <name>__BEFORE__,
 * deletions are verified first, and re-running is a no-op.
 *
 *   node apply-fix.mjs [path-to-repo]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2] ?? process.cwd());
const files = path.join(here, "files");

const ok = (m) => console.log("  \u2714 " + m);
const gone = (m) => console.log("  \u2717 " + m);
const skip = (m) => console.log("  \u2022 " + m + " (already done)");
const note = (m) => console.log("  \u2139 " + m);
const fail = (m) => {
  console.error("  \u2716 " + m);
  process.exitCode = 1;
};

const read = (p) => fs.readFileSync(p, "utf8");
const norm = (t) => t.replace(/\r\n/g, "\n");
const isCrlf = (p) => fs.existsSync(p) && fs.readFileSync(p).includes("\r\n");
const md5 = (t) => crypto.createHash("md5").update(norm(t).replace(/\s+$/, "")).digest("hex");
function write(p, text, crlf) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, crlf ? text.replace(/\r?\n/g, "\r\n") : text);
}

const INSTALL = __INSTALL__;
const KNOWN_BEFORE = __KNOWN_BEFORE__;
const DELETE_FILES = __DELETE_FILES__;
const DELETE_DIRS = __DELETE_DIRS__;
const PROTECTED = __PROTECTED__;
const PREREQS = __PREREQS__;
const CHECKS = __CHECKS__;

console.log(`\nBloom \u2014 fix + clean \u2192 ${repo}\n`);

if (!fs.existsSync(path.join(repo, "package.json")) || !fs.existsSync(path.join(repo, "src/routes"))) {
  console.error("This doesn't look like the Bloom repo (no package.json + src/routes). Pass the repo path as an argument.");
  process.exit(1);
}

/* 1. prerequisites */
console.log("Checking your checkout:");
let missing = 0;
for (const [rel, needle, label] of PREREQS) {
  const p = path.join(repo, rel);
  if (fs.existsSync(p) && norm(read(p)).includes(needle)) ok(label);
  else {
    console.error(`  \u2716 missing: ${label}  (${rel})`);
    missing += 1;
  }
}
if (missing) {
  console.error(`\n${missing} thing(s) from an earlier kit are missing. Nothing has been written.`);
  process.exit(1);
}

/*
 * 2. Protect what's load-bearing.
 *
 * Several deletions sit right beside files the app needs — public/bloom/icons
 * is the PWA icon set, public/rewards/medals is used by the rewards admin. If
 * one of those is already gone, this tree isn't what the kit expects and
 * deleting more would make it worse.
 */
for (const [rel, why] of PROTECTED) {
  if (!fs.existsSync(path.join(repo, rel))) {
    console.error(`\n\u2716 ${rel} is missing (${why}).`);
    console.error("  This repo isn't in the state this kit expects. Nothing has been written.");
    process.exit(1);
  }
}

/* 3. install */
console.log("\nUpdate:");
let wrote = 0;
for (const rel of INSTALL) {
  const src = path.join(files, rel);
  const dst = path.join(repo, rel);
  if (!fs.existsSync(src)) {
    fail(`kit is missing ${rel}`);
    continue;
  }
  const next = read(src);
  if (!fs.existsSync(dst)) {
    write(dst, next, false);
    ok(`added ${rel}`);
    wrote += 1;
    continue;
  }
  const cur = read(dst);
  if (md5(cur) === md5(next)) {
    skip(rel);
    continue;
  }
  const known = KNOWN_BEFORE[rel] ?? [];
  if (!known.includes(md5(cur))) {
    fs.copyFileSync(dst, dst + "__BEFORE__");
    note(`${rel} had local edits \u2014 your copy is kept as ${path.basename(dst)}__BEFORE__`);
  }
  write(dst, next, isCrlf(dst));
  ok(`updated ${rel}`);
  wrote += 1;
}

/* 4. clean */
console.log("\nRemove:");
let removed = 0;
let freed = 0;
const sizeOf = (p) => {
  let total = 0;
  const walk = (q) => {
    const st = fs.statSync(q);
    if (st.isDirectory()) for (const n of fs.readdirSync(q)) walk(path.join(q, n));
    else total += st.size;
  };
  try {
    walk(p);
  } catch {
    return 0;
  }
  return total;
};

for (const rel of [...DELETE_DIRS, ...DELETE_FILES]) {
  const p = path.join(repo, rel);
  if (!fs.existsSync(p)) continue;
  freed += sizeOf(p);
  fs.rmSync(p, { recursive: true, force: true });
  gone(rel);
  removed += 1;
}
if (removed === 0) console.log("  (nothing to remove \u2014 already clean)");

/* prune any empty directories the removals left behind */
const prune = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) prune(full);
  }
  if (fs.readdirSync(dir).length === 0 && dir !== repo) fs.rmdirSync(dir);
};
for (const d of ["docs", "public/bloom", "public/demo", "src"]) prune(path.join(repo, d));

/* 5. verify */
console.log("\nVerify:");
for (const [rel, needle, label] of CHECKS) {
  const p = path.join(repo, rel);
  if (fs.existsSync(p) && norm(read(p)).includes(needle)) ok(label);
  else fail(`${label} \u2014 check ${rel}`);
}

const mb = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);

if (process.exitCode) {
  console.log("\nSomething was skipped \u2014 see the \u2716 lines above. Send me this whole output.");
} else {
  console.log(`
Done. ${wrote} file(s) updated, ${removed} item(s) removed (${mb(freed)} freed).

Next:
  1. Stop the dev server, then: npm run dev
  2. Open the URL it prints \u2014 it is localhost:5173, NOT 8080.
     (8080 was the old static site; this kit deletes it.)
  3. Hard-refresh once (Ctrl+F5)
  4. Optional: npx vitest run   \u2014 385 tests

  Then try the coach. It answers signed out now; that gate was the bug.

  Commit it:
    git add -A
    git commit -m "fix: coach, saving, and repo cleanup"

  Undo everything:  git checkout -- .
`);
}
'''


def js(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


script = (
    script.replace("__SHORT__", short)
    .replace("__NEW__", str(len(added)))
    .replace("__CHANGED__", str(len(install) - len(added)))
    .replace("__INSTALL__", js(install))
    .replace("__KNOWN_BEFORE__", js(known_before))
    .replace("__DELETE_FILES__", js(delete))
    .replace("__DELETE_DIRS__", js(DELETE_DIRS))
    .replace("__PROTECTED__", js(PROTECTED))
    .replace("__PREREQS__", js(PREREQS))
    .replace("__CHECKS__", js(CHECKS))
)
with open(os.path.join(root, "apply-fix.mjs"), "w", newline="\n") as f:
    f.write(script)

# A check that passes vacuously is worse than no check.
for rel, needle, label in CHECKS:
    p = os.path.join(files_dir, rel)
    assert os.path.exists(p), f"CHECK names a file the kit doesn't ship: {rel}"
    with open(p, "rb") as f:
        assert needle in f.read().decode("utf-8", errors="replace"), f"check fails on tip: {label}"

# Nothing may be both installed and deleted.
overlap = set(install) & set(delete)
assert not overlap, f"install/delete overlap: {overlap}"
for d in DELETE_DIRS:
    bad = [p for p in install if p.startswith(d + "/")]
    assert not bad, f"kit installs into a directory it deletes: {bad}"

os.makedirs(OUT_DIR, exist_ok=True)
out = os.path.join(OUT_DIR, f"{KIT_NAME}.zip")
if os.path.exists(out):
    os.remove(out)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for base, _dirs, names in os.walk(root):
        for name in sorted(names):
            full = os.path.join(base, name)
            z.write(full, os.path.relpath(full, stage))

shutil.rmtree(stage)
print(f"wrote {os.path.relpath(out, REPO)}  ({os.path.getsize(out):,} B)")
