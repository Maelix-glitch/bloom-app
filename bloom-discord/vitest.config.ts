import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/**
 * One Vitest project for the whole workspace.
 *
 * Tests resolve `@bloom/*` to each package's **source**, not its build output.
 * That means `pnpm test` works on a clean checkout without a build step, and a
 * failing assertion points at the line you would edit rather than at a
 * generated `.js` file. The published `exports` still point at `dist`, so
 * production resolution is unaffected.
 */
const packages = [
  'shared-types',
  'utils',
  'validation',
  'logging',
  'config',
  'database',
  'security',
  'permissions',
  'embeds',
  'commands',
  'events',
  'discord',
  'testing',
];

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      packages.map((name) => [`@bloom/${name}`, here(`./packages/${name}/src/index.ts`)]),
    ),
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'scripts/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],

    /*
     * Integration tests are opt-in. They need a real Postgres, and a suite that
     * fails on a laptop without one trains people to ignore red builds. CI sets
     * BLOOM_INTEGRATION_TESTS=1 with a database service attached.
     */
    ...(process.env['BLOOM_INTEGRATION_TESTS'] === '1'
      ? {}
      : { exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'] }),

    // Anything slower than this is either doing real I/O it should not be, or
    // waiting on a timer it should be faking.
    testTimeout: 5_000,
    hookTimeout: 10_000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        '**/index.ts',
        '**/*.test.ts',
        // Fakes are exercised by the tests that use them; measuring them
        // separately inflates the number without telling anyone anything.
        'packages/testing/src/**',
        // CLI entry points are covered by the scripts' own smoke tests.
        'packages/database/src/cli/**',
      ],
    },
  },
});
