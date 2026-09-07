#!/usr/bin/env python3
"""
Builds docs/tier-b2/bloom-tier-b2-slim.zip — ONLY the files Tier B part 2
touched (20 of them), for a checkout that is already at the previous kit.

The difference from make-kit.py
-------------------------------
`bloom-tier-b2.zip` is *cumulative*: it carries 160 files (20 from this tier +
140 inherited from every earlier kit) so that one run repairs a checkout that
is any distance behind. That is the right artifact when you don't know what
state a tree is in.

This slim kit assumes you are already at the previous kit's commit (15ff2e8)
and installs nothing else. It therefore REFUSES TO RUN unless it can see the
markers of the previous tier in your tree — installing these 20 files on top of
an older checkout would produce a half-updated app that imports things that
aren't there.

Files are still written whole, not as patches: the apply script is a plain
file-copier with local-edit protection, and a partial file cannot be verified
by md5 the way a whole one can.

  python3 docs/tier-b2/make-slim-kit.py
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
KIT_NAME = "bloom-tier-b2-slim"
BEFORE_SUFFIX = ".before-tier-b2.txt"

# The commit the previous kit produced — the state this slim kit expects.
PREV = "15ff2e8"
SKIP_RE = re.compile(r"^(docs/|src/_backup|\.shots|package\.json$|package-lock\.json$)")


def git(*args, binary=False):
    out = subprocess.check_output(["git", "-C", REPO, *args], stderr=subprocess.DEVNULL)
    return out if binary else out.decode()


def md5_text(data: bytes) -> str:
    text = data.decode("utf-8", errors="surrogateescape").replace("\r\n", "\n").rstrip()
    return hashlib.md5(text.encode("utf-8", errors="surrogateescape")).hexdigest()


tip = git("rev-parse", "HEAD").strip()
short = tip[:7]
prev = git("rev-parse", PREV).strip()
print(f"slim kit: {prev[:7]} -> {short}")

# ------------------------------------------------- exactly this tier's files
install, added = [], []
for line in git("diff", "--name-status", prev, tip).splitlines():
    parts = line.split("\t")
    status, path = parts[0][0], parts[-1]
    if SKIP_RE.search(path):
        continue
    assert status != "D", f"unexpected deletion: {path}"
    install.append(path)
    if status == "A":
        added.append(path)
install.sort()
print(f"{len(install)} files ({len(added)} new, {len(install) - len(added)} changed)")
assert install, "nothing to package"

# For a changed file, the previous kit's version is the expected "before".
known_before = {}
for path in install:
    if path in added:
        continue
    before = md5_text(git("show", f"{prev}:{path}", binary=True))
    now = md5_text(git("show", f"{tip}:{path}", binary=True))
    if before != now:
        known_before[path] = [before]

# ---------------------------------------------------------------- stage files
stage = tempfile.mkdtemp(prefix="slim-")
root = os.path.join(stage, KIT_NAME)
files_dir = os.path.join(root, "files")
os.makedirs(files_dir)
for path in install:
    dst = os.path.join(files_dir, path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(git("show", f"{tip}:{path}", binary=True))

mig_dir = os.path.join(root, "migrations")
os.makedirs(mig_dir)
for path in install:
    if path.startswith("supabase/migrations/"):
        shutil.copy(os.path.join(files_dir, path), os.path.join(mig_dir, os.path.basename(path)))

shutil.copy(os.path.join(OUT_DIR, "REPORT.md"), os.path.join(root, "REPORT.md"))
shutil.copy(os.path.join(OUT_DIR, "SLIM-README.md"), os.path.join(root, "README.md"))

# What must already be present for these 20 files to make sense.
PREREQS = [
    ["src/components/ui/bloom-sheet.tsx", "export function BloomSheet", "premium sheets (BloomSheet primitive)"],
    ["src/lib/prefs.ts", "export function setPref", "synced prefs document (C2)"],
    ["src/lib/cycle/periodStore.ts", "export function effectiveMode", "cycle mode (B1)"],
    ["src/hooks/useProfileSpace.ts", "useProfileSpace", "profile space hook"],
    ["src/lib/profile/record.ts", "export function recordGrid", "redesigned profile"],
    ["src/hooks/useTrackers.ts", "customSubjects", "trackers with active set (B2/C1)"],
    ["src/hooks/useHabits.ts", "todayHabits", "habits store"],
    ["src/lib/localDay.ts", "export function localDay", "local-day authority (Tier A)"],
]

CHECKS = [
    ["src/lib/reminders/schedule.ts", "export function dueReminders", "B4 · reminder scheduler"],
    ["src/hooks/useReminders.ts", "export function useReminders", "B4 · reminder delivery"],
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
    ["src/components/ci/CycleIntelligence.tsx", "ImportPeriods", "B8 · wired into the Cycle page"],
    ["src/lib/data/erase.ts", "export async function eraseEverything", "B9 · erase"],
    ["src/components/profile/DataSheets.tsx", "pf-erase-go", "B9 · erase sheet"],
    ["supabase/migrations/20260910_erase_account.sql", "erase_my_data", "B9 · erase migration"],
    ["src/components/profile/AccountRow.tsx", "pf-row-reminders", "Profile · new settings rows"],
    ["src/routes/profile.tsx", "RemindersSheet", "Profile · sheets mounted"],
]

script = r'''#!/usr/bin/env node
/**
 * Bloom — Tier B part 2, SLIM kit (__COUNT__ files, branch tip __SHORT__)
 *
 * Only the files this tier touched:
 *   B4  reminders that actually fire (habits, cycle, the evening nudge)
 *   B6  installable on the phone (manifest + offline shell + install prompt)
 *   B7  "Download everything" — one file with the whole record
 *   B8  import period history from another app (with a preview)
 *   B9  erase everything — this device and the account
 *
 * This kit assumes your checkout is ALREADY at the previous kit (Tier B/C +
 * the profile redesign + premium sheets). It checks for that first and stops
 * if anything is missing — these files import things the earlier tiers added,
 * so installing them on an older tree would leave the app broken. If the check
 * stops you, use the full cumulative kit (bloom-tier-b2.zip) instead: it
 * carries every earlier file too and repairs any checkout in one run.
 *
 * Idempotent: files that already match are skipped, and a file you edited
 * yourself is copied to <name>__BEFORE__ before being replaced.
 *
 * Run from anywhere:  node "<path to this folder>\apply-slim.mjs" [repo path]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

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
function write(p, text, crlf) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, crlf ? text.replace(/\r?\n/g, "\r\n") : text);
}

const INSTALL = __INSTALL__;
const KNOWN_BEFORE = __KNOWN_BEFORE__;
const PREREQS = __PREREQS__;
const CHECKS = __CHECKS__;

console.log(`\nBloom \u2014 Tier B part 2 (slim, __COUNT__ files) \u2192 ${repo}\n`);

/* 0. is this the repo? */
if (!fs.existsSync(path.join(repo, "package.json")) || !fs.existsSync(path.join(repo, "src/routes"))) {
  console.error("This doesn't look like the Bloom repo (no package.json + src/routes). Pass the repo path as an argument.");
  process.exit(1);
}

/* 1. is it new enough? these files depend on the earlier tiers */
console.log("Checking your checkout is at the previous kit:");
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
  console.error(`
${missing} thing(s) from the earlier kits are missing, so this slim kit would
leave the app broken \u2014 the new files import them.

Use the full kit instead:  bloom-tier-b2.zip \u2192 node apply-tier-b2.mjs
It contains every earlier file as well and brings any checkout up to date in
one run. Nothing has been written.`);
  process.exit(1);
}
console.log("");

/* 2. install */
console.log("Apply:");
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
}

/* 3. the report, for reference */
{
  const src = path.join(here, "REPORT.md");
  const dst = path.join(repo, "docs/tier-b2/REPORT.md");
  if (fs.existsSync(src)) {
    if (fs.existsSync(dst) && md5(read(dst)) === md5(read(src))) skip("docs/tier-b2/REPORT.md");
    else {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      ok("added docs/tier-b2/REPORT.md");
    }
  }
}

/* 4. verify */
console.log("\nVerify:");
for (const [rel, needle, label] of CHECKS) {
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
  2. Stop the dev server, then: npm run dev   \u2014 hard-refresh once (Ctrl+F5)
  3. Supabase \u2192 SQL editor: run migrations/20260910_erase_account.sql
     (the ONLY new migration; everything else already ran with the last kit.
      Only the Erase button needs it \u2014 B4/B6/B7/B8 need no SQL.)
  4. Optional: npx vitest run   (229 tests / 20 files)
  5. git add -A && git commit -m "feat: Tier B part 2" && git push

  Trying it out:
    \u00b7 Reminders  \u2014 Profile \u2192 Account & data \u2192 "Remind me" \u2192 allow \u2192 "Show me one"
    \u00b7 Install    \u2014 same sheet (needs https or localhost)
    \u00b7 Export     \u2014 Profile \u2192 "Download everything"
    \u00b7 Import     \u2014 Cycle \u2192 "Every entry you've logged" \u2192 "Import history"
    \u00b7 Erase      \u2014 Profile \u2192 "Erase everything" (type: erase everything)
`);
}
'''


def js(obj):
    return json.dumps(obj, indent=2, ensure_ascii=False)


script = (
    script.replace("__SHORT__", short)
    .replace("__COUNT__", str(len(install)))
    .replace("__INSTALL__", js(install))
    .replace("__KNOWN_BEFORE__", js(known_before))
    .replace("__PREREQS__", js(PREREQS))
    .replace("__CHECKS__", js(CHECKS))
)
with open(os.path.join(root, "apply-slim.mjs"), "w", newline="\n") as f:
    f.write(script)

for rel, needle, label in CHECKS:
    with open(os.path.join(files_dir, rel), "rb") as f:
        assert needle in f.read().decode("utf-8", errors="replace"), f"check fails on tip: {label}"

out = os.path.join(OUT_DIR, f"{KIT_NAME}.zip")
if os.path.exists(out):
    os.remove(out)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for dirpath, _, filenames in os.walk(root):
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            z.write(full, os.path.relpath(full, stage))
print(f"wrote {out} ({os.path.getsize(out)/1024:.0f} KB)")
shutil.rmtree(stage)
