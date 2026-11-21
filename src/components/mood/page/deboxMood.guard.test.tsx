import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Mood de-box guards (M-180):
 *
 *   1. .mp-panel wears the tonal system (solid surface, --border-subtle
 *      rim, specular shadow) and no longer references the glass
 *      material tokens — glass stays in its ruled places.
 *   2. The quick insights render without their old card classes
 *      (border / bg-card) in MoodPage.tsx, and mood.css separates the
 *      rows with the shared hairline token.
 */

const SRC = join(process.cwd(), "src");
const STYLES = readFileSync(join(SRC, "styles.css"), "utf8");
const MOOD = readFileSync(join(SRC, "styles/mood.css"), "utf8");
const PAGE = readFileSync(join(SRC, "components/mood/page/MoodPage.tsx"), "utf8");

describe("mood de-box (M-180)", () => {
  it(".mp-panel is tonal, not glass", () => {
    const m = STYLES.match(/\.mp-panel \{([^}]*)\}/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain("border: 1px solid var(--border-subtle);");
    expect(m![1]).toContain("box-shadow: var(--dbx-specular);");
    expect(m![1]).not.toContain("--glass-");
  });

  it("insights are hairline rows, not nested cards", () => {
    expect(PAGE).toContain('className="mm-insights mt-10"');
    expect(PAGE).not.toContain("bg-card/70");
    const marker = MOOD.indexOf("De-box (M-180");
    expect(marker).toBeGreaterThan(0);
    expect(MOOD.slice(marker)).toContain(
      ".mm-insights > li + li {\n  border-top: 1px solid var(--dbx-hairline);",
    );
  });
});
