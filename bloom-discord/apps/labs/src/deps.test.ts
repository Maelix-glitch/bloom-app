import { describe, expect, it } from 'vitest';

import { BOT_REPOSITORY_CAPABILITIES, type LabsRepositories } from '@bloom/database';
import { fakeRepositories } from '@bloom/testing';

import type { LabsDeps } from './deps.js';

/*
 * Labs's dependency container must expose exactly Labs's repositories.
 *
 * Assignability is checked in both directions on purpose. Only the second
 * function catches the regression that matters: widening the field back to the
 * full `Repositories` would still satisfy the first, because the full set is
 * assignable to a narrower view.
 *
 * Neither function is called — they exist to be typechecked.
 */

export function _depsAreNarrowed(deps: LabsDeps): LabsRepositories {
  return deps.repositories;
}

export function _depsAreNoWiderThanTheManifest(
  repositories: LabsRepositories,
): LabsDeps['repositories'] {
  return repositories;
}

describe('LabsDeps.repositories', () => {
  it('exposes every repository Labs is entitled to, and takes the shared fakes', () => {
    const repositories: LabsDeps['repositories'] = fakeRepositories();

    for (const key of BOT_REPOSITORY_CAPABILITIES.labs) {
      expect(repositories).toHaveProperty(key);
    }

    expect(BOT_REPOSITORY_CAPABILITIES.labs).toHaveLength(5);
  });
});
