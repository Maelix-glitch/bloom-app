import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The record grid's weekday alignment is half data, half CSS: the lib
 * computes Monday-first weeks (pinned in record.test.ts), and the CSS
 * must lay the flat day list out as COLUMNS of seven rows — switch the
 * flow to row-major and every cell silently lands under the wrong
 * weekday label while the data stays correct. Pin the layout contract
 * here so the two halves can never drift apart unnoticed.
 */

const css = readFileSync(join(process.cwd(), "src/styles/profile.css"), "utf8");

function ruleBlock(selector: string): string {
  const at = css.indexOf(`\n${selector} {`);
  if (at === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  return css.slice(open, close);
}

describe("record grid layout contract", () => {
  it("the grid flows by column over exactly seven weekday rows", () => {
    const block = ruleBlock(".pf-grid");
    expect(block).toContain("grid-auto-flow: column");
    expect(block).toContain("grid-template-rows: repeat(7, 13px)");
  });

  it("the weekday labels use the same seven rows", () => {
    const block = ruleBlock(".pf-grid-days");
    expect(block).toContain("grid-template-rows: repeat(7, 13px)");
  });
});
