#!/usr/bin/env node
/**
 * Bloom — repository cleanup.
 *
 * Removes files that are genuinely dead: superseded backups, delivery notes
 * from finished work, old screenshots, and previous release kits. Everything
 * listed here was checked against the source before being included — see the
 * `why` on each entry.
 *
 * It is deliberately cautious in three ways:
 *
 *   1. **Dry run by default.** It prints what it would do and changes nothing
 *      unless you pass --apply. Destructive tools should make you say yes.
 *   2. **It verifies before it deletes.** Several targets sit next to things
 *      that ARE in use — public/bloom/icons/ is referenced by the manifest and
 *      by notifications, public/rewards/medals/ by the rewards admin. The
 *      script re-checks those references at runtime and refuses to run if the
 *      assumption no longer holds.
 *   3. **It respects git.** With a dirty tree it warns, because `git checkout`
 *      is your undo and that only works for committed files.
 *
 * Usage:
 *   node scripts/clean.mjs              # show what would go
 *   node scripts/clean.mjs --apply      # actually delete
 *   node scripts/clean.mjs --apply --keep-kits   # delete, but keep docs/ zips
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const KEEP_KITS = process.argv.includes("--keep-kits");

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  amber: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/* -------------------------------------------------------------------------- */
/*  What goes, and why                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Each entry: the path, why it's dead, and its group.
 * Groups let you skip a category without editing the file.
 */
const TARGETS = [
  /* --- superseded source ------------------------------------------------- */
  {
    p: "src/_backup-trackers-20260904-162359",
    why: "A dated snapshot of the trackers page. Nothing imports it; it isn't built or tested.",
    group: "backups",
  },

  /* --- the old static site ----------------------------------------------- */
  /*
   * public/bloom/ is the ORIGINAL Bloom: nine hand-written HTML pages with
   * their own auth.js carrying hardcoded Supabase credentials. It is fully
   * superseded by the React app and is the reason it's possible to open the
   * wrong app on the wrong port and think the build is broken.
   *
   * BUT public/bloom/icons/ is live — the manifest, the apple-touch-icon and
   * notification icons all point at it. So the HTML and JS go and the icons
   * stay. The verify step below enforces exactly that.
   */
  { p: "public/bloom/index.html", why: "Old static site, replaced by the React app.", group: "legacy-site" },
  { p: "public/bloom/coach.html", why: "Old static site.", group: "legacy-site" },
  { p: "public/bloom/cycle.html", why: "Old static site.", group: "legacy-site" },
  { p: "public/bloom/mood.html", why: "Old static site.", group: "legacy-site" },
  { p: "public/bloom/rewards.html", why: "Old static site.", group: "legacy-site" },
  { p: "public/bloom/trackers.html", why: "Old static site.", group: "legacy-site" },
  { p: "public/bloom/dashboard.html", why: "Old static site.", group: "legacy-site" },
  {
    p: "public/bloom/bloom-add-habit-modal-v3.html",
    why: "Superseded by bloom-add-habit-modal-v3-latest.html, which the React port documents.",
    group: "legacy-site",
  },
  { p: "public/bloom/js", why: "Old site's scripts — includes auth.js with hardcoded keys.", group: "legacy-site" },
  { p: "public/bloom/css", why: "Old site's stylesheets.", group: "legacy-site" },
  { p: "public/bloom/fix-nav.js", why: "Patch script for the old site's nav.", group: "legacy-site" },
  { p: "public/bloom/shared-bloom-header.js", why: "Old site's shared header.", group: "legacy-site" },
  { p: "public/bloom/service-worker.js", why: "Old site's worker. The app uses public/sw.js.", group: "legacy-site" },
  { p: "public/bloom/manifest.json", why: "Old site's manifest. The app uses public/manifest.webmanifest.", group: "legacy-site" },
  { p: "public/bloom/capacitor.config.json", why: "Abandoned Capacitor wrapper config.", group: "legacy-site" },
  { p: "public/bloom/README.md", why: "Docs for the old static site.", group: "legacy-site" },
  { p: "public/bloom/SETUP_SUPABASE.md", why: "Setup notes for the old site; .env.example covers this now.", group: "legacy-site" },
  { p: "public/demo/seed.html", why: "A one-off seeding page; nothing links to it.", group: "legacy-site" },

  /* --- delivery notes from finished work --------------------------------- */
  /*
   * Status reports for work that shipped months ago. They describe states the
   * code is no longer in, which makes them worse than nothing — a future
   * reader trusts them. README.md and AGENTS.md stay.
   */
  { p: "COMPLETE_DELIVERY.md", why: "Status report for finished work.", group: "stale-docs" },
  { p: "FINAL_TESTING.md", why: "Status report for finished work.", group: "stale-docs" },
  { p: "IMPLEMENTATION_CHECKLIST.md", why: "Checklist for finished work.", group: "stale-docs" },
  { p: "PROJECT_COMPLETE.md", why: "Status report for finished work.", group: "stale-docs" },
  { p: "QUICK_START.md", why: "Superseded by README.md and .env.example.", group: "stale-docs" },
  { p: "README_TRACKERS.md", why: "Notes for a single feature, long since shipped.", group: "stale-docs" },
  { p: "TRACKERS_FIX_SUMMARY.md", why: "Fix summary for finished work.", group: "stale-docs" },
  { p: "WORK_COMPLETED.md", why: "Status report for finished work.", group: "stale-docs" },

  /* --- old delivery kits and their screenshots --------------------------- */
  /*
   * ~40MB, and the single biggest thing in the repo. Every kit is a snapshot
   * of a past release; the code they installed is already in the tree and the
   * history has it all. docs/polish/ is kept — it's the current one.
   */
  { p: "docs/today-home", why: "Old kit + 19MB of screenshots.", group: "old-kits" },
  { p: "docs/add-habit-modal", why: "Old kit + 5MB of screenshots.", group: "old-kits" },
  { p: "docs/mood-page", why: "Old kit + 4MB of screenshots.", group: "old-kits" },
  { p: "docs/metrics-modal-issue", why: "Old kit + screenshots.", group: "old-kits" },
  { p: "docs/cycle-loopholes", why: "Old kit + screenshots.", group: "old-kits" },
  { p: "docs/mood-fixes", why: "Old kit.", group: "old-kits" },
  { p: "docs/tier-a", why: "Old kit (Tier A).", group: "old-kits" },
  { p: "docs/tier-b-c", why: "Old kit (Tier B/C).", group: "old-kits" },
  { p: "docs/tier-b2", why: "Old kit (Tier B part 2), superseded by docs/polish.", group: "old-kits" },
  { p: "docs/audit", why: "Notes from a past audit.", group: "old-kits" },

  /* --- build junk --------------------------------------------------------- */
  { p: ".output", why: "Build output. Regenerated by npm run build.", group: "build" },
  { p: ".wrangler", why: "Cloudflare build artifacts.", group: "build" },
  { p: ".tanstack", why: "Framework cache.", group: "build" },
  { p: ".shots", why: "Screenshot scratch directory.", group: "build" },
];

/**
 * Things that LOOK like clutter but are load-bearing. Listed so nobody
 * "tidies" them later, and asserted below so the list can't rot.
 */
/*
 * `required: true` means the app genuinely depends on it, so its absence is a
 * sign the repo isn't what this script expects and we should stop.
 *
 * Everything else is merely "don't delete this if you have it". Delivery
 * folders and working notes fall here: the kits deliberately exclude docs/,
 * so a checkout that was updated via a kit will not have docs/polish at all.
 * Treating that as fatal was wrong — it blocked the script on a perfectly
 * healthy repo.
 */
const KEEP = [
  ["public/bloom/icons", "PWA + notification icons. Referenced by the manifest and useReminders.", { required: true }],
  ["public/bloom/bloom-add-habit-modal-v3-latest.html", "The reference the React AddHabitModal was ported from; its CSS is quoted in add-habit-modal.css.", { required: true }],
  ["public/rewards/medals", "30 medal images used by the rewards admin.", { required: true }],
  ["public/manifest.webmanifest", "The app's real manifest.", { required: true }],
  ["public/sw.js", "The app's real service worker.", { required: true }],
  ["public/favicon.ico", "Favicon.", { required: true }],
  ["public/robots.txt", "Crawler rules."],
  ["docs/polish", "The current delivery kit, if you have one."],
  ["README.md", "The repo's readme."],
  ["AGENTS.md", "Working notes for agents on this repo."],
  [".env.example", "Template for the Supabase config."],
];

/* -------------------------------------------------------------------------- */
/*  Safety checks                                                              */
/* -------------------------------------------------------------------------- */

const exists = (rel) => fs.existsSync(path.join(REPO, rel));
const read = (rel) => {
  try {
    return fs.readFileSync(path.join(REPO, rel), "utf8");
  } catch {
    return "";
  }
};

/**
 * Re-check the assumptions this list is built on. If the app has changed since
 * the list was written, stop rather than delete something now in use.
 */
function verify() {
  const problems = [];

  /* The icons must still be the ones the app points at. */
  const manifest = read("public/manifest.webmanifest") + read("src/hooks/useReminders.ts") + read("src/routes/__root.tsx");
  if (manifest.includes("/bloom/icons/") && !exists("public/bloom/icons")) {
    problems.push("public/bloom/icons is referenced but already missing — do not run this.");
  }

  /* Nothing in src may import the backup dir. */
  const backupRefs = grepSrc(/from\s+["'][^"']*_backup/);
  if (backupRefs.length > 0) {
    problems.push(`src imports from a _backup dir: ${backupRefs.join(", ")}`);
  }

  /* The old site's HTML must not be linked from the React app. */
  const htmlRefs = grepSrc(/["']\/bloom\/(index|coach|cycle|mood|rewards|trackers|dashboard)\.html/);
  const live = htmlRefs.filter((f) => !f.includes("_backup"));
  if (live.length > 0) {
    /*
     * BloomHeader compares against a legacy path for highlighting. That's a
     * dead comparison once the page is gone, not a load-bearing link — but
     * it should be reported so it can be cleaned up.
     */
    console.log(c.amber(`\n  note: these still mention an old .html page (harmless, but worth tidying):`));
    for (const f of live) console.log(c.dim(`        ${f}`));
  }

  /*
   * Only the load-bearing entries are fatal. A missing optional entry just
   * means you don't have that folder, which is normal.
   */
  for (const [p, , opts] of KEEP) {
    if (opts?.required && !exists(p)) {
      problems.push(`something the app needs is already missing: ${p}`);
    }
  }

  return problems;
}

/** Grep the source tree (excluding backups) for a pattern. */
function grepSrc(re) {
  const hits = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === "node_modules") continue;
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|jsx|json|webmanifest)$/.test(name)) {
        if (re.test(fs.readFileSync(full, "utf8"))) hits.push(path.relative(REPO, full));
      }
    }
  };
  walk(path.join(REPO, "src"));
  return hits;
}

function dirSize(rel) {
  const full = path.join(REPO, rel);
  let total = 0;
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const n of fs.readdirSync(p)) walk(path.join(p, n));
    else total += st.size;
  };
  try {
    walk(full);
  } catch {
    return 0;
  }
  return total;
}

const human = (n) =>
  n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

/* -------------------------------------------------------------------------- */
/*  Run                                                                        */
/* -------------------------------------------------------------------------- */

console.log(c.bold(`\nBloom cleanup ${APPLY ? c.red("— APPLYING") : c.dim("— dry run")}\n`));

/* Is the tree clean? git is the undo button. */
let dirty = false;
try {
  dirty = execSync("git status --porcelain", { cwd: REPO }).toString().trim().length > 0;
} catch {
  /* not a git repo — the warning below still applies */
}
if (dirty && APPLY) {
  console.log(
    c.amber("  ! You have uncommitted changes. Commit them first — `git checkout` is your undo\n" +
            "    and it only restores committed files.\n"),
  );
}

const problems = verify();
if (problems.length > 0) {
  console.error(c.red("\nStopping — the repo doesn't match this script's assumptions:\n"));
  for (const p of problems) console.error(c.red(`  • ${p}`));
  console.error("\nNothing was deleted.\n");
  process.exit(1);
}

const groups = KEEP_KITS ? new Set(["backups", "legacy-site", "stale-docs", "build"]) : null;

let freed = 0;
let count = 0;
let lastGroup = "";
for (const t of TARGETS) {
  if (groups && !groups.has(t.group)) continue;
  if (!exists(t.p)) continue;

  if (t.group !== lastGroup) {
    console.log(c.bold(`\n  ${t.group}`));
    lastGroup = t.group;
  }

  const size = dirSize(t.p);
  freed += size;
  count += 1;
  console.log(`  ${APPLY ? c.red("✗") : c.dim("·")} ${t.p} ${c.dim(`(${human(size)})`)}`);
  console.log(c.dim(`      ${t.why}`));

  if (APPLY) fs.rmSync(path.join(REPO, t.p), { recursive: true, force: true });
}

console.log(c.bold(`\n  kept (in use — do not remove)`));
for (const [p, why] of KEEP) {
  if (!exists(p)) continue;
  console.log(`  ${c.green("✓")} ${p}\n${c.dim(`      ${why}`)}`);
}

console.log(
  c.bold(`\n${APPLY ? "Removed" : "Would remove"} ${count} item(s), ${human(freed)}.\n`),
);

if (!APPLY) {
  console.log(`  Run it for real:   ${c.bold("node scripts/clean.mjs --apply")}`);
  console.log(`  Keep the old kits: ${c.bold("node scripts/clean.mjs --apply --keep-kits")}\n`);
} else {
  console.log(`  Check it still works:  ${c.bold("npm run dev")}  and  ${c.bold("npx vitest run")}`);
  console.log(`  Undo everything:       ${c.bold("git checkout -- .")}\n`);
}
