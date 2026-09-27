// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * The important rules here are not the style ones — Prettier handles those.
 * They are the two architectural constraints that this codebase depends on:
 *
 *   1. discord.js may only be imported from packages/discord. That is what keeps
 *      business logic testable and survivable across Discord API changes.
 *   2. No floating promises and no unsafe `any`. In a gateway process an
 *      unawaited rejection is an unhandled rejection, which is a dead bot.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      'eslint.config.js',
    ],
  },

  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        /*
         * Explicit project list rather than `projectService: true`.
         *
         * Package tsconfigs exclude `*.test.ts` so tests never reach dist/,
         * which means the project service cannot find a config for them.
         * tsconfig.test.json covers the tests, the scripts and the tooling
         * configs, so every file the linter sees belongs to exactly one
         * project and all of them get fully type-aware rules.
         */
        project: [
          './tsconfig.test.json',
          './packages/*/tsconfig.json',
          './apps/*/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // `any` is banned by the brief. Keep the escape hatch explicit and loud.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // A dropped promise in a long-lived process is a silent failure.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/return-await': ['error', 'always'],

      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      /*
       * Exhaustiveness is enforced where it protects a domain invariant, but
       * not for switches over the error catalog: those deliberately map a large
       * union onto a few buckets and always carry a `default`. Requiring every
       * arm would mean editing four unrelated switches every time an error code
       * is added, which is how `default` branches end up being deleted.
       */
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],

      /*
       * `noUncheckedIndexedAccess` is on, so array and regex-group access is
       * typed as possibly-undefined even immediately after a length or match
       * check. `!` is the idiomatic answer there. `any` remains banned — that
       * is the rule the brief actually cares about.
       */
      '@typescript-eslint/no-non-null-assertion': 'off',

      // §31.16 of the brief: never log credentials. console bypasses the logger
      // (and therefore bypasses redaction), so it is banned in library code.
      'no-console': 'error',

      // §49: no dynamic code execution.
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            'Math.random() is not acceptable for ids, tokens or jitter seeds. Use crypto from @bloom/utils.',
        },
      ],
    },
  },

  // ── Architectural boundary ────────────────────────────────────────────────
  // discord.js lives behind the adapter in packages/discord. Everything else
  // talks to ports defined in @bloom/discord, so it can be tested with fakes.
  {
    files: ['packages/**/*.ts', 'apps/**/*.ts', 'scripts/**/*.ts'],
    ignores: ['packages/discord/**/*.ts', 'packages/testing/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'discord.js',
              message:
                'discord.js may only be imported inside packages/discord. Depend on the ports exported by @bloom/discord instead.',
            },
            {
              name: '@discordjs/rest',
              message: 'Use the REST adapter exported by @bloom/discord.',
            },
          ],
        },
      ],
    },
  },

  // Tests may reach for fakes and shout at the console.
  {
    files: ['**/*.test.ts', 'packages/testing/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      'no-console': 'off',
    },
  },

  // The CLI scripts are the one place whose whole job is writing to stdout.
  {
    files: ['scripts/**/*.ts', 'packages/*/src/cli/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
