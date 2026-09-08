import { describe, expect, it } from "vitest";

/**
 * The reveal logic from useTypewriter, extracted as pure functions so it can be
 * tested without a DOM. The hook wires these to requestAnimationFrame; the
 * arithmetic is what actually breaks.
 */

const TARGET_MS = 1400;
const MAX_MS_PER_WORD = 55;
const MIN_MS_PER_WORD = 12;

/** Flatten paragraphs into words tagged with their paragraph index. */
function flatten(full: string[]): { word: string; para: number }[] {
  const flat: { word: string; para: number }[] = [];
  full.forEach((p, para) => {
    for (const word of p.split(/(\s+)/)) {
      if (word !== "") flat.push({ word, para });
    }
  });
  return flat;
}

function pace(wordCount: number): number {
  return Math.min(MAX_MS_PER_WORD, Math.max(MIN_MS_PER_WORD, TARGET_MS / wordCount));
}

/** Rebuild the visible paragraphs after `count` words. */
function revealed(full: string[], count: number): string[] {
  const flat = flatten(full);
  const out: string[] = full.map(() => "");
  for (let i = 0; i < Math.min(count, flat.length); i += 1) {
    const w = flat[i]!;
    out[w.para] += w.word;
  }
  while (out.length > 0 && out[out.length - 1]!.trim() === "") out.pop();
  return out;
}

describe("flatten", () => {
  it("keeps whitespace as its own token so text rebuilds exactly", () => {
    const full = ["one two", "three four"];
    const joined = flatten(full)
      .filter((w) => w.para === 0)
      .map((w) => w.word)
      .join("");
    expect(joined).toBe("one two");
  });

  it("tags each word with its paragraph", () => {
    const flat = flatten(["a b", "c"]);
    expect(flat.filter((w) => w.para === 1).map((w) => w.word)).toEqual(["c"]);
  });

  it("handles an empty paragraph without producing phantom words", () => {
    expect(flatten([""])).toEqual([]);
  });
});

describe("pace", () => {
  it("keeps short answers readable rather than instant", () => {
    /* five words would be 280ms each uncapped — clamped to the max */
    expect(pace(5)).toBe(MAX_MS_PER_WORD);
  });

  it("speeds up for long answers so they still finish promptly", () => {
    const long = pace(400);
    expect(long).toBe(MIN_MS_PER_WORD);
    /* 400 words at the floor is ~4.8s, not the 22s a fixed rate would give */
    expect(400 * long).toBeLessThan(6000);
  });

  it("hits roughly the target for a mid-length answer", () => {
    const words = 60;
    const total = words * pace(words);
    expect(total).toBeGreaterThan(1000);
    expect(total).toBeLessThan(3600);
  });

  it("never returns a non-positive interval", () => {
    for (const n of [1, 2, 10, 1000, 10000]) {
      expect(pace(n)).toBeGreaterThan(0);
    }
  });
});

describe("revealed", () => {
  const full = ["First para here.", "Second one."];

  it("shows nothing at the start", () => {
    expect(revealed(full, 0)).toEqual([]);
  });

  it("builds up in order", () => {
    expect(revealed(full, 1)[0]).toBe("First");
    expect(revealed(full, 3)[0]).toBe("First para");
  });

  it("does not show a later paragraph before an earlier one is done", () => {
    const out = revealed(full, 3);
    expect(out).toHaveLength(1);
  });

  it("reconstructs the original text exactly when complete", () => {
    expect(revealed(full, 9999)).toEqual(full);
  });

  it("is stable — the same count always gives the same output", () => {
    expect(revealed(full, 4)).toEqual(revealed(full, 4));
  });

  it("survives paragraphs with awkward spacing", () => {
    const odd = ["  leading and   inner  ", "next"];
    expect(revealed(odd, 9999)).toEqual(odd);
  });
});
