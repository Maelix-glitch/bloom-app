/** Dedicated config for the Vitalis real-PostgreSQL integration suite.
 *
 * These tests need a live local PostgreSQL at 127.0.0.1:5433 with a
 * `vitalis_test` database (see src/lib/vitalis/db/harness.ts; connection
 * settings can be overridden through the VITEST_POSTGRES_* env vars).
 * They are excluded from the default vitest.config.ts so `npm test`
 * stays green without a database; run them explicitly with:
 *
 *   npm run test:db
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globals: false,
    /* Real database round-trips per test (schema + six migrations inside a
     * transaction) are slower than unit tests; give them room. */
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
