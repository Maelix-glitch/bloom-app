import { describe, expect, it } from 'vitest';

import type { Database } from '../client.js';
import {
  BOT_REPOSITORY_CAPABILITIES,
  createRepositories,
  createRepositoriesFor,
  type CompanionRepositories,
  type GuardianRepositories,
  type LabsRepositories,
} from './index.js';

/*
 * Repositories are stateless wrappers: every constructor does nothing but store
 * the connection, so the whole set can be built against a stub and inspected
 * without Postgres anywhere near the test. Nothing here issues a query.
 */
const stubDatabase = {} as unknown as Database;

const ALL_REPOSITORY_KEYS = Object.keys(createRepositories(stubDatabase)).sort();

describe('BOT_REPOSITORY_CAPABILITIES', () => {
  it('gives Guardian verification, moderation, cases and retention', () => {
    expect([...BOT_REPOSITORY_CAPABILITIES.guardian]).toEqual([
      'audit',
      'cases',
      'cooldowns',
      'idempotency',
      'identity',
      'jobs',
      'moderation',
      'onboarding',
      'retention',
      'settings',
      'telemetry',
    ]);
  });

  it('gives Companion the rewards economy and nothing that writes onboarding, moderation or cases', () => {
    expect([...BOT_REPOSITORY_CAPABILITIES.companion]).toEqual([
      'audit',
      'awards',
      'cooldowns',
      'idempotency',
      'jobs',
      'rewards',
      'settings',
      'telemetry',
    ]);
  });

  it('gives Labs the beta programme and nothing else', () => {
    expect([...BOT_REPOSITORY_CAPABILITIES.labs]).toEqual([
      'audit',
      'jobs',
      'labs',
      'settings',
      'telemetry',
    ]);
  });

  it('covers every repository the factory builds, so nothing is orphaned by the split', () => {
    const union = new Set<string>([
      ...BOT_REPOSITORY_CAPABILITIES.guardian,
      ...BOT_REPOSITORY_CAPABILITIES.companion,
      ...BOT_REPOSITORY_CAPABILITIES.labs,
    ]);

    expect([...union].sort()).toEqual(ALL_REPOSITORY_KEYS);
    expect(ALL_REPOSITORY_KEYS).toHaveLength(14);
  });

  it('keeps jobs, audit, settings and telemetry in every bot', () => {
    /*
     * These four are load-bearing for the shared plumbing, not a convenience:
     * `packages/discord/src/jobs/commands.ts` reads job runs and writes an audit
     * event for every operator action, and the bootstrap builds a job settings
     * service and a heartbeat for all three processes. Dropping one from any bot
     * would make `JobAdminDeps` unsatisfiable for that bot.
     */
    for (const keys of Object.values(BOT_REPOSITORY_CAPABILITIES)) {
      expect(keys).toContain('jobs');
      expect(keys).toContain('audit');
      expect(keys).toContain('settings');
      expect(keys).toContain('telemetry');
    }
  });

  it('withholds the repositories each bot has no business touching', () => {
    const withheld = (keys: readonly string[]): string[] =>
      ALL_REPOSITORY_KEYS.filter((key) => !keys.includes(key));

    expect(withheld(BOT_REPOSITORY_CAPABILITIES.guardian)).toEqual([
      'awards',
      'labs',
      'rewards',
    ]);
    expect(withheld(BOT_REPOSITORY_CAPABILITIES.companion)).toEqual([
      'cases',
      'identity',
      'labs',
      'moderation',
      'onboarding',
      'retention',
    ]);
    expect(withheld(BOT_REPOSITORY_CAPABILITIES.labs)).toEqual([
      'awards',
      'cases',
      'cooldowns',
      'idempotency',
      'identity',
      'moderation',
      'onboarding',
      'retention',
      'rewards',
    ]);
  });

  it('lists each bot in sorted order with no duplicates, so review diffs stay readable', () => {
    for (const keys of Object.values(BOT_REPOSITORY_CAPABILITIES)) {
      expect([...keys]).toEqual([...keys].sort());
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('createRepositoriesFor', () => {
  it('builds the same set as createRepositories, with the same classes', () => {
    const everything = createRepositories(stubDatabase);
    const guardian = createRepositoriesFor('guardian', stubDatabase);

    expect(guardian.onboarding).toBeInstanceOf(everything.onboarding.constructor);
    expect(guardian.audit).toBeInstanceOf(everything.audit.constructor);
  });

  it('narrows the type only — the runtime object is deliberately unfiltered', () => {
    /*
     * This is the honest limitation, asserted rather than buried in a comment.
     * There is no Proxy, no property deletion and no runtime check: a bot that
     * casts its way past the type still holds every repository, and it still
     * holds a connection whose database role can reach every table. The barrier
     * is the compiler, and a reviewer should know exactly how far it reaches.
     */
    const labs = createRepositoriesFor('labs', stubDatabase);

    // Declared type: five repositories. Actual object: all fourteen.
    expect(BOT_REPOSITORY_CAPABILITIES.labs).toHaveLength(5);
    expect(Object.keys(labs).sort()).toEqual(ALL_REPOSITORY_KEYS);
  });

  it('accepts a bot name that is only known at runtime', () => {
    // The bootstrap passes `options.bot`, which is a `BotName` rather than a
    // literal; the union widens to the full set, and the three apps narrow it.
    const bot = Object.keys(BOT_REPOSITORY_CAPABILITIES)[0];

    expect(bot).toBe('guardian');
    expect(() => createRepositoriesFor('companion', stubDatabase)).not.toThrow();
  });
});

/*
 * The negative half of the boundary, checked by `tsc -p tsconfig.test.json`
 * rather than at runtime. Each `@ts-expect-error` is an assertion: if a
 * repository ever leaks back into a bot's set, the directive stops matching an
 * error and the typecheck fails. Between them these cover all eighteen
 * repository/bot pairs the split removes.
 *
 * The functions are never called — they exist to be typechecked.
 */

const sink: unknown[] = [];

export function _guardianBoundaries(repositories: GuardianRepositories): void {
  sink.push(repositories.onboarding, repositories.moderation, repositories.cases);

  // @ts-expect-error Guardian does not run the rewards economy.
  sink.push(repositories.rewards);
  // @ts-expect-error Guardian does not hand out achievements.
  sink.push(repositories.awards);
  // @ts-expect-error Guardian does not run the beta programme.
  sink.push(repositories.labs);
}

export function _companionBoundaries(repositories: CompanionRepositories): void {
  sink.push(repositories.rewards, repositories.awards);

  // @ts-expect-error Only Guardian writes onboarding state; Companion reads it through Guardian.
  sink.push(repositories.onboarding);
  // @ts-expect-error Companion performs no moderation.
  sink.push(repositories.moderation);
  // @ts-expect-error Companion does not open or read cases.
  sink.push(repositories.cases);
  // @ts-expect-error Companion does not resolve Discord identities.
  sink.push(repositories.identity);
  // @ts-expect-error Companion does not run the beta programme.
  sink.push(repositories.labs);
  // @ts-expect-error Retention sweeps belong to Guardian.
  sink.push(repositories.retention);
}

export function _labsBoundaries(repositories: LabsRepositories): void {
  sink.push(repositories.labs);

  // @ts-expect-error Labs does not resolve Discord identities.
  sink.push(repositories.identity);
  // @ts-expect-error Labs does not award points.
  sink.push(repositories.rewards);
  // @ts-expect-error Labs does not hand out achievements.
  sink.push(repositories.awards);
  // @ts-expect-error Labs performs no moderation.
  sink.push(repositories.moderation);
  // @ts-expect-error Labs does not open or read cases.
  sink.push(repositories.cases);
  // @ts-expect-error Labs does not touch onboarding state.
  sink.push(repositories.onboarding);
  // @ts-expect-error Retention sweeps belong to Guardian.
  sink.push(repositories.retention);
  // @ts-expect-error Labs has no cooldown-guarded commands.
  sink.push(repositories.cooldowns);
  // @ts-expect-error Labs claims no idempotency keys.
  sink.push(repositories.idempotency);
}
