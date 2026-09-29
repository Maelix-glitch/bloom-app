import { describe, expect, it } from 'vitest';

import type {
  CompanionRepositories,
  GuardianRepositories,
  LabsRepositories,
  Repositories,
} from '@bloom/database';
import { fakeRepositories } from '@bloom/testing';

import type { JobAdminDeps } from './commands.js';

type JobAdminRepositories = JobAdminDeps['repositories'];

/*
 * `/guardian jobs`, `/companion jobs` and `/labs jobs` are one implementation
 * mounted in more than one process. It reads job runs and writes an audit event
 * for every operator action, so `jobs` and `audit` have to survive the
 * per-bot repository split in all three bots.
 *
 * These functions are never called. They fail at `tsc -p tsconfig.test.json` if
 * a future edit to the capability manifest takes either repository away from a
 * bot, which would otherwise surface as a confusing error inside an app.
 */

export function _guardianSatisfiesJobAdmin(
  repositories: GuardianRepositories,
): JobAdminRepositories {
  return repositories;
}

export function _companionSatisfiesJobAdmin(
  repositories: CompanionRepositories,
): JobAdminRepositories {
  return repositories;
}

export function _labsSatisfiesJobAdmin(
  repositories: LabsRepositories,
): JobAdminRepositories {
  return repositories;
}

export function _auditAloneIsNotEnough(
  repositories: Pick<Repositories, 'audit' | 'settings'>,
): JobAdminRepositories {
  // @ts-expect-error The job admin commands cannot work without the job run repository.
  return repositories;
}

describe('job admin repository requirements', () => {
  it('is satisfied by the shared fake repository set', () => {
    /*
     * The harnesses in `@bloom/testing` predate the split. This is the
     * regression guard that they still typecheck: one fake set, assigned to
     * each narrowed type and to the job admin surface, with no casts.
     */
    const fakes = fakeRepositories();

    const guardian: GuardianRepositories = fakes;
    const companion: CompanionRepositories = fakes;
    const labs: LabsRepositories = fakes;
    const jobAdmin: JobAdminRepositories = fakes;

    expect(guardian.onboarding).toBe(fakes.onboarding);
    expect(companion.rewards).toBe(fakes.rewards);
    expect(labs.labs).toBe(fakes.labs);
    expect(jobAdmin.jobs).toBe(fakes.jobs);
    expect(jobAdmin.audit).toBe(fakes.audit);
  });
});
