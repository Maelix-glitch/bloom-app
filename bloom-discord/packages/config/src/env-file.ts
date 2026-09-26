import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Load a `.env` file into `process.env`, if one exists.
 *
 * Uses Node's built-in `process.loadEnvFile` rather than dotenv — it has been
 * in core since 20.12 and this project targets 24, so a dependency here would
 * buy nothing.
 *
 * Real deployments inject environment variables directly and have no `.env`
 * file at all, so a missing file is not an error. A malformed one is.
 */
export function loadEnvFile(path = '.env'): { loaded: boolean; path: string } {
  const absolute = resolve(process.cwd(), path);
  if (!existsSync(absolute)) return { loaded: false, path: absolute };

  process.loadEnvFile(absolute);
  return { loaded: true, path: absolute };
}
