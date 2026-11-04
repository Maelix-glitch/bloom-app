import { execSync } from "child_process";
import fs from "fs";
function out(cmd) {
  return execSync(cmd + " 2>&1", { encoding: "utf8" }).trim();
}
const full = out("./node_modules/.bin/vitest run 2>&1");
const cycle = out("./node_modules/.bin/vitest run src/lib/cycle/intel 2>&1");
const cano = out("./node_modules/.bin/vitest run src/lib/cycle/canonical.test.ts 2>&1");
const baseline = out("./node_modules/.bin/vitest run --root . 2>&1");
const baselineFail = baseline.split("\n").filter(l => l.startsWith(" FAIL")).map(l => l.trim()).join("\n");
fs.writeFileSync("reports/test-report.md", [
  "=== FULL SUITE (current branch) ===",
  full.split("\n").filter(l => /^ (Test Files|Tests)/.test(l) || l.startsWith(" FAIL")).join("\n"),
  "=== CYCLE INTELLIGENCE SUITE ===",
  cycle.split("\n").filter(l => /^ (Test Files|Tests)/.test(l) || l.startsWith(" FAIL")).join("\n"),
  "=== CANONICAL CROSS-VIEW SUITE ===",
  cano.split("\n").filter(l => /^ (Test Files|Tests)/.test(l) || l.startsWith(" FAIL")).join("\n"),
  "=== BASELINE FAILS AT 0d08ece ===",
  baselineFail,
].join("\n"));
console.log("written");
