import { describe, expect, it } from 'vitest';

import { BOT_REPOSITORY_CAPABILITIES, type GuardianRepositories } from '@bloom/database';
import { fakeRepositories } from '@bloom/testing';

import type { GuardianDeps } from './deps.js';

/*
 * Guardian's dependency container must expose exactly Guardian's repositories.
 *
 * Assignability is checked in both directions on purpose. Only the second
 * function catches the regression that matters: widening the field back to the
 * full `Repositories` would still satisfy the first, because the full set is
 * assignable to a narrower view.
 *
 * Neither function is called — they exist to be typechecked.
 */

export function _depsAreNarrowed(deps: GuardianDeps): GuardianRepositories {
  return deps.repositories;
}

export function _depsAreNoWiderThanTheManifest(
  repositories: GuardianRepositories,
): GuardianDeps['repositories'] {
  return repositories;
}

describe('GuardianDeps.repositories', () => {
  it('exposes every repository Guardian is entitled to, and takes the shared fakes', () => {
    const repositories: GuardianDeps['repositories'] = fakeRepositories();

    for (const key of BOT_REPOSITORY_CAPABILITIES.guardian) {
      expect(repositories).toHaveProperty(key);
    }

    expect(BOT_REPOSITORY_CAPABILITIES.guardian).toHaveLength(11);
  });
});
