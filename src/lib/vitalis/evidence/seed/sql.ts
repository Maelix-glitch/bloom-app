/**
 * Generates the evidence catalogue seed from the TypeScript catalogue.
 *
 * The catalogue in `catalog.ts` is the human-edited source of truth. A Supabase
 * project applies SQL, so the same facts have to exist as SQL as well; generating
 * that SQL rather than hand-writing it is the only way to keep the two from
 * drifting apart.
 *
 * Four constraints shape the output.
 *
 *   1. **Order is not cosmetic.** The Phase 2 migration puts the licence gate in
 *      the database as a trigger on `evidence_claims` that fires on INSERT as
 *      well as UPDATE. A claim inserted directly as `approved` is rejected,
 *      because at that moment it has no citation. The seed therefore lands claims
 *      as `draft`, attaches their citations, and only then moves them to their
 *      real status. The same applies to supersession pointers, which are foreign
 *      keys: a superseded row can only be written once the row that replaces it
 *      exists, so sources and claims are emitted in dependency order.
 *
 *   2. **It reconciles; it never prunes.** The seed deletes nothing at all — not
 *      a source, a claim, a citation, a recommendation link or a revision. If the
 *      database holds a row or a relationship the catalogue does not describe, or
 *      holds a version, review state or supersession the catalogue would move
 *      backwards, the file raises before writing anything and the transaction is
 *      left untouched. Removing evidence is a reviewed operator decision, never a
 *      side effect of regenerating a file.
 *
 *   3. **It only ever moves a row forward.** Every conflict branch is guarded: a
 *      newer database version is not reverted, a recorded supersession is not
 *      erased, an approved claim is not returned to draft, and a row whose
 *      content already matches is not touched at all — not even its
 *      `updated_at`. Applying the file to a current database is a no-op.
 *
 *   4. **The output must be reviewable.** It is committed and read in diffs, so
 *      it is formatted one statement per row group with plain literals — no
 *      dynamic SQL, no `format()`, nothing a reviewer has to evaluate in their
 *      head.
 *
 * Deliberately absent: any connection string, any key, any reference to
 * `service_role`. This module is a text generator. It never talks to a database
 * and never reads a credential; applying the file is a separate, documented,
 * human-run step.
 */

import type { EvidenceClaim, EvidenceLink, EvidenceRegistry, EvidenceSource } from "../types";
// The explicit `.ts` extension is required by the generator, which loads this
// module through Node's type stripping rather than through a bundler. `tsc`
// permits it because the project sets `allowImportingTsExtensions`.
import { catalogHashLabel, SEED_FORMAT_VERSION } from "./canonical.ts";

/** Where the generated file lives, relative to the repository root. */
export const SEED_FILE = "supabase/seeds/20261107_vitalis_evidence_catalog.sql";

/** Section markers. The tests locate statements by these, so keep them stable. */
export const SEED_SECTIONS = [
  "preflight",
  "reconciliation",
  "sources",
  "claims-staged",
  "citations",
  "recommendations",
  "recommendation-claims",
  "claims-final",
  "revisions",
] as const;

export type SeedSection = (typeof SEED_SECTIONS)[number];

/* -------------------------------------------------------------------------- */
/* Literal encoding                                                           */
/* -------------------------------------------------------------------------- */

/**
 * A SQL string literal.
 *
 * Single quotes are doubled, which is the standard-conforming escape and the one
 * that behaves identically regardless of `standard_conforming_strings`. Source
 * titles in this catalogue genuinely contain apostrophes ("ICMR-NIN's"), so this
 * is not a hypothetical.
 */
function text(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function nullableText(value: string | null): string {
  return value === null ? "null" : text(value);
}

/** A `date` literal, or a plain null for an assignment. */
function date(value: string | null): string {
  return value === null ? "null" : `${text(value)}::date`;
}

/** A `date` literal in a row comparison, where a null has to carry its type. */
function dateOrNull(value: string | null): string {
  return value === null ? "null::date" : `${text(value)}::date`;
}

function boolean(value: boolean): string {
  return value ? "true" : "false";
}

/** A `text[]` column. Empty arrays are written in the canonical `'{}'` form. */
function textArray(values: readonly string[]): string {
  if (values.length === 0) return "'{}'::text[]";
  return `array[${values.map((value) => text(value)).join(", ")}]::text[]`;
}

/**
 * A `jsonb` array column.
 *
 * Built as a JSON string and cast, rather than with `jsonb_build_array`, so the
 * output stays readable and a reviewer can see the exact stored value. The JSON
 * is produced by `JSON.stringify`, so inner double quotes need no escaping in
 * SQL — only the enclosing single quotes, which `text()` handles.
 */
function jsonArray(values: readonly string[]): string {
  return `${text(JSON.stringify(values))}::jsonb`;
}

/* -------------------------------------------------------------------------- */
/* Ordering                                                                   */
/* -------------------------------------------------------------------------- */

interface Supersedable {
  readonly id: string;
  readonly supersededBy: string | null;
}

/**
 * Rows in an order where a superseded row always follows the row that replaces
 * it, because `superseded_by` is a foreign key onto the same table.
 *
 * Ties are broken by id, so the output does not depend on the order an editor
 * happened to type the entries in. A cycle is a catalogue error rather than
 * something to paper over: it is reported here so the generator fails loudly
 * instead of emitting SQL that PostgreSQL will half-apply.
 */
function dependencyOrder<T extends Supersedable>(rows: readonly T[]): T[] {
  const present = new Set(rows.map((row) => row.id));
  const emitted = new Set<string>();
  const pending = [...rows].sort((a, b) => a.id.localeCompare(b.id));
  const ordered: T[] = [];

  while (pending.length > 0) {
    const index = pending.findIndex(
      (row) =>
        row.supersededBy === null ||
        !present.has(row.supersededBy) ||
        emitted.has(row.supersededBy),
    );
    if (index === -1) {
      const stuck = pending.map((row) => row.id).join(", ");
      throw new Error(`supersession cycle among: ${stuck}`);
    }
    const [next] = pending.splice(index, 1);
    if (next === undefined) break;
    ordered.push(next);
    emitted.add(next.id);
  }

  return ordered;
}

/* -------------------------------------------------------------------------- */
/* Upserts                                                                    */
/* -------------------------------------------------------------------------- */

const SOURCE_COLUMNS = [
  "id",
  "title",
  "kind",
  "publisher",
  "authors",
  "publication_year",
  "url",
  "license_id",
  "license_url",
  "license_note",
  "product_use_allowed",
  "permission_required",
  "peer_reviewed",
  "retrieved_on",
  "published_on",
  "reviewed_on",
  "review_interval_months",
  "review_status",
  "version",
  "superseded_by",
  "notes",
] as const;

/**
 * One source, as an upsert that refuses to move the row backwards.
 *
 * The guard is three conditions, and each exists for a different failure:
 *
 *   • `excluded.version >= target.version` — the catalogue may not revert a row
 *     the database has already moved to a newer version.
 *   • the supersession condition — a recorded supersession pointer is never
 *     cleared or re-pointed by a regeneration.
 *   • the `to_jsonb` comparison — a row whose content already matches is not
 *     written at all, so a second run changes nothing, including `updated_at`.
 *
 * `created_at` and `updated_at` are excluded from the comparison because they
 * are bookkeeping, not evidence. The reconciliation block raises a readable
 * error before any of this runs; these guards are what make the statements
 * themselves incapable of the same damage.
 */
function sourceStatement(source: EvidenceSource): string {
  const values = [
    text(source.id),
    text(source.title),
    text(source.kind),
    text(source.publisher),
    textArray(source.authors),
    String(source.publicationYear),
    text(source.url),
    text(source.license),
    nullableText(source.licenseUrl),
    text(source.licenseNote),
    boolean(source.productUseAllowed),
    boolean(source.permissionRequired),
    boolean(source.peerReviewed),
    date(source.retrievedOn),
    date(source.publishedOn),
    date(source.reviewedOn),
    String(source.reviewIntervalMonths),
    text(source.reviewStatus),
    String(source.version),
    nullableText(source.supersededBy),
    nullableText(source.notes),
  ];

  // `id` and `created_at` are not updated: the row's identity and the moment it
  // first entered the registry are facts about history, not about the catalogue.
  const mutable = SOURCE_COLUMNS.filter((column) => column !== "id");

  return [
    "insert into public.evidence_sources as target (",
    `  ${SOURCE_COLUMNS.join(", ")}`,
    ") values (",
    `  ${values.join(", ")}`,
    ") on conflict (id) do update set",
    ...mutable.map((column) => `    ${column} = excluded.${column},`),
    "    updated_at = now()",
    "  where excluded.version >= target.version",
    "    and (target.superseded_by is null or target.superseded_by = excluded.superseded_by)",
    "    and to_jsonb(excluded) - 'created_at' - 'updated_at'",
    "        is distinct from to_jsonb(target) - 'created_at' - 'updated_at';",
  ].join("\n");
}

const CLAIM_COLUMNS = [
  "id",
  "statement",
  "topic",
  "grade",
  "confidence",
  "population",
  "uncertainty",
  "limitations",
  "contraindications",
  "review_status",
  "version",
  "reviewed_on",
  "review_interval_months",
  "superseded_by",
] as const;

/**
 * A claim is first written as `draft`.
 *
 * This is not timidity: the database rejects an approved claim that has no
 * supporting citation yet on the same insert, and on a fresh database that is
 * exactly the state every claim is in when it arrives. Staging the row also
 * means citations can be attached without the licence gate firing on a claim
 * that is already approved.
 *
 * The conflict branch deliberately does not mention `review_status`,
 * `reviewed_on` or `superseded_by`. Those columns belong to the final pass, so
 * re-running the seed can never un-approve a claim or clear its supersession,
 * however the catalogue is edited.
 */
function stagedClaimStatement(claim: EvidenceClaim): string {
  const values = [
    text(claim.id),
    text(claim.statement),
    text(claim.topic),
    text(claim.grade),
    String(claim.confidence),
    text(claim.population),
    jsonArray(claim.uncertainty),
    jsonArray(claim.limitations),
    jsonArray(claim.contraindications),
    text("draft"),
    String(claim.version),
    "null",
    String(claim.reviewIntervalMonths),
    "null",
  ];

  const mutable = [
    "statement",
    "topic",
    "grade",
    "confidence",
    "population",
    "uncertainty",
    "limitations",
    "contraindications",
    "version",
    "review_interval_months",
  ] as const;

  return [
    "insert into public.evidence_claims as target (",
    `  ${CLAIM_COLUMNS.join(", ")}`,
    ") values (",
    `  ${values.join(", ")}`,
    ") on conflict (id) do update set",
    ...mutable.map((column) => `    ${column} = excluded.${column},`),
    "    updated_at = now()",
    "  where excluded.version >= target.version",
    "    and to_jsonb(excluded) - 'created_at' - 'updated_at'",
    "        - 'review_status' - 'reviewed_on' - 'superseded_by'",
    "        is distinct from",
    "        to_jsonb(target) - 'created_at' - 'updated_at'",
    "        - 'review_status' - 'reviewed_on' - 'superseded_by';",
  ].join("\n");
}

/**
 * The recorded status, written only once the citations above exist.
 *
 * Three guards, again each for a specific way this could lose information: a
 * newer version is not overwritten, a recording supersession is not cleared
 * (`superseded_by is null or superseded_by = <the catalogue's pointer>`), and a
 * claim that already holds exactly these values is not written at all.
 */
function finalClaimStatement(claim: EvidenceClaim): string {
  const pointer = nullableText(claim.supersededBy);
  const pointerInRow = claim.supersededBy === null ? "null::text" : text(claim.supersededBy);

  return [
    "update public.evidence_claims",
    `   set review_status = ${text(claim.reviewStatus)},`,
    `       version = ${String(claim.version)},`,
    `       reviewed_on = ${date(claim.reviewedOn)},`,
    `       review_interval_months = ${String(claim.reviewIntervalMonths)},`,
    `       superseded_by = ${pointer},`,
    "       updated_at = now()",
    ` where id = ${text(claim.id)}`,
    `   and version <= ${String(claim.version)}`,
    `   and (superseded_by is null or superseded_by = ${pointer})`,
    "   and row(review_status, version, reviewed_on, review_interval_months, superseded_by)",
    "       is distinct from row(",
    `         ${text(claim.reviewStatus)},`,
    `         ${String(claim.version)},`,
    `         ${dateOrNull(claim.reviewedOn)},`,
    `         ${String(claim.reviewIntervalMonths)}::smallint,`,
    `         ${pointerInRow}`,
    "       );",
  ].join("\n");
}

/** A citation. Rewritten only when the catalogue says something different. */
function citationStatement(claim: EvidenceClaim, link: EvidenceLink): string {
  return [
    "insert into public.evidence_claim_sources as target (claim_id, source_id, direction, locator)",
    `values (${text(claim.id)}, ${text(link.sourceId)}, ${text(link.direction)}, ${text(link.locator)})`,
    "on conflict (claim_id, source_id) do update set",
    "    direction = excluded.direction,",
    "    locator = excluded.locator",
    "  where (target.direction, target.locator)",
    "        is distinct from (excluded.direction, excluded.locator);",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Reconciliation                                                             */
/* -------------------------------------------------------------------------- */

interface ReconcileRow {
  readonly id: string;
  readonly version: number;
  readonly supersededBy: string | null;
  readonly reviewStatus: string;
}

/** The indent used inside the generated `values` lists. */
const LIST_INDENT = "            ";

function valuesBlock(rows: readonly string[]): string {
  return rows.join(`,\n${LIST_INDENT}`);
}

/**
 * Row-level refusals for a table whose rows the catalogue claims to enumerate.
 *
 * Four ways the database can hold something the catalogue does not describe, or
 * something the catalogue would move backwards. Each is reported with the ids
 * involved, and the raise aborts the whole file, so nothing is written.
 */
function entityReconciliation(
  table: "public.evidence_sources" | "public.evidence_claims",
  rows: readonly ReconcileRow[],
): string {
  const name = table.slice("public.".length);
  if (rows.length === 0) {
    return [
      `-- ${name}`,
      "-- The catalogue describes no rows, so the unmanaged-row check is omitted.",
    ].join("\n");
  }

  const ids = rows.map((row) => text(row.id)).join(", ");
  const versions = valuesBlock(rows.map((row) => `(${text(row.id)}, ${String(row.version)})`));
  const pointers = valuesBlock(
    rows.map(
      (row) =>
        `(${text(row.id)}, ${row.supersededBy === null ? "null::text" : text(row.supersededBy)})`,
    ),
  );
  const statuses = valuesBlock(rows.map((row) => `(${text(row.id)}, ${text(row.reviewStatus)})`));

  return [
    `-- ${name}: four refusals, checked before a single row is written.`,
    "do $$",
    "declare",
    "  offenders text;",
    "begin",
    "  -- 1. Rows the catalogue does not describe.",
    "  select string_agg(d.id, ', ' order by d.id) into offenders",
    `    from ${table} d`,
    `   where d.id not in (${ids});`,
    "",
    "  if offenders is not null then",
    `    raise exception 'seed refused: ${name} holds rows the catalogue does not describe: %', offenders`,
    "      using hint = 'Add them to catalog.ts, or retire them with a reviewed statement. The seed never deletes a row.';",
    "  end if;",
    "",
    "  -- 2. A database version newer than the catalogue's.",
    "  select string_agg(c.id || ' (database v' || d.version || ', catalogue v' || c.version || ')', ', ' order by c.id)",
    "    into offenders",
    "    from (values",
    `${LIST_INDENT}${versions}`,
    "         ) as c (id, version)",
    `    join ${table} d on d.id = c.id`,
    "   where d.version > c.version;",
    "",
    "  if offenders is not null then",
    `    raise exception 'seed refused: ${name} is newer in the database than in the catalogue: %', offenders`,
    "      using hint = 'Regenerate from the current catalogue, or roll the catalogue forward. The seed never reverts a newer row.';",
    "  end if;",
    "",
    "  -- 3. Supersession history the catalogue would erase or rewrite.",
    "  select string_agg(c.id, ', ' order by c.id) into offenders",
    "    from (values",
    `${LIST_INDENT}${pointers}`,
    "         ) as c (id, superseded_by)",
    `    join ${table} d on d.id = c.id`,
    "   where d.superseded_by is not null",
    "     and d.superseded_by is distinct from c.superseded_by;",
    "",
    "  if offenders is not null then",
    `    raise exception 'seed refused: ${name} has supersession history the catalogue would erase: %', offenders`,
    "      using hint = 'Re-point or retire a row with a reviewed statement. The seed never clears a recorded supersession.';",
    "  end if;",
    "",
    "  -- 4. A reviewed row the catalogue would put back into draft.",
    "  select string_agg(c.id, ', ' order by c.id) into offenders",
    "    from (values",
    `${LIST_INDENT}${statuses}`,
    "         ) as c (id, review_status)",
    `    join ${table} d on d.id = c.id`,
    "   where d.review_status not in ('draft', 'in_review')",
    "     and c.review_status in ('draft', 'in_review');",
    "",
    "  if offenders is not null then",
    `    raise exception 'seed refused: ${name} is reviewed in the database and the catalogue would return it to draft: %', offenders`,
    "      using hint = 'Demote a reviewed row with a reviewed statement, not by editing the catalogue. The seed only advances review state.';",
    "  end if;",
    "end",
    "$$;",
  ].join("\n");
}

/**
 * Refusals for a join table, where the catalogue enumerates every relationship.
 *
 * A citation the catalogue does not assert, or a recommendation link it does not
 * assert, is a database-owned relationship. The seed reports it and stops; it
 * does not remove it.
 */
function pairReconciliation(
  table: "public.evidence_claim_sources" | "public.evidence_recommendation_claims",
  leftColumn: "claim_id" | "recommendation_id",
  rightColumn: "source_id" | "claim_id",
  pairs: readonly (readonly [string, string])[],
  label: string,
  hint: string,
): string {
  const name = table.slice("public.".length);
  if (pairs.length === 0) {
    return [
      `-- ${name}`,
      `-- The catalogue asserts no ${label}, so any row here is unexpected.`,
    ].join("\n");
  }

  const list = valuesBlock(pairs.map(([left, right]) => `(${text(left)}, ${text(right)})`));

  return [
    `-- ${name}: one refusal, checked before a single relationship is written.`,
    "do $$",
    "declare",
    "  offenders text;",
    "begin",
    `  select string_agg(d.${leftColumn} || ' -> ' || d.${rightColumn}, ', '`,
    `                    order by d.${leftColumn}, d.${rightColumn}) into offenders`,
    `    from ${table} d`,
    `   where (d.${leftColumn}, d.${rightColumn}) not in (`,
    `${LIST_INDENT}${list}`,
    "         );",
    "",
    "  if offenders is not null then",
    `    raise exception 'seed refused: ${label} exist that the catalogue does not describe: %', offenders`,
    `      using hint = '${hint}';`,
    "  end if;",
    "end",
    "$$;",
  ].join("\n");
}

/** Refusal for a table whose rows are simple, un-versioned records. */
function keyReconciliation(
  table: "public.evidence_recommendations",
  ids: readonly string[],
): string {
  const name = table.slice("public.".length);
  if (ids.length === 0) {
    return [
      `-- ${name}`,
      "-- The catalogue describes no rows, so the unmanaged-row check is omitted.",
    ].join("\n");
  }

  return [
    `-- ${name}: one refusal, checked before a single row is written.`,
    "do $$",
    "declare",
    "  offenders text;",
    "begin",
    "  select string_agg(d.id, ', ' order by d.id) into offenders",
    `    from ${table} d`,
    `   where d.id not in (${ids.map((id) => text(id)).join(", ")});`,
    "",
    "  if offenders is not null then",
    `    raise exception 'seed refused: ${name} holds rows the catalogue does not describe: %', offenders`,
    "      using hint = 'Add them to catalog.ts, or retire them with a reviewed statement. The seed never deletes a row.';",
    "  end if;",
    "end",
    "$$;",
  ].join("\n");
}

/**
 * The whole reconciliation block.
 *
 * Runs immediately after the preflight and before every write. This is what
 * replaces pruning: an unexpected row or relationship is a decision for a person,
 * so the seed stops and says which ids need that decision.
 */
function reconciliation(registry: EvidenceRegistry): string {
  const citations = registry.claims.flatMap((claim) =>
    claim.sources.map((link) => [claim.id, link.sourceId] as const),
  );
  const links = registry.recommendations.flatMap((recommendation) =>
    recommendation.claimIds.map((claimId) => [recommendation.recommendationId, claimId] as const),
  );

  return [
    "-- section: reconciliation",
    "-- The seed reconciles; it never prunes. Everything below reports and aborts",
    "-- rather than removing a row, a citation, a recommendation link or a",
    "-- revision. Removing evidence is a reviewed operator decision; see",
    "-- docs/vitalis-evidence-seed.md.",
    "",
    entityReconciliation("public.evidence_sources", registry.sources),
    "",
    entityReconciliation("public.evidence_claims", registry.claims),
    "",
    pairReconciliation(
      "public.evidence_claim_sources",
      "claim_id",
      "source_id",
      citations,
      "citations",
      "Record the citation in catalog.ts, or remove it with a reviewed statement. The seed never deletes a citation.",
    ),
    "",
    keyReconciliation(
      "public.evidence_recommendations",
      registry.recommendations.map((recommendation) => recommendation.recommendationId),
    ),
    "",
    pairReconciliation(
      "public.evidence_recommendation_claims",
      "recommendation_id",
      "claim_id",
      links,
      "recommendation links",
      "Record the link in catalog.ts, or remove it with a reviewed statement. The seed never deletes a relationship.",
    ),
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* Assembly                                                                   */
/* -------------------------------------------------------------------------- */

function header(registry: EvidenceRegistry, hashLabel: string): string {
  const sourceCount = registry.sources.length;
  const claimCount = registry.claims.length;
  const citationCount = registry.claims.reduce((total, claim) => total + claim.sources.length, 0);

  return [
    "-- Bloom Vitalis — evidence catalogue seed.",
    "--",
    "-- GENERATED FILE. Do not edit by hand.",
    "--",
    `--   source of truth  src/lib/vitalis/evidence/catalog.ts`,
    `--   generator        scripts/vitalis-evidence-seed.mjs`,
    `--   regenerate       npm run seed:evidence`,
    `--   verify           npm run seed:evidence:check`,
    "--",
    `-- format version   ${String(SEED_FORMAT_VERSION)}`,
    `-- catalogue hash   ${hashLabel}`,
    `-- rows             ${String(sourceCount)} sources, ${String(claimCount)} claims, ${String(citationCount)} citations, ${String(registry.recommendations.length)} recommendations, ${String(registry.revisions.length)} revisions`,
    "--",
    "-- What this file does, and does not do:",
    "--",
    "--   • Reconciled, not pruned. It deletes nothing at all: no source, no",
    "--     claim, no citation, no recommendation link, no revision. If the",
    "--     database holds something the catalogue does not describe, the file",
    "--     raises and the transaction is left exactly as it was found.",
    "--   • Upserts sources, claims, citations and recommendation links by stable",
    "--     id, and moves a claim to its recorded status only after its citations",
    "--     exist, because the licence gate is a trigger that also fires on",
    "--     insert.",
    "--   • Never moves a row backwards: a newer database version is not reverted,",
    "--     a recorded supersession is not cleared, an approved claim is not",
    "--     returned to draft, and a row whose content already matches is not",
    "--     touched — so applying this file to a current database is a no-op.",
    "--   • Appends revision history, and never rewrites or removes it.",
    "--   • Touches no health, authentication or other Bloom table.",
    "--",
    "-- How to apply it: a controlled administrative step, not something the app",
    "-- does at boot and not something a signed-in user can run. The operator runs",
    "-- it against the project as a single transaction, having first applied",
    "-- supabase/migrations/20261106_vitalis_evidence_foundation.sql:",
    "--",
    '--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction \\',
    "--        -f supabase/seeds/20261107_vitalis_evidence_catalog.sql",
    "--",
    "-- or paste the file into the Supabase SQL editor between a manual BEGIN/COMMIT.",
    "-- No credentials belong in this file, in the generator, or in the repository.",
    "",
  ].join("\n");
}

function preflight(): string {
  return [
    "-- section: preflight",
    "-- Fail before writing anything if the evidence schema is not present. A seed",
    "-- applied to the wrong database must not leave half a catalogue behind.",
    "do $$",
    "begin",
    "  if to_regclass('public.evidence_sources') is null",
    "     or to_regclass('public.evidence_claims') is null",
    "     or to_regclass('public.evidence_claim_sources') is null then",
    "    raise exception 'evidence tables are missing: apply 20261106_vitalis_evidence_foundation.sql first';",
    "  end if;",
    "end",
    "$$;",
    "",
  ].join("\n");
}

/**
 * Build the complete seed file.
 *
 * `hash` is a parameter so a caller can assert that the hash in the file is the
 * hash of the catalogue it was generated from, without recomputing it twice.
 */
export function buildSeedSql(
  registry: EvidenceRegistry,
  hashLabel: string = catalogHashLabel(registry),
): string {
  const parts: string[] = [header(registry, hashLabel)];

  parts.push(preflight());
  parts.push(reconciliation(registry));

  const sources = dependencyOrder(registry.sources);
  parts.push("-- section: sources");
  if (sources.length === 0) parts.push("-- (no sources)");
  for (const source of sources) {
    parts.push(sourceStatement(source));
    parts.push("");
  }

  const claims = dependencyOrder(registry.claims);
  parts.push("-- section: claims-staged");
  parts.push("-- Staged as draft: the approval gate refuses a claim with no citation yet.");
  for (const claim of claims) {
    parts.push(stagedClaimStatement(claim));
    parts.push("");
  }

  parts.push("-- section: citations");
  for (const claim of claims) {
    for (const link of claim.sources) {
      parts.push(citationStatement(claim, link));
      parts.push("");
    }
  }

  parts.push("-- section: recommendations");
  for (const recommendation of registry.recommendations) {
    parts.push(
      [
        "insert into public.evidence_recommendations as target (id, rationale)",
        `values (${text(recommendation.recommendationId)}, ${text(recommendation.rationale)})`,
        "on conflict (id) do update set",
        "    rationale = excluded.rationale,",
        "    updated_at = now()",
        "  where target.rationale is distinct from excluded.rationale;",
      ].join("\n"),
    );
    parts.push("");
  }

  parts.push("-- section: recommendation-claims");
  for (const recommendation of registry.recommendations) {
    for (const claimId of recommendation.claimIds) {
      parts.push(
        [
          "insert into public.evidence_recommendation_claims (recommendation_id, claim_id)",
          `values (${text(recommendation.recommendationId)}, ${text(claimId)})`,
          "on conflict (recommendation_id, claim_id) do nothing;",
        ].join("\n"),
      );
      parts.push("");
    }
  }

  parts.push("-- section: claims-final");
  parts.push("-- Only now, with citations in place, may a claim take its recorded status.");
  for (const claim of claims) {
    parts.push(finalClaimStatement(claim));
    parts.push("");
  }

  parts.push("-- section: revisions");
  parts.push("-- Insert-if-absent: history is append-only, so a re-run adds nothing.");
  for (const revision of registry.revisions) {
    parts.push(
      [
        "insert into public.evidence_revisions",
        "  (entity_type, entity_id, version, changed_on, changed_by, summary)",
        "select " +
          [
            text(revision.entityType),
            text(revision.entityId),
            String(revision.version),
            date(revision.changedOn),
            text(revision.changedBy),
            text(revision.summary),
          ].join(", "),
        " where not exists (",
        "   select 1 from public.evidence_revisions",
        `    where entity_type = ${text(revision.entityType)}`,
        `      and entity_id = ${text(revision.entityId)}`,
        `      and version = ${String(revision.version)}`,
        " );",
      ].join("\n"),
    );
    parts.push("");
  }

  return `${parts
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd()}\n`;
}
