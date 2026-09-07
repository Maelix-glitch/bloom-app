#!/usr/bin/env python3
"""
Builds docs/tier-b2/bloom-tier-b2.zip.

Same contract as docs/tier-b-c/make-kit.py: the kit is cumulative, so ONE run
brings any checkout — fresh, or one that already has some of the earlier kits —
all the way to this branch tip. Every text file is installed only when it
differs, binaries are byte-compared, removals happen only when the file matches
a version this branch or the shipped app knew, and for a replaced file the md5
of every version either side ever had is carried along, so a file the user
edited themselves is copied to <name>.before-tier-b2.txt instead of being
overwritten.

Where the provenance comes from
-------------------------------
This working clone is shallow (it starts at the previous kit's commit), so the
full history the earlier builder walked is not available locally. Instead the
previous kit — docs/tier-b-c/bloom-tier-bc.zip, itself cut from that history
against the shipped commit ce972cf — is used as the base:

  · its INSTALL / BINARIES / REMOVE lists and its KNOWN_BEFORE map are inherited
    verbatim (that is the shipped-app + branch provenance, unchanged);
  · every file this part of the work touched is re-read from the current tree,
    and the previous kit's copy of it is folded into KNOWN_BEFORE, so a checkout
    sitting at the previous kit is recognised as "known", not as a local edit.

The result is byte-for-byte the same kind of artifact, one tier further on.

  python3 docs/tier-b2/make-kit.py
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile

REPO = subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
OUT_DIR = os.path.join(REPO, "docs", "tier-b2")
PREV_ZIP = os.path.join(REPO, "docs", "tier-b-c", "bloom-tier-bc.zip")
PREV_NAME = "bloom-tier-bc"
KIT_NAME = "bloom-tier-b2"
BEFORE_SUFFIX = ".before-tier-b2.txt"

BIN_RE = re.compile(r"\.(jpg|jpeg|png|webp|gif|ico|woff2?|ttf|zip)$", re.I)
SKIP_RE = re.compile(r"^(docs/|src/_backup|\.shots|package\.json$|package-lock\.json$)")


def git(*args, binary=False):
    out = subprocess.check_output(["git", "-C", REPO, *args], stderr=subprocess.DEVNULL)
    return out if binary else out.decode()


def md5_text(data: bytes) -> str:
    text = data.decode("utf-8", errors="surrogateescape").replace("\r\n", "\n").rstrip()
    return hashlib.md5(text.encode("utf-8", errors="surrogateescape")).hexdigest()


tip = git("rev-parse", "HEAD").strip()
short = tip[:7]
prev_sha = git("rev-parse", "HEAD~1").strip()[:7]
print(f"tip {short} (previous kit at {prev_sha})")

# ------------------------------------------------- inherit the previous kit
prev = zipfile.ZipFile(PREV_ZIP)
prev_script = prev.read(f"{PREV_NAME}/apply-tier-bc.mjs").decode()


def const(name):
    m = re.search(r"const %s = " % name, prev_script)
    i = m.end()
    opener = prev_script[i]
    closer = "]" if opener == "[" else "}"
    depth = 0
    for j in range(i, len(prev_script)):
        if prev_script[j] == opener:
            depth += 1
        elif prev_script[j] == closer:
            depth -= 1
            if depth == 0:
                return json.loads(prev_script[i : j + 1])
    raise AssertionError(name)


install = list(const("INSTALL"))
binaries = list(const("BINARIES"))
known_before = dict(const("KNOWN_BEFORE"))
remove_pairs = [tuple(x) for x in const("REMOVE")]
mood_route_known = json.loads(
    re.search(r"const known = (\[[^\]]*\]);", prev_script).group(1)
)
print(f"inherited: {len(install)} text, {len(binaries)} binaries, {len(remove_pairs)} removals")

prev_blob = {}
for entry in prev.namelist():
    marker = f"{PREV_NAME}/files/"
    if entry.startswith(marker) and not entry.endswith("/"):
        prev_blob[entry[len(marker) :]] = prev.read(entry)

# ------------------------------------------------- layer this tier's changes
changed = []
for line in git("diff", "--name-status", "HEAD~1", tip).splitlines():
    parts = line.split("\t")
    status, path = parts[0][0], parts[-1]
    if SKIP_RE.search(path):
        continue
    assert status != "D", f"unexpected deletion this tier: {path}"
    changed.append(path)
changed.sort()
print(f"this tier touches {len(changed)} files: {', '.join(changed)}")
assert changed, "no changes to package?"

for path in changed:
    if BIN_RE.search(path):
        if path not in binaries:
            binaries.append(path)
        continue
    if path not in install:
        install.append(path)
    # Whatever this file looked like *before* this tier is a legitimate "before"
    # state: the previous kit's copy when it shipped one, otherwise the version
    # in the commit this tier branched from (a file the earlier kits never
    # touched, e.g. src/routes/__root.tsx). Without this the script would treat
    # an untouched checkout as "locally edited" and leave a needless backup.
    cur = md5_text(git("show", f"{tip}:{path}", binary=True))
    olds = set()
    if path in prev_blob:
        olds.add(md5_text(prev_blob[path]))
    try:
        olds.add(md5_text(git("show", f"{prev_sha}:{path}", binary=True)))
    except subprocess.CalledProcessError:
        pass  # new file this tier — nothing came before it
    olds.discard(cur)
    if olds:
        known_before[path] = sorted(set(known_before.get(path, [])) | olds)

install.sort()
binaries.sort()

# ---------------------------------------------------------------- stage files
stage = tempfile.mkdtemp(prefix="kit-")
root = os.path.join(stage, KIT_NAME)
files_dir = os.path.join(root, "files")
os.makedirs(files_dir)

for path in install + binaries:
    data = git("show", f"{tip}:{path}", binary=True)
    dst = os.path.join(files_dir, path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(data)

mig_dir = os.path.join(root, "migrations")
os.makedirs(mig_dir)
for path in install:
    if path.startswith("supabase/migrations/"):
        shutil.copy(os.path.join(files_dir, path), os.path.join(mig_dir, os.path.basename(path)))

for name, src in [
    ("REPORT.md", os.path.join(OUT_DIR, "REPORT.md")),
    ("README.md", os.path.join(OUT_DIR, "KIT-README.md")),
    ("REPORT-tier-b-c.md", os.path.join(REPO, "docs", "tier-b-c", "REPORT.md")),
    ("WHAT-IS-MISSING.md", os.path.join(REPO, "docs", "audit", "WHAT-IS-MISSING.md")),
]:
    shutil.copy(src, os.path.join(root, name))

MIGRATION_ORDER = [
    "20260909_core_tables.sql",
    "20260906_today_home.sql",
    "20260907_habit_pause.sql",
    "20260907_cycle_periods.sql",
    "20260908_mood_context.sql",
    "20260909_user_prefs.sql",
    "20260910_erase_account.sql",
]
assert set(MIGRATION_ORDER) == set(os.listdir(mig_dir)), sorted(os.listdir(mig_dir))

# ------------------------------------------------------------- apply script
CHECKS = [
    # everything the earlier kits brought, so one run can be trusted end to end
    ["src/components/tk/MetricsEntryModal.tsx", "export function MetricsEntryModal", "metrics-entry modal"],
    ["src/routes/index.tsx", "HabitsSection", "Today page with habits"],
    ["src/components/home/HomeSidebar.tsx", "export function AppNav", "shared rail"],
    ["src/routes/mood/index.tsx", "MoodPage", "Mood page"],
    ["src/lib/localDay.ts", "export function localDay", "Tier A · local-day authority"],
    ["src/lib/cycle/periodCloud.ts", "export function mergePeriodRecords", "Tier A · period sync"],
    ["src/lib/cycle/periodStore.ts", "export function effectiveMode", "B1 · cycle mode"],
    ["src/lib/trackers/core.ts", "goalsCounted", "B2 · active trackers in the score"],
    ["src/lib/cycle/predict.ts", "describeNextPeriod", "B5 · honest prediction wording"],
    ["src/lib/pageAll.ts", "export async function pageAll", "B10 · paging past 1,000 rows"],
    ["src/lib/prefs.ts", "syncPrefs", "C2 · synced prefs"],
    ["src/routes/profile.tsx", "pf-tabs", "Profile · redesigned route"],
    ["src/components/ui/bloom-sheet.tsx", "export function BloomSheet", "Premium sheets · primitive"],
    # Tier B part 2 — this kit
    ["src/lib/reminders/schedule.ts", "export function dueReminders", "B4 · reminder scheduler"],
    ["src/hooks/useReminders.ts", "export function useReminders", "B4 · reminder delivery"],
    ["src/lib/reminders/schedule.test.ts", "the evening nudge", "B4 · scheduler tests"],
    ["public/manifest.webmanifest", "shortcuts", "B6 · web app manifest"],
    ["public/sw.js", "bloom-notify", "B6 · service worker"],
    ["src/hooks/useInstallPrompt.ts", "beforeinstallprompt", "B6 · install prompt"],
    ["src/routes/__root.tsx", "manifest.webmanifest", "B6 · manifest linked in the head"],
    ["src/routes/__root.tsx", "registerServiceWorker", "B6 · worker registered"],
    ["src/lib/data/exportAll.ts", "export function buildExport", "B7 · one export"],
    ["src/hooks/useExportBundle.ts", "export function useExportBundle", "B7 · export sources"],
    ["src/components/profile/DataSheets.tsx", "pf-export-all-go", "B7 · export sheet"],
    ["src/lib/data/importPeriods.ts", "export function previewImport", "B8 · import parser"],
    ["src/components/ci/ImportPeriods.tsx", "cycle-import-go", "B8 · import sheet"],
    ["src/components/ci/HistoryTable.tsx", "cycle-import-open", "B8 · Import history button"],
    ["src/lib/data/erase.ts", "export async function eraseEverything", "B9 · erase"],
    ["src/components/profile/DataSheets.tsx", "pf-erase-go", "B9 · erase sheet"],
    ["supabase/migrations/20260910_erase_account.sql", "erase_my_data", "B9 · erase migration"],
    ["src/components/profile/AccountRow.tsx", "pf-row-reminders", "Profile · new settings rows"],
]

script = r'''#!/usr/bin/env node
/**
 * Bloom — Tier B part 2 kit (branch tip __SHORT__)
 *
 * Brings a checkout of bloom-app from what it shipped with (commit ce972cf)
 * all the way to this branch tip in ONE run — every phase so far: metrics modal
 * fix · Today + habits + shared rail · Add-habit dialog · Mood pages · full-width
 * Cycle with check-ins · Tier A (A1–A12) · Tier B part 1 (B1 B2 B3 B5 B10 B11) ·
 * Tier C (C1–C10) · the redesigned profile + premium sheets · and Tier B part 2:
 *
 *   B4  reminders that actually fire (habits, cycle, the evening nudge)
 *   B6  installable on the phone (manifest + offline shell + install prompt)
 *   B7  "Download everything" — one file with the whole record
 *   B8  import period history from another app (with a preview)
 *   B9  erase everything — this device and the account
 *
 * Idempotent and safe on a checkout that already has the earlier kits: every
 * file is compared (after CRLF / trailing-whitespace normalisation) and written
 * only when it differs; a file that is neither the shipped version nor a version
 * this branch ever produced is kept beside the new one as
 * <name>__BEFORE__ — nothing of yours is silently lost.
 *
 * Run from anywhere:   node "<path to this folder>\apply-tier-b2.mjs" [repo path]
 * Defaults to the current working directory as the repo.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const KIT = "Tier B part 2 kit (branch tip __SHORT__)";
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

/* Images and other binaries (compared byte-for-byte). */
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
  state(has("src/components/home/HomeSidebar.tsx"), "Today home page + rail present", "Today home page not applied yet (this kit includes it)");
  state(has("src/routes/mood/index.tsx"), "Mood page present", "Mood page not applied yet (this kit includes it)");
  state(has("src/lib/localDay.ts"), "Tier A present", "Tier A not applied yet (this kit includes it)");
  state(has("src/lib/cycle/periodStore.ts", "effectiveMode"), "Tier B part 1 present", "Tier B part 1 not applied yet (this kit includes it)");
  state(has("src/lib/profile/record.ts"), "redesigned profile present", "profile still the first version (this kit includes the redesign)");
  state(has("src/components/ui/bloom-sheet.tsx"), "premium sheets present", "premium sheets not applied yet (this kit includes them)");
  state(has("src/lib/reminders/schedule.ts"), "Tier B part 2 already applied", "no Tier B part 2 files yet \u2014 this kit adds B4 B6 B7 B8 B9");
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
    ["REPORT.md", "docs/tier-b2/REPORT.md"],
    ["REPORT-tier-b-c.md", "docs/tier-b-c/REPORT.md"],
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
  4. Supabase \u2192 SQL editor: run the files in this folder's migrations/ in this
     order (each once; all are safe to re-run, all "if not exists"):
       20260909_core_tables.sql      (first \u2014 harmless if the tables exist)
       20260906_today_home.sql       20260907_habit_pause.sql
       20260907_cycle_periods.sql    20260908_mood_context.sql
       20260909_user_prefs.sql       20260910_erase_account.sql   <- new (B9)
     Only the last one is new in this kit; skip any you have already run.
  5. Optional: npx vitest run   (229 tests / 20 files)
  6. git add -A && git commit -m "feat: Tier B part 2" && git push

  Trying it out:
    \u00b7 Reminders  \u2014 Profile \u2192 Account & data \u2192 "Remind me" \u2192 allow, then "Show me one".
    \u00b7 Install    \u2014 same sheet, or your browser's install button. Needs https or
                    localhost; the phone shortcuts live in public/manifest.webmanifest.
    \u00b7 Export     \u2014 Profile \u2192 "Download everything" (counts are shown first).
    \u00b7 Import     \u2014 Cycle \u2192 "Every entry you've logged" \u2192 "Import history".
    \u00b7 Erase      \u2014 Profile \u2192 "Erase everything" (type: erase everything).
`);
}
'''


def js(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


script = (
    script.replace("__SHORT__", short)
    .replace("__BEFORE__", BEFORE_SUFFIX)
    .replace("__INSTALL__", js(install))
    .replace("__BINARIES__", js(binaries))
    .replace("__KNOWN_BEFORE__", js(known_before))
    .replace("__REMOVE__", js([[p, list(h)] for p, h in remove_pairs]))
    .replace("__MOOD_ROUTE_KNOWN__", js(mood_route_known))
    .replace("__CHECKS__", js(CHECKS))
)
with open(os.path.join(root, "apply-tier-b2.mjs"), "w", newline="\n") as f:
    f.write(script)

# every CHECK needle must hold on the tip itself
for rel, needle, label in CHECKS:
    with open(os.path.join(files_dir, rel), "rb") as f:
        data = f.read()
    assert needle in data.decode("utf-8", errors="replace"), f"check would fail on tip: {label}"

# nothing the kit claims to install may be missing from files/
for rel in install + binaries:
    assert os.path.exists(os.path.join(files_dir, rel)), f"staged file missing: {rel}"

# ------------------------------------------------------------------ zip
out = os.path.join(OUT_DIR, f"{KIT_NAME}.zip")
if os.path.exists(out):
    os.remove(out)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for dirpath, _, filenames in os.walk(root):
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            z.write(full, os.path.relpath(full, stage))
print(f"wrote {out} ({os.path.getsize(out)/1024/1024:.1f} MB)")
shutil.rmtree(stage)
