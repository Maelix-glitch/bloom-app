import { describe, expect, it } from 'vitest';
import { BloomError } from '@bloom/shared-types';
import { allowAnyone, type AuthorizationContext } from '@bloom/permissions';
import { fakeInvocation, testConfig } from '@bloom/testing';
import type { CommandInvocation } from './invocation.js';
import { namespaceCommand, type SubcommandContribution } from './namespace-command.js';

/**
 * The namespace primitive.
 *
 * Its whole reason to exist is that the published spec and the handler table
 * are derived from one list, so the tests worth having are the ones that prove
 * a mistake is caught at construction rather than at 3am in a guild.
 */

interface Deps {
  readonly marker: string;
}

function contribution(name: string, group?: string): SubcommandContribution<Deps> {
  return {
    ...(group === undefined ? {} : { group }),
    spec: { name, description: `The ${name} subcommand.` },
    execute: (_invocation, deps) =>
      Promise.resolve({ content: `${group ?? '-'}/${name}:${deps.marker}` }),
  };
}

function build(
  contributions: readonly SubcommandContribution<Deps>[],
  groupDescriptions: Readonly<Record<string, string>> = {},
): ReturnType<typeof namespaceCommand<Deps>> {
  return namespaceCommand<Deps>({
    bot: 'guardian',
    name: 'guardian',
    description: 'Guardian administration.',
    policy: allowAnyone,
    contributions,
    groupDescriptions,
  });
}

/**
 * The authorization context the dispatcher builds before calling a command.
 *
 * Constructed here rather than passed as `undefined` because a namespace
 * command hands it to each contribution's own policy — a test that skipped it
 * would be exercising a path production never takes.
 */
function authContext(invocation: CommandInvocation): AuthorizationContext {
  return {
    subject: invocation.actor,
    channelId: invocation.channelId,
    config: testConfig(),
    command: invocation.commandPath,
  };
}

describe('spec derivation', () => {
  it('derives the spec from the contributions, with no second list', () => {
    const command = build(
      [
        contribution('overview'),
        contribution('view', 'case'),
        contribution('list', 'case'),
      ],
      { case: 'Moderation cases.' },
    );

    expect(command.spec.subcommands?.map((s) => s.name)).toEqual(['overview']);
    expect(command.spec.groups?.map((g) => g.name)).toEqual(['case']);
    expect(command.spec.groups?.[0]?.subcommands.map((s) => s.name)).toEqual([
      'view',
      'list',
    ]);
  });

  it('routes to the contributing feature', async () => {
    const command = build([contribution('view', 'case')], { case: 'Cases.' });
    const { invocation } = fakeInvocation({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'view',
    });

    const message = await command.execute(
      invocation,
      { marker: 'ok' },
      authContext(invocation),
    );
    expect(message).toMatchObject({ content: 'case/view:ok' });
  });

  /**
   * A bare `overview` and a `case overview` are different commands and must not
   * collide. Flattening the key to just the subcommand name would make one of
   * them unreachable.
   */
  it('treats a bare subcommand and a grouped one of the same name as distinct', async () => {
    const command = build([contribution('overview'), contribution('overview', 'case')], {
      case: 'Cases.',
    });

    const bare = fakeInvocation({ commandName: 'guardian', subcommand: 'overview' });
    const grouped = fakeInvocation({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'overview',
    });

    expect(
      await command.execute(
        bare.invocation,
        { marker: 'x' },
        authContext(bare.invocation),
      ),
    ).toMatchObject({
      content: '-/overview:x',
    });
    expect(
      await command.execute(
        grouped.invocation,
        { marker: 'x' },
        authContext(grouped.invocation),
      ),
    ).toMatchObject({
      content: 'case/overview:x',
    });
  });
});

describe('construction-time failures', () => {
  /**
   * The failure this primitive exists to prevent. Two features contributing the
   * same path means one is silently unreachable, and *which* one depends on
   * array order — so it would work on one developer's machine and not another's.
   */
  it('refuses two contributions claiming the same path', () => {
    expect(() =>
      build([contribution('view', 'case'), contribution('view', 'case')], {
        case: 'Cases.',
      }),
    ).toThrow(BloomError);

    try {
      build([contribution('view', 'case'), contribution('view', 'case')], {
        case: 'Cases.',
      });
      expect.unreachable('duplicate path should have thrown');
    } catch (error) {
      expect(BloomError.isCode(error, 'CONFIGURATION_ERROR')).toBe(true);
    }
  });

  it('refuses a group with no description rather than inventing one', () => {
    expect(() => build([contribution('view', 'case')])).toThrow(BloomError);
  });

  /**
   * Discord caps a group at 25 subcommands. Caught here, this is a failing
   * boot; discovered at registration, it is a 400 in the middle of a deploy
   * with half the commands published.
   */
  it('refuses a group over Discord’s 25-subcommand limit', () => {
    const many = Array.from({ length: 26 }, (_unused, index) =>
      contribution(`sub${String(index)}`, 'case'),
    );

    expect(() => build(many, { case: 'Cases.' })).toThrow(BloomError);
    expect(() => build(many.slice(0, 25), { case: 'Cases.' })).not.toThrow();
  });
});

describe('routing failures', () => {
  /**
   * A guild carrying a stale registration can send a subcommand this build no
   * longer has. The operator hint has to say so, because the obvious reading —
   * "the bot is broken" — sends someone looking in the wrong place.
   */
  it('explains an unknown subcommand as a stale registration', async () => {
    const command = build([contribution('view', 'case')], { case: 'Cases.' });
    const { invocation } = fakeInvocation({
      commandName: 'guardian',
      subcommandGroup: 'case',
      subcommand: 'removed-last-release',
    });

    await expect(
      command.execute(invocation, { marker: 'x' }, authContext(invocation)),
    ).rejects.toSatisfy(
      (error: unknown) =>
        BloomError.isCode(error, 'NOT_IMPLEMENTED') &&
        error.operatorHint.includes('re-run the registrar'),
    );
  });
});
