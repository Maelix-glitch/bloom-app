import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The full-scale audit.
 *
 * Bug report: "the magic link wasn't sending, I can't save habits, it says it
 * can't load habits from my account, I can't do anything."
 *
 * All of it was one root cause with several faces. Bloom's Supabase client is
 * a Proxy that THROWS on property access when no project is configured — a
 * deliberate design so a missing env var doesn't blank-screen the app at
 * import time. But that only works if every call site is either guarded by
 * `hasSupabaseConfig` or wrapped in a try/catch.
 *
 * Several weren't. The worst pattern was:
 *
 *     void supabase.auth.getSession().then(...).catch(...)   // caught
 *     const { data } = supabase.auth.onAuthStateChange(...)  // NOT caught
 *
 * The `.catch` covers the promise; the next statement touches the Proxy
 * synchronously and throws, killing the whole effect. `loading` never cleared
 * and auth never resolved, so the page showed "couldn't load your habits"
 * indefinitely and nothing could be saved.
 *
 * These tests are structural: they read the source and fail if the dangerous
 * pattern comes back. A runtime test can't catch it, because it only shows up
 * in the specific case of a missing config.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    /* Superseded copies that aren't built or shipped. Prefix match, because
       these are dated (e.g. _backup-trackers-20260904-162359) — an exact
       "_backup" comparison silently scanned them. */
    if (name.startsWith("_backup") || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const FILES = walk(SRC).map((path) => ({
  path,
  rel: path.slice(SRC.length + 1),
  text: readFileSync(path, "utf8"),
}));

/** Files that legitimately touch the raw client. */
const CLIENT_MODULE = "lib/supabase.ts";

describe("onAuthStateChange is never called unguarded", () => {
  /*
   * The exact bug. onAuthStateChange runs synchronously, so it must be inside
   * watchAuth (which guards + try/catches) or behind an explicit config check.
   */
  const offenders = FILES.filter((f) => {
    if (f.rel === CLIENT_MODULE) return false;
    if (!f.text.includes("onAuthStateChange")) return false;
    return !f.text.includes("hasSupabaseConfig") && !f.text.includes("watchAuth");
  });

  it("has no unguarded subscribers", () => {
    expect(offenders.map((f) => f.rel)).toEqual([]);
  });
});

describe("every module touching supabase can survive no config", () => {
  const CALL = /\bsupabase\s*\.\s*(from|auth|rpc|storage|channel|removeChannel|functions)\b/;

  /*
   * Service modules reached only after a session exists. A session is
   * impossible without a configured project, so these are protected by
   * unreachability rather than by a branch — adding a `hasSupabaseConfig`
   * check inside them would be dead code that implies a case that can't occur.
   *
   * The allowance is deliberately a short, named list: anything NEW that calls
   * Supabase has to either guard itself or be consciously added here, which is
   * the decision point this test exists to force.
   */
  const SESSION_ONLY = [
    "lib/cycle/storage.ts",
    "lib/profile/profileService.ts",
    "lib/profile/storyService.ts",
  ];

  const offenders = FILES.filter((f) => {
    if (f.rel === CLIENT_MODULE) return false;
    if (SESSION_ONLY.includes(f.rel)) return false;
    if (!CALL.test(f.text)) return false;
    /* Any of these means the author thought about the unconfigured case. */
    const guarded =
      f.text.includes("hasSupabaseConfig") ||
      f.text.includes("watchAuth") ||
      f.text.includes("trySupabase") ||
      /hasHabitCloud|hasCycleCloud|hasTrackerCloud|hasPeriodCloud|cloudReady/.test(f.text) ||
      f.text.includes("try {");
    return !guarded;
  });

  it("lists no unprotected modules", () => {
    expect(offenders.map((f) => f.rel)).toEqual([]);
  });

  it("the session-only allowance is still accurate", () => {
    /*
     * If one of these ever gains its own auth subscription it stops being
     * "only reachable when signed in" and the allowance becomes a hole.
     */
    for (const rel of SESSION_ONLY) {
      const f = FILES.find((x) => x.rel === rel);
      expect(f, `${rel} is listed but missing — update SESSION_ONLY`).toBeDefined();
      expect(f!.text, rel).not.toContain("onAuthStateChange");
    }
  });
});

describe("awaited auth actions resolve their UI state", () => {
  /*
   * The magic-link failure mode: an await with no try/catch leaves the
   * "sending" state set forever when the promise rejects. The button spins
   * and the person is told nothing.
   */
  it("SignedOutProfile always leaves the sending state", () => {
    const f = FILES.find((x) => x.rel.endsWith("SignedOutProfile.tsx"));
    expect(f, "SignedOutProfile.tsx not found").toBeDefined();
    const text = f!.text;
    expect(text).toMatch(/setState\("sending"\)/);
    /* There must be a catch that resolves the state. */
    expect(text).toMatch(/catch[\s\S]{0,400}setState\("failed"\)/);
  });

  it("sendMagicLink checks for a project before calling out", () => {
    const f = FILES.find((x) => x.rel.endsWith("useProfileSpace.ts"))!;
    const fn = f.text.slice(f.text.indexOf("const sendMagicLink"));
    const body = fn.slice(0, fn.indexOf("}, []);"));
    expect(body).toMatch(/hasSupabaseConfig/);
    expect(body).toMatch(/try\s*{/);
  });
});

describe("the auth session storage key", () => {
  const client = readFileSync(join(SRC, "lib/supabase.ts"), "utf8");

  it("is derived from the project URL, not hardcoded", () => {
    /*
     * A hardcoded project ref means pointing Bloom at a different Supabase
     * project stores the session under the OLD project's key — sessions look
     * like they vanish, and two projects fight over one slot.
     */
    expect(client).not.toMatch(/storageKey:\s*"sb-[a-z]{15,}-auth-token"/);
    expect(client).toMatch(/storageKey:\s*`sb-\$\{projectRef/);
  });
});

describe("the person is told when there's no database", () => {
  it("exposes a readable reason", () => {
    const client = readFileSync(join(SRC, "lib/supabase.ts"), "utf8");
    expect(client).toMatch(/export function supabaseConfigProblem/);
  });

  it("mounts a notice at the root", () => {
    const root = FILES.find((f) => f.rel === "routes/__root.tsx")!;
    expect(root.text).toContain("ConnectionNotice");
  });
});

describe("schema coverage", () => {
  /*
   * "Can't load habits from my account" would also be the symptom of a table
   * the code reads but no migration creates. Checked here so the two causes
   * can be told apart.
   */
  const MIGRATIONS = join(process.cwd(), "supabase/migrations");

  it("every table the code queries has a migration", () => {
    const used = new Set<string>();
    for (const f of FILES) {
      for (const m of f.text.matchAll(/\.from\("([a-z_]+)"\)/g)) used.add(m[1]!);
    }
    const sql = readdirSync(MIGRATIONS)
      .filter((n) => n.endsWith(".sql"))
      .map((n) => readFileSync(join(MIGRATIONS, n), "utf8"))
      .join("\n")
      .toLowerCase();

    const missing = [...used].filter(
      (t) => !sql.includes(`create table if not exists public.${t}`) && !sql.includes(`create table public.${t}`),
    );
    expect(missing).toEqual([]);
  });
});
