import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Viewport guard — the zoom lock (owner directive, 2026-11-23).
 *
 * Bloom is an app, not a document: pinch/page zoom only ever strands the
 * layout. The field report that forced this: on a phone running Brave,
 * the whole app rendered shrunk into the left ~40% of the screen — the
 * browser was holding the page at a wide layout width, scaled down —
 * while the served meta asked only for width=device-width. The lock
 * (minimum-scale + maximum-scale + user-scalable=no) pins the initial
 * scale so a remembered per-site zoom cannot reopen the trap.
 *
 * This guard pins the exact locked viewport string in BOTH places a
 * viewport meta is emitted (the root route head and the static error
 * page), and fails if any other source file grows a viewport meta that
 * lacks the lock — a second, unlocked meta would silently win on the
 * surfaces that use it.
 */

const SRC = join(process.cwd(), "src");
const read = (rel: string) => readFileSync(join(SRC, rel), "utf8");

const LOCKED_VIEWPORT =
  "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("viewport guard: the app viewport is zoom-locked", () => {
  it("the root route head emits the locked viewport", () => {
    expect(read("routes/__root.tsx")).toContain(LOCKED_VIEWPORT);
  });

  it("the static error page emits the locked viewport", () => {
    expect(read("lib/error-page.ts")).toContain(LOCKED_VIEWPORT);
  });

  it("no source file emits a viewport meta without the lock", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      if (file.endsWith("viewport.guard.test.ts")) continue;
      const text = readFileSync(file, "utf8");
      // Every viewport meta in the codebase, in either spelling
      // (JSX head object or raw HTML string).
      const metas = text.match(
        /(name:\s*"viewport"|name="viewport")[^}]{0,700}/g,
      );
      if (!metas) continue;
      for (const meta of metas) {
        if (!meta.includes("maximum-scale=1") || !meta.includes("user-scalable=no")) {
          offenders.push(`${file.replace(`${SRC}/`, "src/")}: ${meta.slice(0, 80)}…`);
        }
      }
    }
    expect(
      offenders,
      `an unlocked viewport meta lets a browser strand the layout again: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
