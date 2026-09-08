#!/usr/bin/env python3
"""
Builds docs/polish/bloom-polish.zip — the premium-polish pass.

Covers everything since the Tier B part 2 slim kit (00dcc24):

  · voice / rotating copy, app-wide sound, motion primitives
  · premium cycle palette + wording, popup edges, preset avatars
  · onboarding gate (welcome flow) and cycle visibility for opted-out users
  · the coach rebuilt: breadth, brevity, edge function, progressive reveal
  · the tab-change flicker / remount lag / mood image pinch fixes
  · "Launch as admin" rebuilt as a real launcher

Same contract as the Tier B2 slim kit: whole files, not patches, so every
install can be verified by md5; refuses to run unless the tree is already at
the previous kit; keeps a __BEFORE__ copy of anything you edited yourself.

  python3 docs/polish/make-kit.py
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
OUT_DIR = os.path.join(REPO, "docs", "polish")
KIT_NAME = "bloom-polish"

# The commit the Tier B part 2 slim kit produced — the state this kit expects.
PREV = "00dcc24"
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
print(f"polish kit: {prev[:7]} -> {short}")

# ------------------------------------------------ exactly this pass's files
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

# For a changed file, the previous kit's version is the expected "before" —
# so a tree that is exactly at the last kit reports no phantom local edits.
known_before = {}
for path in install:
    if path in added:
        continue
    before = md5_text(git("show", f"{prev}:{path}", binary=True))
    now = md5_text(git("show", f"{tip}:{path}", binary=True))
    if before != now:
        known_before[path] = [before]

# ---------------------------------------------------------------- stage files
stage = tempfile.mkdtemp(prefix="polish-")
root = os.path.join(stage, KIT_NAME)
files_dir = os.path.join(root, "files")
os.makedirs(files_dir)
for path in install:
    dst = os.path.join(files_dir, path)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with open(dst, "wb") as f:
        f.write(git("show", f"{tip}:{path}", binary=True))

# What must already be present for these files to make sense. Chosen to be
# things the *previous* kits added that this pass's files import or extend.
PREREQS = [
    ["src/lib/prefs.ts", "export function setPref", "synced prefs document"],
    ["src/lib/cycle/periodStore.ts", "export function effectiveMode", "cycle mode"],
    ["src/components/ui/bloom-sheet.tsx", "BloomSheet", "premium sheet primitive"],
    ["src/lib/data/erase.ts", "eraseEverything", "Tier B2 · erase"],
    ["src/lib/reminders/schedule.ts", "dueReminders", "Tier B2 · reminders"],
    ["src/lib/coach/responder.ts", "export function answer", "coach responder"],
    ["src/components/coach/CoachPage.tsx", "CoachPage", "coach page"],
    ["src/components/mood/page/MoodPage.tsx", "mm-hero-img", "mood page"],
    ["src/hooks/useRailIdentity.ts", "useRailIdentity", "sidebar identity"],
]

# Every one of these is a string that only exists if this pass applied.
CHECKS = [
    # voice + sound + motion
    ["src/lib/voice/messages.ts", "export function pick", "Voice · rotation core"],
    ["src/lib/voice/copy.ts", "saidSaved", "Voice · shared phrases"],
    ["src/lib/home/today.ts", "greeting(part", "Voice · rotating greeting"],
    ["src/lib/sound/sound.ts", "export function play", "Sound · engine"],
    ["src/hooks/useAmbientSound.ts", "SILENT_ROUTES", "Sound · delegated listener, Rewards silent"],
    ["src/routes/__root.tsx", "useAmbientSound", "Sound · wired at the root"],
    ["src/styles/motion.css", "bm-press", "Motion · primitives"],
    ["src/styles.css", "motion.css", "Motion · imported"],
    # cycle
    ["src/styles/cycle2.css", "#a58bff", "Cycle · nocturne palette"],
    ["src/lib/cycle/themes.ts", "#a58bff", "Cycle · palette mirrored in TS"],
    ["src/hooks/useCycleVisible.ts", "optedOut", "Cycle · visibility model"],
    ["src/components/ci/CycleNotYours.tsx", "CycleNotYours", "Cycle · invitation page"],
    # profile + popups
    ["src/lib/profile/presetAvatars.ts", "preset:", "Profile · preset avatars"],
    ["src/components/profile/PresetPicker.tsx", "PresetPicker", "Profile · avatar picker"],
    ["src/styles/bloom-sheet.css", "bmoment-hero-art", "Popups · finished edges"],
    # onboarding + admin
    ["src/components/welcome/Welcome.tsx", "Launch as admin", "Welcome · onboarding flow"],
    ["src/components/welcome/WelcomeGate.tsx", "needsWelcome", "Welcome · gate"],
    ["src/lib/onboarding/profileKind.ts", "export const isAdmin", "Admin · mode flag"],
    ["src/lib/onboarding/adminTargets.ts", "ADMIN_TARGETS", "Admin · launcher targets"],
    ["src/components/welcome/AdminPanel.tsx", "Admin launcher", "Admin · launcher panel"],
    ["src/components/welcome/AdminBar.tsx", "adm-bar", "Admin · exit bar"],
    ["src/routes/__root.tsx", "AdminBar", "Admin · bar mounted"],
    ["src/styles/admin-panel.css", "adm-panel", "Admin · styles"],
    # coach
    ["src/lib/coach/topics.ts", "appHelp", "Coach · 30 topics"],
    ["src/lib/coach/brevity.ts", "fitToBudget", "Coach · answer length"],
    ["src/lib/coach/edge.ts", "askEdge", "Coach · edge client"],
    ["src/lib/coach/engine.ts", "export async function ask", "Coach · engine"],
    ["src/lib/coach/providers.ts", "PROVIDERS", "Coach · pluggable providers"],
    ["src/hooks/useCoachSystem.ts", "askCoach", "Coach · engine wired to the UI"],
    ["src/hooks/useTypewriter.ts", "useTypewriter", "Coach · progressive reveal"],
    ["src/components/coach/ProviderPicker.tsx", "ProviderPicker", "Coach · model picker"],
    ["src/components/coach/CoachPage.tsx", "QUICK_PROMPT_POOL", "Coach · wider prompts"],
    ["src/lib/coach/knowledge.ts", "export const KNOWLEDGE", "Coach · knowledge base (25 subjects)"],
    ["src/lib/coach/compose.ts", "export function compose", "Coach · answer composer"],
    ["src/lib/coach/engine.ts", "export function isGrounded", "Coach · no more empty-record refusal"],
    ["src/lib/coach/breadth.test.ts", "breadth", "Coach · breadth regression tests"],
    ["supabase/functions/coach/index.ts", "COACH_MODEL", "Coach · edge function"],
    # the three bug fixes
    ["src/lib/prefsStore.ts", "useSyncExternalStore", "Fix · no flicker on tab change"],
    ["src/hooks/useOnboarding.ts", "usePrefValue", "Fix · onboarding reads the cache"],
    ["src/hooks/useCycleMode.ts", "useSyncExternalStore", "Fix · cycle mode reads the cache"],
    ["src/hooks/useRailIdentity.ts", "cachedIdentity", "Fix · rail identity cached"],
    ["src/styles/mood-motion.css", "scale(1.06)", "Fix · mood image pinch"],
]

script = r'''#!/usr/bin/env node
/**
 * Bloom — premium polish pass (__COUNT__ files, branch tip __SHORT__)
 *
 * Everything since the Tier B part 2 kit:
 *   · rotating copy, app-wide sound, motion primitives
 *   · premium cycle palette + wording, finished popup edges, preset avatars
 *   · the welcome/onboarding gate, cycle hidden for people who don't track one
 *   · the coach rebuilt — 30 topics, answer length matched to the question,
 *     your Supabase edge function, model picker, progressive reveal
 *   · fixes: tab-change flicker, remount lag, the mood image pinch
 *   · "Launch as admin" rebuilt as a real launcher
 *
 * Assumes your checkout is ALREADY at the Tier B part 2 kit. It checks that
 * first and stops without writing anything if something is missing.
 *
 * Idempotent: files that already match are skipped, and a file you edited
 * yourself is copied to <name>__BEFORE__ before being replaced.
 *
 * Run from anywhere:  node "<path to this folder>\apply-polish.mjs" [repo path]
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

console.log(`\nBloom \u2014 premium polish (__COUNT__ files) \u2192 ${repo}\n`);

/* 0. is this the repo? */
if (!fs.existsSync(path.join(repo, "package.json")) || !fs.existsSync(path.join(repo, "src/routes"))) {
  console.error("This doesn't look like the Bloom repo (no package.json + src/routes). Pass the repo path as an argument.");
  process.exit(1);
}

/* 1. is it new enough? these files build on the earlier tiers */
console.log("Checking your checkout is at the Tier B part 2 kit:");
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
${missing} thing(s) from the earlier kits are missing, so this kit would leave
the app broken \u2014 these files import them.

Apply bloom-tier-b2-slim.zip first, then run this one. Nothing has been written.`);
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

/* 3. verify */
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
  1. Stop the dev server, then: npm run dev   \u2014 hard-refresh once (Ctrl+F5)
  2. No new migrations. No new packages.
  3. Optional: npx vitest run   (368 tests / 30 files)

  Seeing it:
    \u00b7 Welcome flow \u2014 it runs on first load. To see it again later:
      the amber "Admin" bar (bottom-left) \u2192 Exit.
    \u00b7 Launch as admin \u2014 top-right of the welcome flow. Opens a launcher;
      type to filter, arrows to move, enter to go. It reaches the design
      pages nothing links to (/cycle-styles, /trackers-styles, ...).
    \u00b7 Coach \u2014 answers now reveal as they're read, and the model picker
      sits beside the ready/thinking pill. Add your key with:
        supabase functions deploy coach
        supabase secrets set OPENAI_API_KEY=...
      Without it the coach still answers, on-device.
    \u00b7 Cycle \u2014 new palette. Profile \u2192 Your Bloom to hide it entirely.
    \u00b7 Sound \u2014 on by default, and silent on Rewards as you asked.

  To remove it all again: git checkout -- . (if committed: git revert).
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
with open(os.path.join(root, "apply-polish.mjs"), "w", newline="\n") as f:
    f.write(script)

# A check that passes vacuously is worse than no check — prove each needle is
# really in the file this kit ships before shipping it.
for rel, needle, label in CHECKS:
    p = os.path.join(files_dir, rel)
    assert os.path.exists(p), f"CHECK names a file the kit doesn't ship: {rel}"
    with open(p, "rb") as f:
        assert needle in f.read().decode("utf-8", errors="replace"), f"check fails on tip: {label}"

readme = os.path.join(OUT_DIR, "README.md")
if os.path.exists(readme):
    shutil.copy(readme, os.path.join(root, "README.md"))

out = os.path.join(OUT_DIR, f"{KIT_NAME}.zip")
if os.path.exists(out):
    os.remove(out)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for base, _dirs, names in os.walk(root):
        for name in sorted(names):
            full = os.path.join(base, name)
            z.write(full, os.path.relpath(full, stage))

shutil.rmtree(stage)
size = os.path.getsize(out)
print(f"wrote {os.path.relpath(out, REPO)}  ({size:,} B)")
print(f"md5 {hashlib.md5(open(out, 'rb').read()).hexdigest()}")
