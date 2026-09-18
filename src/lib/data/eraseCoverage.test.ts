/**
 * "Erase everything" must actually erase everything.
 *
 * This caught a real privacy failure: `public.erase_my_data()` deleted from 16
 * tables while Bloom had 31, so a person who erased their account and were told
 * "Everything has been erased." still had their close-friends list, their story
 * replies, their reactions and their viewing history on the server.
 *
 * The bug is easy to reintroduce — anyone adding a table writes a migration and
 * has no reason to think about a function in an older file. So this derives the
 * expected set from the migrations themselves: every table with a per-person
 * column must appear in the newest erase function.
 *
 * Static SQL analysis, not execution — there is no Postgres in CI. It will not
 * catch a wrong column name or a bad WHERE clause, only a table that is missing
 * entirely, which is the failure that actually happened.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS = new URL("../../../supabase/migrations", import.meta.url);

/** Columns that mean "this row belongs to a person". */
const PERSON_COLUMNS = ["user_id", "profile_id", "owner_id", "sender_id", "viewer_id"] as const;

/**
 * Global reference and access-control tables. They have no per-person rows to
 * erase even where a column looks like one, and deleting them would break the
 * app for everyone else.
 */
const GLOBAL_TABLES = new Set(["app_admins", "app_invites", "reward_items", "bloom_ranks"]);

function migrations(): { file: string; sql: string }[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((file) => ({ file, sql: readFileSync(join(MIGRATIONS.pathname, file), "utf8") }));
}

/** Every table the migrations create, with the columns declared in its body. */
function createdTables(): Map<string, { file: string; columns: string[] }> {
  const out = new Map<string, { file: string; columns: string[] }>();
  for (const { file, sql } of migrations()) {
    const re = /create table (?:if not exists )?public\.([a-z_]+)\s*\(([\s\S]*?)\n\);/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql)) !== null) {
      const [, name, body] = m;
      if (!name || !body) continue;
      const columns = body
        .split("\n")
        .map((line) => line.trim().split(/\s+/)[0] ?? "")
        .filter(Boolean);
      out.set(name, { file, columns });
    }
  }
  return out;
}

/** The body of the most recent definition of erase_my_data(). */
function latestEraseFunction(): { file: string; body: string } {
  const defs = migrations().filter((m) =>
    /create or replace function public\.erase_my_data\(\)/.test(m.sql),
  );
  const last = defs.at(-1);
  if (!last) throw new Error("no erase_my_data() definition found in migrations");
  return { file: last.file, body: last.sql };
}

describe("erase_my_data covers every per-person table", () => {
  const tables = createdTables();
  const erase = latestEraseFunction();

  const personal = [...tables.entries()]
    .filter(([name, t]) => t.columns.some((c) => (PERSON_COLUMNS as readonly string[]).includes(c)))
    .filter(([name]) => !GLOBAL_TABLES.has(name))
    .map(([name]) => name)
    .sort();

  it("found a plausible set of tables to check", () => {
    /* If this trips, the table-creation regex stopped matching and the rest of
       this file is asserting nothing. */
    expect(tables.size).toBeGreaterThan(20);
    expect(personal.length).toBeGreaterThan(20);
  });

  it("deletes from every table that holds a person's rows", () => {
    const missing = personal.filter(
      (name) => !new RegExp(`delete from public\\.${name}\\b`).test(erase.body),
    );
    expect(
      missing,
      `erase_my_data() in ${erase.file} does not delete from these tables, so "erase everything" leaves them behind: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("only ever scopes deletes to the caller", () => {
    /* A security-definer function that deletes without a uid guard would let
       one person erase another. Every per-person delete must filter on uid. */
    const deletes = [...erase.body.matchAll(/delete from public\.([a-z_]+)([^;]*);/g)];
    expect(deletes.length).toBeGreaterThan(20);
    for (const [, table, clause] of deletes) {
      if (table === "story_highlight_items") {
        /* Reached through the owner's highlights rather than a direct column. */
        expect(clause).toMatch(/story_highlights where owner_id = uid/);
        continue;
      }
      expect(clause, `${table} is deleted without a uid filter`).toMatch(/= uid\b/);
    }
  });

  it("is locked down to signed-in callers", () => {
    expect(erase.body).toMatch(/security definer/);
    expect(erase.body).toMatch(/set search_path = public, storage, auth/);
    expect(erase.body).toMatch(/revoke all on function public\.erase_my_data\(\) from public/);
    expect(erase.body).toMatch(
      /grant execute on function public\.erase_my_data\(\) to authenticated/,
    );
  });
});
