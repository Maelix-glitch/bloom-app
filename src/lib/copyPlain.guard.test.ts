import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Plain-copy guard (M-235, "No dashes, no AI lines").
 *
 * The owner's ruling (2026-11-24): Bloom's words read like a person
 * wrote them. Short, plain sentences. Two tells are banned from
 * user-visible copy:
 *
 *   1. The em-dash (—) and the en-dash (–) in prose. Sentences use
 *      full stops, commas and colons; number ranges use a plain
 *      hyphen (25-50); a lone placeholder is "-".
 *   2. Grandiose AI filler: supercharge, unleash, delve, "elevate
 *      your", "dive into", "embark on", "unlock your", game-changer,
 *      cutting-edge, seamless, effortless, empower.
 *
 * The scan reads string literals, template parts and JSX text through
 * the TypeScript AST, so code comments (prose history is not copy)
 * and identifiers are never judged.
 *
 * PROTECTED (each with its justification — a dash that is part of a
 * name is not prose punctuation, and rule 4 of the slice is that a
 * proper name is never altered):
 *   - "Mifflin–St Jeor" — the published name of the BMR equation.
 *   - "Open Government Licence – Canada" — the official title of
 *     Canada's open licence, quoted where the CNF data is credited.
 *   - Literals containing "://" — URLs are identifiers; two Wikimedia
 *     Commons file URLs carry an en-dash inside the file's real name.
 *   - Literals starting "File:" — Wikimedia Commons file titles, the
 *     same two photographs, quoted exactly for attribution.
 *
 * Test files are out of scope (fixtures may quote the old copy to
 * prove it is gone), which is also why this guard may spell the
 * banned characters in its own source.
 */

const SRC = join(process.cwd(), "src");

const PROTECTED_NAMES = ["Mifflin\u2013St Jeor", "Open Government Licence \u2013 Canada"];

const BANNED_PHRASES = [
  "supercharge",
  "unleash",
  "delve",
  "elevate your",
  "dive into",
  "embark on",
  "unlock your",
  "game-changer",
  "game changer",
  "cutting-edge",
  "seamless",
  "effortless",
  "empower",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

type Literal = { rel: string; line: number; text: string };

let corpus: Literal[] | null = null;

function literals(): Literal[] {
  if (corpus) return corpus;
  const out: Literal[] = [];
  for (const file of walk(SRC)) {
    const rel = file.slice(SRC.length + 1);
    const text = readFileSync(file, "utf8");
    const sf = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node): void => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node) ||
        ts.isJsxText(node)
      ) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
        out.push({ rel, line: line + 1, text: node.text });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  corpus = out;
  return out;
}

function isProtected(text: string): boolean {
  if (text.includes("://")) return true;
  if (text.trimStart().startsWith("File:")) return true;
  return false;
}

function unprotected(text: string): string {
  let t = text;
  for (const name of PROTECTED_NAMES) t = t.split(name).join("");
  return t;
}

describe("M-235 · plain copy: no dashes, no AI lines", () => {
  it(
    "no em-dash or en-dash in user-visible copy",
    () => {
      const offenders: string[] = [];
      for (const lit of literals()) {
        if (isProtected(lit.text)) continue;
        if (/[\u2014\u2013]/.test(unprotected(lit.text))) {
          offenders.push(`${lit.rel}:${lit.line} ${JSON.stringify(lit.text.slice(0, 90))}`);
        }
      }
      expect(offenders).toEqual([]);
    },
    240_000,
  );

  it(
    "no grandiose AI filler phrases in user-visible copy",
    () => {
      const offenders: string[] = [];
      for (const lit of literals()) {
        const low = lit.text.toLowerCase();
        for (const phrase of BANNED_PHRASES) {
          if (low.includes(phrase)) offenders.push(`${lit.rel}:${lit.line} "${phrase}"`);
        }
      }
      expect(offenders).toEqual([]);
    },
    240_000,
  );
});
