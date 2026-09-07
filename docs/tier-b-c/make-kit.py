#!/usr/bin/env python3
"""
Builds docs/tier-b-c/bloom-tier-bc.zip from the git history of this branch.

  python3 docs/tier-b-c/make-kit.py <tip-sha>

The kit is cut against the shipped commit (ce972cf) so it carries everything:
every text file the branch added or changed (installed if it differs), every
image (byte-compared), removals only when the file is byte-identical to a
version this branch knew, and — for replaced files — the md5 of every version
that the shipped app or this branch ever had, so a locally edited file is backed
up as <name>.before-tier-bc.txt instead of overwritten.
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile

BASE = "ce972cf71c8d05842bee0bc8b054998c920eaaef"
TIP = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
REPO = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
OUT_DIR = os.path.join(REPO, "docs", "tier-b-c")
KIT_NAME = "bloom-tier-bc"
BEFORE_SUFFIX = ".before-tier-bc.txt"

BIN_RE = re.compile(r"\.(jpg|jpeg|png|webp|gif|ico|woff2?|ttf|zip)$", re.I)
SKIP_RE = re.compile(r"^(docs/|src/_backup|\.shots|package\.json$|package-lock\.json$)")


def git(*args, binary=False):
    out = subprocess.check_output(["git", "-C", REPO, *args], stderr=subprocess.DEVNULL)
    return out if binary else out.decode()


def md5_text(data: bytes) -> str:
    text = data.decode("utf-8", errors="surrogateescape").replace("\r\n", "\n").rstrip()
    return hashlib.md5(text.encode("utf-8", errors="surrogateescape")).hexdigest()


def md5_bytes(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


tip = git("rev-parse", TIP).strip()
short = tip[:7]

# commits on the branch, newest first, stopping at BASE
commits = git("rev-list", tip, "-n", "200").split()
assert BASE in commits, "BASE not reachable from tip within 200 commits"
branch_commits = commits[: commits.index(BASE)]
assert branch_commits, "no commits on the branch?"
print(f"tip {short}, {len(branch_commits)} branch commits")

# name-status against base
install, binaries, removed = [], [], []
for line in git("diff", "--name-status", BASE, tip).splitlines():
    parts = line.split("\t")
    status, path = parts[0][0], parts[-1]
    if SKIP_RE.search(path):
        continue
    if status == "D":
        removed.append(path)
    elif BIN_RE.search(path):
        binaries.append(path)
    else:
        install.append(path)
install.sort()
binaries.sort()
removed.sort()
print(f"install {len(install)} text, {len(binaries)} binaries, remove {len(removed)}")


def versions_of(path):
    """md5s of every version of `path` from BASE and every branch commit (excluding the tip's)."""
    hashes = set()
    for sha in [BASE, *branch_commits]:
        try:
            data = git("show", f"{sha}:{path}", binary=True)
        except subprocess.CalledProcessError:
            continue
        hashes.add(md5_text(data))
    return hashes


tip_blobs = {}
known_before = {}
for path in install:
    data = git("show", f"{tip}:{path}", binary=True)
    tip_blobs[path] = data
    prev = versions_of(path) - {md5_text(data)}
    if prev:
        known_before[path] = sorted(prev)
print(f"known-before map: {len(known_before)} files")
assert known_before, "known-before map is empty — history lookup failed"

remove_known = {}
for path in removed:
    hashes = versions_of(path)
    if hashes:
        remove_known[path] = sorted(hashes)

# ---------------------------------------------------------------- stage files
stage = tempfile.mkdtemp(prefix="kit-")
root = os.path.join(stage, KIT_NAME)
files_dir = os.path.join(root, "files")
os.makedirs(files_dir)
for path, data in tip_blobs.items():
    dst = os.path.join(files_dir, path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(data)
for path in binaries:
    dst = os.path.join(files_dir, path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(git("show", f"{tip}:{path}", binary=True))

mig_dir = os.path.join(root, "migrations")
os.makedirs(mig_dir)
for path in install:
    if path.startswith("supabase/migrations/"):
        shutil.copy(os.path.join(files_dir, path), os.path.join(mig_dir, os.path.basename(path)))

for name, src in [
    ("REPORT.md", os.path.join(OUT_DIR, "REPORT.md")),
    ("README.md", os.path.join(OUT_DIR, "KIT-README.md")),
    ("WHAT-IS-MISSING.md", os.path.join(REPO, "docs", "audit", "WHAT-IS-MISSING.md")),
]:
    shutil.copy(src, os.path.join(root, name))

migration_names = sorted(os.listdir(mig_dir))
MIGRATION_ORDER = [
    "20260909_core_tables.sql",
    "20260906_today_home.sql",
    "20260907_habit_pause.sql",
    "20260907_cycle_periods.sql",
    "20260908_mood_context.sql",
    "20260909_user_prefs.sql",
]
assert set(MIGRATION_ORDER) == set(migration_names), (MIGRATION_ORDER, migration_names)

# ------------------------------------------------------------- apply script
CHECKS = [
    ["src/components/tk/MetricsEntryModal.tsx", "export function MetricsEntryModal", "metrics-entry modal"],
    ["src/routes/index.tsx", "HabitsSection", "Today page with habits"],
    ["src/components/home/HomeSidebar.tsx", "export function AppNav", "shared rail"],
    ["src/routes/mood/index.tsx", "MoodPage", "Mood page"],
    ["src/lib/localDay.ts", "export function localDay", "Tier A · local-day authority"],
    ["src/lib/cycle/periodCloud.ts", "export function mergePeriodRecords", "Tier A · period sync"],
    ["src/lib/mood/pending.ts", "export function applyPending", "Tier A · mood outbox"],
    ["src/lib/cycle/periodStore.ts", "export function effectiveMode", "B1 · cycle mode"],
    ["src/components/ci/CycleModeCard.tsx", "cycle-mode-open", "B1 · Expecting periods? card"],
    ["src/lib/cycle/predict.ts", "expecting", "B1 · engine honours not-expecting"],
    ["src/lib/trackers/core.ts", "goalsCounted", "B2 · active trackers in the score"],
    ["src/hooks/useHabits.ts", "toggle", "B3 · tick a past day"],
    ["src/lib/cycle/predict.ts", "describeNextPeriod", "B5 · honest prediction wording"],
    ["src/lib/pageAll.ts", "export async function pageAll", "B10 · paging past 1,000 rows"],
    ["supabase/migrations/20260909_core_tables.sql", "mood_entries", "B11 · core tables migration"],
    ["src/lib/prefs.ts", "syncPrefs", "C2 · synced prefs"],
    ["supabase/migrations/20260909_user_prefs.sql", "user_prefs", "C2 · user_prefs migration"],
    ["src/components/rewards/PointsStrip.tsx", "reward-points", "C4 · points on Rewards"],
    ["src/components/ci/CycleHeatmap.tsx", "cycle-heat-", "C5 · tappable heatmap"],
    ["src/lib/profile/record.ts", "export function recordGrid", "Profile · record grid"],
    ["src/hooks/useProfileRecord.ts", "export function useProfileRecord", "Profile · record hook"],
    ["src/components/profile/RecordBlock.tsx", "RecordNumbers", "Profile · numbers + grid"],
    ["src/routes/profile.tsx", "pf-tabs", "Profile · redesigned route"],
    ["src/styles/profile.css", ".pf-cover", "Profile · stylesheet"],
    ["src/components/ui/bloom-sheet.tsx", "export function BloomSheet", "Premium sheets · primitive"],
    ["src/components/stories/StoryComposer.tsx", "bmoment-tile", "Premium sheets · moment picker"],
    ["src/components/profile/ProfileEditor.tsx", "Make it feel like you.", "Premium sheets · profile editor"],
    ["src/styles/mood-motion.css", "mm-draw", "Mood page · motion direction"],
]

script = r'''#!/usr/bin/env node
/**
 * Bloom — Tier B/C kit (2026-09-07, branch tip __SHORT__)
 *
 * Brings a checkout of bloom-app from what it shipped with (commit ce972cf)
 * to the state of arena/01a0702b-bloom-app at __SHORT__ — EVERY phase so far in
 * one run: metrics modal fix · Today + habits + shared rail · Add-habit dialog ·
 * Mood pages · full-width Cycle with check-ins · Tier A (A1–A12) · Tier B
 * (B1 B2 B3 B5 B10 B11) · Tier C (C1–C10) · the redesigned Profile.
 *
 * Idempotent and safe on a checkout that already has earlier kits: every file
 * is compared (after CRLF / trailing-whitespace normalisation) and only written
 * when it differs; a file that is neither the shipped version nor a version
 * this branch ever produced is kept beside the new one as
 * <name>__BEFORE__ — nothing of yours is silently lost.
 *
 * Run from anywhere:   node "<path to this folder>\apply-tier-bc.mjs" [repo path]
 * Defaults to the current working directory as the repo.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const KIT = "Tier B/C kit (2026-09-07, branch tip __SHORT__)";
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2] ?? process.cwd());
const files = path.join(here, "files");

const ok = (m) => console.log("  \u2714 " + m);
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
const md5file = (p) => crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");
function write(p, text, crlf) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, crlf ? text.replace(/\r?\n/g, "\r\n") : text);
}

/* Text files this kit installs (added or replaced). */
const INSTALL = __INSTALL__;

/* Images (compared byte-for-byte). */
const BINARIES = __BINARIES__;

/* Every version of each replaced file that the shipped app or this branch ever
   had (md5 of LF-normalised text). Anything else is a local edit → backed up. */
const KNOWN_BEFORE = __KNOWN_BEFORE__;

/* Files the branch removed. Deleted only when identical to a version this
   branch or the shipped app had; anything else is left in place. */
const REMOVE = __REMOVE__;

function installText(rel) {
  const src = path.join(files, rel);
  const dst = path.join(repo, rel);
  if (!fs.existsSync(src)) return fail(`kit is missing ${rel}`);
  const next = read(src);
  if (!fs.existsSync(dst)) {
    write(dst, next, false);
    return ok(`added ${rel}`);
  }
  const cur = read(dst);
  if (md5(cur) === md5(next)) return skip(rel);
  const known = KNOWN_BEFORE[rel] ?? [];
  if (!known.includes(md5(cur))) {
    const bak = dst + "__BEFORE__";
    fs.copyFileSync(dst, bak);
    note(`${rel} had local edits \u2014 your copy is kept as ${path.basename(bak)}`);
  }
  write(dst, next, isCrlf(dst));
  ok(`updated ${rel}`);
}

function installBinary(rel) {
  const src = path.join(files, rel);
  const dst = path.join(repo, rel);
  if (!fs.existsSync(src)) return fail(`kit is missing ${rel}`);
  const existed = fs.existsSync(dst);
  if (existed && md5file(dst) === md5file(src)) return skip(rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  ok(`${existed ? "updated" : "added"} ${rel}`);
}

function removeFile(rel, knownHashes) {
  const p = path.join(repo, rel);
  if (!fs.existsSync(p)) return;
  if (knownHashes.length && !knownHashes.includes(md5(read(p)))) {
    const bak = p + "__BEFORE__";
    fs.renameSync(p, bak);
    return note(`${rel} had local edits \u2014 moved aside to ${path.basename(bak)} (the app no longer uses it)`);
  }
  fs.unlinkSync(p);
  ok(`removed ${rel}`);
}

console.log(`\nBloom \u2014 ${KIT} \u2192 ${repo}\n`);

/* 0. sanity */
if (!fs.existsSync(path.join(repo, "package.json")) || !fs.existsSync(path.join(repo, "src/routes"))) {
  console.error("This doesn't look like the Bloom repo (no package.json + src/routes). Pass the repo path as an argument.");
  process.exit(1);
}
const pkg = JSON.parse(read(path.join(repo, "package.json")));
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
for (const d of ["@tanstack/react-router", "@supabase/supabase-js", "vitest", "dayjs"]) {
  if (!deps[d]) fail(`package.json has no ${d} \u2014 is this the chronos-feel checkout?`);
}
if (process.exitCode) process.exit(1);

/* 1. what state is the tree in? */
console.log("Found:");
{
  const has = (rel, needle) => {
    const p = path.join(repo, rel);
    return fs.existsSync(p) && (!needle || norm(read(p)).includes(needle));
  };
  const state = (cond, yes, no) => console.log("  " + (cond ? "\u2714 " + yes : "\u2192 " + no));
  state(has("src/components/tk/MetricsEntryModal.tsx"), "metrics-entry modal fix present", "metrics-entry modal fix not applied yet (this kit includes it)");
  state(has("src/components/home/HomeSidebar.tsx"), "Today home page + rail present", "Today home page not applied yet (this kit includes it)");
  state(has("src/routes/mood/index.tsx"), "Mood page present", "Mood page not applied yet (this kit includes it)");
  state(has("src/lib/cycle/reconcile.ts"), "cycle check-ins present", "cycle check-ins not applied yet (this kit includes it)");
  state(has("src/lib/localDay.ts"), "Tier A present", "Tier A not applied yet (this kit includes it)");
  state(has("src/lib/pageAll.ts"), "Tier B/C already started", "no Tier B/C files yet");
  state(has("src/lib/cycle/periodStore.ts", "effectiveMode"), "cycle mode (B1) present", "cycle mode not applied yet");
  state(has("src/lib/profile/record.ts"), "redesigned profile present", "profile still the first version");
}
console.log("");

/* 2. install */
console.log("Apply:");
for (const rel of INSTALL) installText(rel);
for (const rel of BINARIES) installBinary(rel);

/* 3. remove what the branch removed */
for (const [rel, hashes] of REMOVE) removeFile(rel, hashes);
/* the Today-home kit's flat /mood route was replaced by routes/mood/index.tsx —
   two files for one path would make the router complain */
{
  const p = path.join(repo, "src/routes/mood.tsx");
  if (fs.existsSync(p)) {
    const known = __MOOD_ROUTE_KNOWN__;
    if (known.includes(md5(read(p)))) {
      fs.unlinkSync(p);
      ok("removed src/routes/mood.tsx (superseded by src/routes/mood/index.tsx)");
    } else {
      const bak = p + "__BEFORE__";
      fs.renameSync(p, bak);
      note(`src/routes/mood.tsx had local edits \u2014 moved aside to ${path.basename(bak)} (routes/mood/index.tsx takes over /mood)`);
    }
  }
}
for (const dir of ["src/components/lovable/ui", "src/components/lovable"]) {
  const p = path.join(repo, dir);
  if (fs.existsSync(p) && fs.readdirSync(p).length === 0) {
    fs.rmdirSync(p);
    ok(`removed empty folder ${dir}`);
  }
}

/* 4. docs */
{
  for (const [srcName, dstRel] of [
    ["REPORT.md", "docs/tier-b-c/REPORT.md"],
    ["WHAT-IS-MISSING.md", "docs/audit/WHAT-IS-MISSING.md"],
  ]) {
    const src = path.join(here, srcName);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(repo, dstRel);
    if (fs.existsSync(dst) && md5(read(dst)) === md5(read(src))) skip(dstRel);
    else {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      ok(`added ${dstRel}`);
    }
  }
}

/* 5. .gitignore: screenshots folder */
{
  const gi = path.join(repo, ".gitignore");
  const cur = fs.existsSync(gi) ? read(gi) : "";
  if (!/^\.shots\/?$/m.test(cur)) {
    fs.writeFileSync(gi, cur.replace(/\s*$/, "\n") + ".shots/\n");
    ok("added .shots/ to .gitignore");
  } else skip(".gitignore");
}

/* 6. verify */
console.log("\nVerify:");
const checks = __CHECKS__;
for (const [rel, needle, label] of checks) {
  const p = path.join(repo, rel);
  if (fs.existsSync(p) && norm(read(p)).includes(needle)) ok(label);
  else fail(`${label} \u2014 check ${rel}`);
}

if (process.exitCode) {
  console.log("\nSomething was skipped \u2014 see the \u2716 lines above. Send me this whole output.");
} else {
  console.log(`
Done. Next:
  1. npm install            (no new packages, but the lockfile may refresh)
  2. Stop the dev server if it is running, then:  npm run dev
     (it regenerates src/routeTree.gen.ts on start \u2014 commit that file too).
  3. Hard-refresh once (Ctrl+F5).
  4. Supabase \u2192 SQL editor: run the six files in this folder's migrations/
     in this order (each once; all are safe to re-run):
       20260909_core_tables.sql      (first \u2014 harmless if the tables exist)
       20260906_today_home.sql       20260907_habit_pause.sql
       20260907_cycle_periods.sql    20260908_mood_context.sql
       20260909_user_prefs.sql
  5. Optional: npx vitest run   (199 tests)
  6. git add -A && git commit -m "feat: Tier B/C part 1 + profile redesign" && git push
`);
}
'''

mood_route_known = sorted(versions_of("src/routes/mood.tsx"))


def js(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


script = (
    script.replace("__SHORT__", short)
    .replace("__BEFORE__", BEFORE_SUFFIX)
    .replace("__INSTALL__", js(install))
    .replace("__BINARIES__", js(binaries))
    .replace("__KNOWN_BEFORE__", js(known_before))
    .replace("__REMOVE__", js([[p, remove_known.get(p, [])] for p in removed]))
    .replace("__MOOD_ROUTE_KNOWN__", js(mood_route_known))
    .replace("__CHECKS__", js(CHECKS))
)
with open(os.path.join(root, "apply-tier-bc.mjs"), "w", newline="\n") as f:
    f.write(script)

# every CHECK needle must hold on the tip itself
for rel, needle, label in CHECKS:
    data = tip_blobs.get(rel)
    if data is None:
        data = git("show", f"{tip}:{rel}", binary=True)
    assert needle in data.decode("utf-8", errors="replace"), f"check would fail on tip: {label}"

# ------------------------------------------------------------------ zip
out = os.path.join(OUT_DIR, f"{KIT_NAME}.zip")
if os.path.exists(out):
    os.remove(out)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for dirpath, _, filenames in os.walk(root):
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            z.write(full, os.path.relpath(full, stage))
size = os.path.getsize(out)
print(f"wrote {out} ({size/1024/1024:.1f} MB)")
shutil.rmtree(stage)
