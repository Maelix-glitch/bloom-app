import { describe, expect, it } from "vitest";

import { parseSidecars } from "./sidecar";

describe("parseSidecars", () => {
  it("leaves plain prose untouched", () => {
    const parsed = parseSidecars("Just an ordinary reply.\n\nWith two paragraphs.");
    expect(parsed.text).toBe("Just an ordinary reply.\n\nWith two paragraphs.");
    expect(parsed.memories).toEqual([]);
    expect(parsed.forgets).toEqual([]);
    expect(parsed.tools).toEqual([]);
  });

  it("extracts memory, forget and tool blocks and strips them from the text", () => {
    const reply = [
      "Done — here's the plan.",
      '[BLOOM_MEMORY]{"category":"preference","text":"the person is vegan"}[/BLOOM_MEMORY]',
      '[BLOOM_MEMORY]{"category":"goal","text":"saving for a house"}[/BLOOM_MEMORY]',
      '[BLOOM_FORGET]{"text":"my old gym"}[/BLOOM_FORGET]',
      '[BLOOM_TOOL]{"name":"create_habit","args":{"name":"Read","frequency":"daily","reminderTime":"21:00"}}[/BLOOM_TOOL]',
    ].join("\n");
    const parsed = parseSidecars(reply);
    expect(parsed.text).toBe("Done — here's the plan.");
    expect(parsed.memories).toHaveLength(2);
    expect(parsed.memories[0]).toEqual({ category: "preference", text: "the person is vegan" });
    expect(parsed.memories[1]).toEqual({ category: "goal", text: "saving for a house" });
    expect(parsed.forgets).toEqual([{ text: "my old gym" }]);
    expect(parsed.tools).toHaveLength(1);
    expect(parsed.tools[0]?.name).toBe("create_habit");
    expect(parsed.tools[0]?.args).toMatchObject({ name: "Read", reminderTime: "21:00" });
  });

  it("drops malformed blocks from the result but still hides them from prose", () => {
    const reply =
      'Hello there.\n[BLOOM_MEMORY]{not json}[/BLOOM_MEMORY]\n[BLOOM_TOOL]{"name":"nope"[/BLOOM_TOOL]';
    const parsed = parseSidecars(reply);
    expect(parsed.text).toBe("Hello there.");
    expect(parsed.memories).toEqual([]);
    expect(parsed.tools).toEqual([]);
  });

  it("keeps well-formed unknown tool names — the executor decides whether to run them", () => {
    const parsed = parseSidecars('[BLOOM_TOOL]{"name":"nope","args":{}}[/BLOOM_TOOL]');
    expect(parsed.tools).toEqual([{ name: "nope", args: {} }]);
  });

  it("keeps prose before and after a block", () => {
    const parsed = parseSidecars(
      'First line.\n[BLOOM_MEMORY]{"text":"remember this","category":"context"}[/BLOOM_MEMORY]\nLast line.',
    );
    expect(parsed.text).toBe("First line.\nLast line.");
  });

  it("defaults an unknown category to context", () => {
    const parsed = parseSidecars(
      '[BLOOM_MEMORY]{"text":"something","category":"weird"}[/BLOOM_MEMORY]',
    );
    expect(parsed.memories[0]?.category).toBe("context");
  });
});
