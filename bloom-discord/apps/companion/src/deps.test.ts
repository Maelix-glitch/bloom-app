import { describe, expect, it } from 'vitest';

import { BOT_REPOSITORY_CAPABILITIES, type CompanionRepositories } from '@bloom/database';
import { fakeRepositories } from '@bloom/testing';

import type { CompanionDeps } from './deps.js';

/*
 * Companion's dependency container must expose exactly Companion's repositories.
 *
 * Assignability is checked in both directions on purpose. Only the second
 * function catches the regression that matters: widening the field back to the
 * full `Repositories` would still satisfy the first, because the full set is
 * assignable to a narrower view.
 *
 * Neither function is called — they exist to be typechecked.
 */

export function _depsAreNarrowed(deps: CompanionDeps): CompanionRepositories {
  return deps.repositories;
}

export function _depsAreNoWiderThanTheManifest(
  repositories: CompanionRepositories,
): CompanionDeps['repositories'] {
  return repositories;
}

describe('CompanionDeps.repositories', () => {
  it('exposes every repository Companion is entitled to, and takes the shared fakes', () => {
    const repositories: CompanionDeps['repositories'] = fakeRepositories();

    for (const key of BOT_REPOSITORY_CAPABILITIES.companion) {
      expect(repositories).toHaveProperty(key);
    }

    /*
     * Ten since challenges and events: Companion owns `community_activities`
     * and `community_participants` outright. Pinned so a future feature that
     * reaches for Guardian's or Labs' tables has to change this number and
     * explain itself.
     */
    expect(BOT_REPOSITORY_CAPABILITIES.companion).toHaveLength(10);
  });
});
