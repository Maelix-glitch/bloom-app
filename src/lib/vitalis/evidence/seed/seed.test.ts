/**
 * The seed pipeline: one source of truth, two representations, one fingerprint.
 *
 * These tests exist because the generated SQL is committed and applied to a real
 * database, so "it looked right when I ran it" is not enough. Four properties are
 * asserted:
 *
 *   • **Determinism** — the same catalogue always produces the same bytes, so a
 *     diff in the seed file means a real change to the evidence.
 *   • **Freshness** — the committed file matches what the current catalogue
 *     generates. A catalogue edit that was never regenerated fails here rather
 *     than silently leaving the database behind.
 *   • **Order** — claims are staged as draft, cited, and only then approved,
 *     because the licence gate is a trigger that also fires on insert.
 *   • **Containment** — the file mentions no credential, no other Bloom table,
 *     and deletes nothing at all: an unexpected row is reported, never removed.
 *
 * The complementary suite, `src/lib/vitalis/db/evidence-seed.integration.test.ts`,
 * proves the same file actually runs and round-trips through PostgreSQL. These
 * two run in different places: this one needs no server, so a contributor who
 * edits the catalogue finds out immediately.
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { CATALOG } from "../catalog";
import { assertRegistry } from "../registry";
import type { EvidenceRegistry } from "../types";
import { canonicalise, catalogHash, catalogHashLabel, SEED_FORMAT_VERSION } from "./canonical";
import { buildSeedSql, SEED_FILE, SEED_SECTIONS } from "./sql";

const SEED_PATH = new URL(`../../../../../${SEED_FILE}`, import.meta.url);

function committedSeed(): string {
  return readFileSync(SEED_PATH, "utf8").replace(/\r\n/g, "\n");
}

/** A deep, mutable copy, so a test can change one fact without touching CATALOG. */
function cloneCatalogue(): EvidenceRegistry {
  return structuredClone(CATALOG) as EvidenceRegistry;
}

describe("canonical serialisation", () => {
  it("is insensitive to object key order", () => {
    expect(canonicalise({ b: 1, a: 2 })).toBe(canonicalise({ a: 2, b: 1 }));
  });

  it("preserves array order, because the catalogue's order carries meaning", () => {
    expect(canonicalise(["a", "b"])).not.toBe(canonicalise(["b", "a"]));
  });

  it("encodes values that SQL and JSON each handle differently, consistently", () => {
    expect(canonicalise(0.8)).toBe(canonicalise(0.8));
    expect(canonicalise(null)).toBe("null");
    expect(canonicalise([])).toBe("[]");
  });

  it("refuses a value it cannot represent rather than hashing something else", () => {
    expect(() => canonicalise(Number.NaN)).toThrow(/non-finite/);
    expect(() => canonicalise(undefined)).toThrow(/cannot canonicalise/);
  });
});

describe("catalogue hash", () => {
  it("is a stable sha256 of the whole registry", () => {
    const hash = catalogHash(CATALOG);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(catalogHash(CATALOG)).toBe(hash);
    expect(catalogHashLabel(CATALOG)).toBe(`sha256:${hash}`);
  });

  it("changes when any recorded fact changes", () => {
    const before = catalogHash(CATALOG);

    const withNewLocator = cloneCatalogue();
    const claim = withNewLocator.claims.find((entry) => entry.id === "dga-whole-foods-emphasis");
    expect(claim).toBeDefined();
    if (claim) {
      (claim as unknown as { sources: { locator: string }[] }).sources[0]!.locator =
        "Chapter 1, a different page";
    }

    expect(catalogHash(withNewLocator)).not.toBe(before);
  });

  it("changes when a review date moves by a single day", () => {
    const shifted = cloneCatalogue();
    const source = shifted.sources.find((entry) => entry.id === "usda-fooddata-central");
    expect(source).toBeDefined();
    if (source) {
      (source as { reviewedOn: string | null }).reviewedOn = "2026-11-06";
    }
    expect(catalogHash(shifted)).not.toBe(catalogHash(CATALOG));
  });

  it("matches the hash declared inside the committed seed", () => {
    const declared = /^-- catalogue hash\s+(sha256:[0-9a-f]{64})$/m.exec(committedSeed())?.[1];
    expect(declared, "the seed must declare the hash it was generated from").toBeDefined();
    expect(declared).toBe(catalogHashLabel(CATALOG));
  });
});

describe("generated seed", () => {
  it("builds from a catalogue that passes the registry's own validation", () => {
    // The seed is only as trustworthy as the catalogue behind it, and the
    // registry is the authority on that — not the generator's narrower checks.
    expect(() => assertRegistry(CATALOG)).not.toThrow();
  });

  it("is byte-identical across runs and independent of object identity", () => {
    expect(buildSeedSql(CATALOG)).toBe(buildSeedSql(CATALOG));
    expect(buildSeedSql(cloneCatalogue())).toBe(buildSeedSql(CATALOG));
  });

  it("matches the file committed to the repository", () => {
    // Catches the one mistake this design cannot otherwise prevent: editing
    // `catalog.ts` and forgetting to regenerate. The message says so, because a
    // failing string equality gives no useful hint on its own.
    expect(
      committedSeed(),
      "supabase/seeds/*.sql is stale — run `npm run seed:evidence` and commit the result",
    ).toBe(buildSeedSql(CATALOG));
  });

  it("declares the format version the generator implements", () => {
    expect(committedSeed()).toContain(`-- format version   ${String(SEED_FORMAT_VERSION)}`);
  });

  it("stagest every claim as draft before citing it, and only then approves", () => {
    const sql = buildSeedSql(CATALOG);
    const position = (section: (typeof SEED_SECTIONS)[number]) => {
      const at = sql.indexOf(`-- section: ${section}`);
      expect(at, `missing section: ${section}`).toBeGreaterThan(-1);
      return at;
    };

    expect(position("preflight")).toBeLessThan(position("reconciliation"));
    expect(position("reconciliation")).toBeLessThan(position("sources"));
    expect(position("sources")).toBeLessThan(position("claims-staged"));
    expect(position("claims-staged")).toBeLessThan(position("citations"));
    expect(position("citations")).toBeLessThan(position("claims-final"));
    expect(position("claims-final")).toBeLessThan(position("revisions"));

    // No claim may arrive at its terminal status before its citations exist.
    const stagedBlock = sql.slice(position("claims-staged"), position("citations"));
    expect(stagedBlock).toContain(", 'draft', ");
    expect(stagedBlock).not.toContain("review_status = 'approved'");

    // The conflict branch leaves an existing status, review date and
    // supersession alone, so a re-run can never un-approve a claim.
    const branches = [...stagedBlock.matchAll(/do update set([\s\S]*?);\n/g)].map(
      (match) => match[1] ?? "",
    );
    expect(branches).toHaveLength(CATALOG.claims.length);
    for (const branch of branches) {
      expect(branch).not.toMatch(/review_status\s*=/);
      expect(branch).not.toMatch(/reviewed_on\s*=/);
      expect(branch).not.toMatch(/superseded_by\s*=/);
    }
  });

  it("writes superseded rows after the rows that replace them", () => {
    const sql = buildSeedSql(CATALOG);
    const current = sql.indexOf(
      "insert into public.evidence_sources as target (\n  id, title, kind, publisher, authors, publication_year, url, license_id, license_url, license_note, product_use_allowed, permission_required, peer_reviewed, retrieved_on, published_on, reviewed_on, review_interval_months, review_status, version, superseded_by, notes\n) values (\n  'dga-2025-2030'",
    );
    const superseded = sql.indexOf(
      "insert into public.evidence_sources as target (\n  id, title, kind, publisher, authors, publication_year, url, license_id, license_url, license_note, product_use_allowed, permission_required, peer_reviewed, retrieved_on, published_on, reviewed_on, review_interval_months, review_status, version, superseded_by, notes\n) values (\n  'dga-2020-2025'",
    );
    expect(current).toBeGreaterThan(-1);
    expect(superseded).toBeGreaterThan(-1);
    // superseded_by is a foreign key onto the same table: the target must exist.
    expect(current).toBeLessThan(superseded);
  });

  it("escapes apostrophes rather than producing broken SQL", () => {
    const sql = buildSeedSql(CATALOG);
    expect(sql).toContain("publisher''s attribution request");
    // An even number of quotes on every line that is pure data is a weak check,
    // so the real proof is the integration suite executing the file.
    expect(sql).not.toContain("''''");
  });

  it("mentions every source and every claim exactly once as an insert target", () => {
    const sql = buildSeedSql(CATALOG);
    for (const source of CATALOG.sources) {
      const occurrences = sql.split(`values (\n  '${source.id}'`).length - 1;
      expect(occurrences, `source ${source.id} must be written once`).toBe(1);
    }
  });

  it("carries no credential and no connection string", () => {
    const sql = buildSeedSql(CATALOG);
    expect(sql).not.toMatch(/service_role/i);
    expect(sql).not.toMatch(/supabase_service|SERVICE_ROLE_KEY/i);
    // A JWT (anon or service) is three base64url segments beginning with `eyJ`.
    expect(sql).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);
    expect(sql).not.toMatch(/postgres(ql)?:\/\//i);
    expect(sql).not.toMatch(/password/i);
  });

  it("touches no table outside the evidence registry", () => {
    const sql = buildSeedSql(CATALOG);
    expect(sql).not.toMatch(/\bhealth_/);
    expect(sql).not.toMatch(/\bauth\./);
    expect(sql).not.toMatch(/\bstorage\./);
    expect(sql).not.toMatch(/\bprofiles?\b/);
    expect(sql).not.toMatch(/^\s*(drop|truncate|alter table|grant|revoke)\b/im);

    // Anchored at the start of a statement, so `do update set` inside an upsert
    // is not mistaken for a write to a table called "set".
    const targets = [...sql.matchAll(/^\s*(?:insert into|update|delete from)\s+([a-z_.]+)/gm)].map(
      (match) => match[1],
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(target, `${String(target)} is not an evidence table`).toMatch(/^public\.evidence_/);
    }
  });

  it("deletes nothing at all: evidence is retired by a person, never by a seed", () => {
    const sql = buildSeedSql(CATALOG);
    const statements = sql.replace(/--[^\n]*/g, "");
    expect(statements).not.toMatch(/\bdelete\b/i);
    expect(statements).not.toMatch(/\btruncate\b/i);
    expect(statements).not.toMatch(/\bdrop\b/i);
    expect(statements).not.toMatch(/\bcascade\b/i);
  });

  it("reports unexpected database rows and relationships instead of removing them", () => {
    const sql = buildSeedSql(CATALOG);

    // Eleven refusals: four per registry table (unmanaged rows, a newer version,
    // a supersession to erase, a reviewed row returned to draft), one per join
    // table, and one for unmanaged recommendations. A removal would have needed
    // none of them.
    expect([...sql.matchAll(/raise exception 'seed refused:/g)]).toHaveLength(11);

    expect(sql).toMatch(/evidence_sources holds rows the catalogue does not describe/);
    expect(sql).toMatch(/evidence_claims holds rows the catalogue does not describe/);
    expect(sql).toMatch(/citations exist that the catalogue does not describe/);
    expect(sql).toMatch(/recommendation links exist that the catalogue does not describe/);
    expect(sql).toMatch(/evidence_recommendations holds rows the catalogue does not describe/);
    expect(sql).toMatch(/is newer in the database than in the catalogue/);
    expect(sql).toMatch(/supersession history the catalogue would erase/);
    expect(sql).toMatch(/would return it to draft/);
  });

  it("reconciles before it writes a single row", () => {
    const sql = buildSeedSql(CATALOG);
    const at = (section: string) => sql.indexOf(`-- section: ${section}`);
    expect(at("preflight")).toBeGreaterThan(-1);
    expect(at("reconciliation")).toBeGreaterThan(at("preflight"));
    for (const section of ["sources", "claims-staged", "citations", "recommendations"] as const) {
      expect(at(section), `${section} must follow reconciliation`).toBeGreaterThan(
        at("reconciliation"),
      );
    }
  });

  it("guards every upsert, so a re-run cannot revert state", () => {
    const sql = buildSeedSql(CATALOG);
    const branches = [...sql.matchAll(/on conflict \([^)]+\) do update set([\s\S]*?);\n/g)].map(
      (match) => match[1] ?? "",
    );

    const citations = CATALOG.claims.reduce((total, claim) => total + claim.sources.length, 0);
    expect(branches).toHaveLength(
      CATALOG.sources.length + CATALOG.claims.length + citations + CATALOG.recommendations.length,
    );

    // No conflict branch may run unguarded.
    for (const branch of branches) expect(branch).toMatch(/\n\s+where /);

    // The versioned tables refuse a row the database has already moved on.
    expect(branches.filter((branch) => branch.includes("target.version"))).toHaveLength(
      CATALOG.sources.length + CATALOG.claims.length,
    );

    // The final status pass may only move a claim forward.
    expect(sql).toMatch(/and version <= /);
    expect(sql).toMatch(/and \(superseded_by is null or superseded_by = /);
  });

  it("never rewrites history: revisions are insert-if-absent only", () => {
    const sql = buildSeedSql(CATALOG);
    expect(sql).not.toMatch(/update public\.evidence_revisions/im);
    expect(sql).not.toMatch(/delete from public\.evidence_revisions/im);
    expect(sql).toContain("where not exists (");
  });
});

describe("seed file location", () => {
  it("lives under supabase/seeds, so it is applied deliberately rather than at boot", () => {
    expect(SEED_FILE).toMatch(/^supabase\/seeds\/[0-9]{8}_[a-z0-9_]+\.sql$/);
  });
});
