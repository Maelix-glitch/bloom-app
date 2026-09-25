import type { Database, Sql, TransactionSql } from './client.js';

/**
 * Base for every repository.
 *
 * Repositories are the only place that writes SQL. Services depend on
 * repository *interfaces*, so a service test needs an in-memory fake rather
 * than a database — and the SQL stays in one reviewable layer instead of being
 * sprinkled through command handlers.
 *
 * Each method accepts an optional `tx`. That is what lets a caller compose
 * several repository calls into one atomic unit: claiming an idempotency key
 * and granting the points it guards must either both happen or neither.
 */
export abstract class BaseRepository {
  protected readonly db: Database;

  protected constructor(database: Database) {
    this.db = database;
  }

  /** Use the caller's transaction if there is one, otherwise the pool. */
  protected conn(tx?: TransactionSql): Sql | TransactionSql {
    return tx ?? this.db.sql;
  }

  /**
   * Escaped schema identifier, for qualifying every table reference.
   *
   * Explicit qualification rather than relying on `search_path`: if the search
   * path were ever wrong, unqualified queries would silently operate on the
   * Bloom app's `public` schema in the same Supabase project. Being explicit
   * makes that impossible.
   */
  protected get schema(): string {
    return this.db.schema;
  }
}
