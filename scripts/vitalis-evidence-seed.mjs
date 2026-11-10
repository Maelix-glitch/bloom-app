#!/usr/bin/env node
/**
 * Generate (or verify) the evidence catalogue seed.
 *
 *   npm run seed:evidence          write supabase/seeds/20261107_vitalis_evidence_catalog.sql
 *   npm run seed:evidence:check    fail if the committed file is out of date
 *
 * The catalogue in `src/lib/vitalis/evidence/catalog.ts` is the only thing a
 * human edits. This script turns it into SQL; it is the mechanical half of the
 * pair, and `src/lib/vitalis/evidence/seed/canonical.ts` is the fingerprint that
 * ties the two together.
 *
 * Three deliberate properties:
 *
 *   • **No credentials, ever.** The script opens no connection, reads no
 *     environment variable and prints nothing secret. Applying the file is a
 *     separate administrative step documented in `docs/vitalis-evidence-seed.md`.
 *   • **No timestamps.** The output depends only on the catalogue, so the same
 *     commit regenerates byte-identical SQL on any machine. A generation date in
 *     the file would make every run a diff and hide the real changes.
 *   • **Structural checks before writing.** The full validator lives in
 *     `registry.ts` and runs in the test suite; this script only refuses to emit
 *     SQL that would point at rows it does not also create.
 *
 * Node runs this directly (type stripping is on by default in Node 22.18+ and
 * later). The imported modules use `import type` only, so nothing in the
 * catalogue needs a bundler to load.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Import a TypeScript module by repository-relative path. */
function load(relativePath) {
  return import(pathToFileURL(resolve(root, relativePath)).href);
}

const { CATALOG } = await load("src/lib/vitalis/evidence/catalog.ts");
const { catalogHash } = await load("src/lib/vitalis/evidence/seed/canonical.ts");
const { buildSeedSql, SEED_FILE } = await load("src/lib/vitalis/evidence/seed/sql.ts");

/**
 * Preconditions for emitting SQL at all.
 *
 * Not a replacement for `registryIssues` — it is narrower on purpose. Every
 * check here corresponds to a way the generated file could reference a row it
 * never creates, which PostgreSQL would reject halfway through.
 */
function structuralProblems(registry) {
  const problems = [];

  const sourceIds = new Set(registry.sources.map((source) => source.id));
  const claimIds = new Set(registry.claims.map((claim) => claim.id));
  if (sourceIds.size !== registry.sources.length) problems.push("duplicate source id");
  if (claimIds.size !== registry.claims.length) problems.push("duplicate claim id");

  for (const source of registry.sources) {
    if (source.supersededBy !== null && !sourceIds.has(source.supersededBy)) {
      problems.push(`${source.id}: supersededBy points at an unknown source`);
    }
  }
  for (const claim of registry.claims) {
    if (claim.supersededBy !== null && !claimIds.has(claim.supersededBy)) {
      problems.push(`${claim.id}: supersededBy points at an unknown claim`);
    }
    for (const link of claim.sources) {
      if (!sourceIds.has(link.sourceId)) {
        problems.push(`${claim.id}: cites unknown source ${link.sourceId}`);
      }
    }
  }
  for (const recommendation of registry.recommendations) {
    for (const claimId of recommendation.claimIds) {
      if (!claimIds.has(claimId)) {
        problems.push(`${recommendation.recommendationId}: cites unknown claim ${claimId}`);
      }
    }
  }
  for (const revision of registry.revisions) {
    const known = revision.entityType === "source" ? sourceIds : claimIds;
    if (!known.has(revision.entityId)) {
      problems.push(`revision for unknown ${revision.entityType} ${revision.entityId}`);
    }
  }

  return problems;
}

/** Compare line endings away, so a CRLF checkout is not reported as stale. */
function normalise(sql) {
  return sql.replace(/\r\n/g, "\n");
}

const problems = structuralProblems(CATALOG);
if (problems.length > 0) {
  console.error("The evidence catalogue is not internally consistent:");
  for (const problem of problems) console.error(`  • ${problem}`);
  console.error("\nNothing was written. Fix catalog.ts and re-run.");
  process.exit(1);
}

const hash = catalogHash(CATALOG);
const sql = buildSeedSql(CATALOG);
const target = resolve(root, SEED_FILE);
const checkOnly = process.argv.includes("--check");

if (checkOnly) {
  let existing;
  try {
    existing = readFileSync(target, "utf8");
  } catch {
    console.error(`${SEED_FILE} does not exist. Run: npm run seed:evidence`);
    process.exit(1);
  }
  if (normalise(existing) !== sql) {
    console.error(`${SEED_FILE} is out of date with catalog.ts.`);
    console.error(`  catalogue hash: sha256:${hash}`);
    console.error("Run: npm run seed:evidence");
    process.exit(1);
  }
  console.log(`${SEED_FILE} is up to date (sha256:${hash}).`);
  process.exit(0);
}

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, sql, "utf8");

console.log(`Wrote ${SEED_FILE}`);
console.log(`  catalogue hash  sha256:${hash}`);
console.log(`  statements      ${sql.split(";\n").length - 1}`);
console.log(`  bytes           ${Buffer.byteLength(sql, "utf8")}`);
console.log("\nApply it as a single transaction; see docs/vitalis-evidence-seed.md.");
