/** Standalone config so unit tests skip the Start/Vite app pipeline entirely. */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: {
    environment: "node",
    /*
     * `.tsx` was left out of the glob, which silently skipped
     * src/hooks/usePeriodLog.sync.test.tsx — the only suite that exercises the
     * cycle sync path end to end. Include both, and let each file pick its own
     * environment with the `@vitest-environment` pragma it already carries.
     */
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    /*
     * Real-PostgreSQL integration tests (*.integration.test.ts) are NOT part
     * of the default suite: they need a live local PostgreSQL at
     * 127.0.0.1:5433/vitalis_test and fail with ECONNREFUSED without one.
     * They run under vitest.db.config.ts via `npm run test:db`.
     */
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"],
    globals: false,
  },
});
