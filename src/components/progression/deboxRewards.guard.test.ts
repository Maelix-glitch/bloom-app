import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Rewards de-box guards (M-178). Pinned against the M-178 block at the
 * end of progression.css:
 *
 *   1. The points history wears no frame: no border, no radius, no
 *      background, no clipping.
 *   2. The last history row carries no hairline (dividers live inside
 *      the group only).
 *   3. The block does not touch the sanctioned objects: the rank path
 *      (.pg-path), the medallions (.pg-ach) and the crest plates
 *      (.pg-hall-item) keep their treatments.
 */

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "styles/progression.css"), "utf8");

const marker = CSS.indexOf("De-box (M-178");
const BLOCK = marker >= 0 ? CSS.slice(marker) : "";

describe("rewards de-box (M-178)", () => {
  it("the M-178 block exists at the cascade end", () => {
    expect(marker).toBeGreaterThan(0);
  });

  it("the points history is an open list, not a framed box", () => {
    const h = BLOCK.match(/\.pg-history \{([^}]*)\}/);
    expect(h).not.toBeNull();
    expect(h![1]).toContain("border: none;");
    expect(h![1]).toContain("background: transparent;");
    expect(h![1]).toContain("border-radius: 0;");
  });

  it("no hairline under the last history row", () => {
    expect(BLOCK).toContain(".pg-history-row:last-child");
    expect(BLOCK).toContain("border-bottom: none;");
  });

  it("sanctioned objects are untouched by the block", () => {
    expect(BLOCK).not.toContain(".pg-path");
    expect(BLOCK).not.toContain(".pg-ach");
    expect(BLOCK).not.toContain(".pg-hall-item");
  });
});
