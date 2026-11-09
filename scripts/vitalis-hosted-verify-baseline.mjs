/**
 * Apply the application baseline the Vitalis migrations assume.
 *
 * Builds the *application* baseline that the real project already has, on the
 * disposable Supabase database, without using `db push`. It exists because the
 * repository's app migrations cannot be applied in filename order: several
 * August-dated files alter tables that only exist after `20260825_core_tables`.
 *
 * Strategy: apply the app-level files (everything before the Vitalis set) in a
 * fixpoint — sorted order, deferring any file that fails on a missing relation,
 * retrying until no progress is possible. Every file runs in its own
 * transaction, so a deferred file leaves nothing behind.
 *
 * The Vitalis migrations are NOT applied here: they go through the real
 * `supabase db push` afterwards, which is what U-verification needs to observe.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [host, user] = process.argv.slice(2);
if (!host || !user) {
  console.error("usage: node verify/baseline.mjs <host> <user>");
  process.exit(2);
}

const VITALIS = /_vitalis_/;
const files = readdirSync(join(root, "supabase/migrations"))
  .filter((f) => f.endsWith(".sql") && !VITALIS.test(f))
  .sort();

const client = new pg.Client({
  host,
  port: 5432,
  user,
  database: "postgres",
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120_000,
  connectionTimeoutMillis: 20_000,
});

await client.connect();

const pending = [...files];
const applied = [];
const deferred = [];
let progress = true;

while (progress && pending.length) {
  progress = false;
  for (let i = 0; i < pending.length; i += 1) {
    const file = pending[i];
    const sql = readFileSync(join(root, "supabase/migrations", file), "utf8");
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("commit");
      applied.push(file);
      pending.splice(i, 1);
      i -= 1;
      progress = true;
    } catch (error) {
      await client.query("rollback");
      if (deferred.find((d) => d.file === file)) {
        deferred.find((d) => d.file === file).error = `${error.code ?? ""} ${error.message}`;
      } else {
        deferred.push({ file, error: `${error.code ?? ""} ${error.message}` });
      }
    }
  }
}

const tables = await client.query(
  "select count(*)::int n from pg_tables where schemaname = 'public'",
);
await client.end();

console.log(`applied in fixpoint order: ${applied.length}/${files.length}`);
console.log(`order: ${applied.join(" ")}`);
console.log(`public tables: ${tables.rows[0].n}`);
if (pending.length) {
  console.log("STILL FAILING:");
  for (const entry of deferred.filter((d) => pending.includes(d.file))) {
    console.log(`  ${entry.file} -> ${entry.error}`);
  }
}
