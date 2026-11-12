import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nav chrome guard — the sidebar-flicker fix, pinned structurally.
 *
 * The defect (owner report, 2026-11-12): switching tabs made the whole
 * sidebar refresh. The mechanism: the app chrome (`AppNav` — rail,
 * phone brand bar, phone tab bar) was rendered inside every page, and
 * the root remounts each page on navigation (the keyed crossfade
 * wrapper), so the rail was destroyed and recreated on every switch —
 * its mount animations replayed and its images were new DOM nodes.
 *
 * The fix mounts the chrome exactly once in the root layout
 * (`AppNavGate` in `src/routes/__root.tsx`) and retargeted the chrome's
 * geometry rules in the stylesheets so they no longer depend on an
 * `.app-shell` parent. These scans keep both halves from drifting back:
 * a page rendering its own `<AppNav />` again, or a chrome rule being
 * re-scoped under `.app-shell >`, reintroduces the flicker.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, keep: (name: string) => boolean, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith("_backup") || name === "node_modules") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, keep, out);
    /* Test files quote the patterns they guard against (this one included). */
    else if (keep(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const toRel = (p: string) => p.slice(SRC.length + 1).split(sep).join("/");

describe("Nav guard: the chrome is mounted once, by the root", () => {
  it("only HomeSidebar.tsx renders <AppNav /> (inside AppNavGate)", () => {
    const files = walk(SRC, (n) => /\.tsx$/.test(n));
    const offenders = files
      .filter((f) => /<AppNav[\s/>]/.test(readFileSync(f, "utf8")))
      .map(toRel)
      .filter((rel) => rel !== "components/home/HomeSidebar.tsx");
    expect(
      offenders,
      "a page rendering its own AppNav remounts the rail on every navigation — the flicker returns",
    ).toEqual([]);
  });

  it("the root layout renders the gate inside the app tree", () => {
    const root = readFileSync(join(SRC, "routes", "__root.tsx"), "utf8");
    expect(root).toContain("<AppNavGate />");
  });
});

describe("Nav guard: chrome geometry does not depend on an .app-shell parent", () => {
  it("no stylesheet scopes the chrome elements under .app-shell >", () => {
    const files = [
      ...walk(join(SRC, "styles"), (n) => n.endsWith(".css")),
      join(SRC, "styles.css"),
    ];
    const offenders: string[] = [];
    for (const f of files) {
      readFileSync(f, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/\.app-shell\s*>\s*[^,{]*(app-sidebar|app-mobile-bar|app-mobile-nav)/.test(line)) {
            offenders.push(`${toRel(f)}:${i + 1}`);
          }
        });
    }
    expect(
      offenders,
      "the root-mounted chrome has no .app-shell parent; rules scoped under it silently stop applying",
    ).toEqual([]);
  });
});
