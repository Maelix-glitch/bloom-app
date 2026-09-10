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
    globals: false,
  },
});
