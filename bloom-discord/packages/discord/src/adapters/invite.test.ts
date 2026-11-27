import { describe, expect, it } from 'vitest';
import type { Invite } from 'discord.js';
import { EVENT_OWNERSHIP, assertCanHandle } from '@bloom/events';
import { toInviteCreatePayload, toInviteDeletePayload } from './invite.js';

/**
 * Translating invite events out of discord.js.
 *
 * Thin, but the nullable fields are the whole point: `guild` is null on a
 * group-DM invite, `uses` is nullable on the structure, and `inviter` is
 * absent for widget and system invites. Each of those reaching the referral
 * cache as a wrong value would corrupt a baseline rather than fail loudly.
 */

const invite = (overrides: Record<string, unknown> = {}): Invite =>
  ({
    code: 'bloom01',
    uses: 0,
    guild: { id: '100000000000000001' },
    inviter: { id: '100000000000000002', bot: false },
    ...overrides,
  }) as unknown as Invite;

describe('toInviteCreatePayload', () => {
  it('carries the code, the baseline and the creator', () => {
    expect(toInviteCreatePayload(invite())).toEqual({
      guildId: '100000000000000001',
      code: 'bloom01',
      uses: 0,
      inviterId: '100000000000000002',
      inviterIsBot: false,
    });
  });

  it('reports a null use count as zero', () => {
    expect(toInviteCreatePayload(invite({ uses: null }))?.uses).toBe(0);
  });

  it('keeps a non-zero use count rather than assuming a new invite is empty', () => {
    expect(toInviteCreatePayload(invite({ uses: 3 }))?.uses).toBe(3);
  });

  it('marks an application-created invite', () => {
    const payload = toInviteCreatePayload(
      invite({ inviter: { id: '100000000000000009', bot: true } }),
    );

    expect(payload?.inviterIsBot).toBe(true);
  });

  it('accepts an invite with no creator', () => {
    const payload = toInviteCreatePayload(invite({ inviter: null }));

    expect(payload?.inviterId).toBeNull();
    expect(payload?.inviterIsBot).toBe(false);
  });

  /*
   * A group-DM invite has no guild. Returning null drops it at the adapter
   * rather than letting an empty guild id reach the cache.
   */
  it('drops an invite with no guild', () => {
    expect(toInviteCreatePayload(invite({ guild: null }))).toBeNull();
  });
});

describe('toInviteDeletePayload', () => {
  it('carries the guild and the code', () => {
    expect(toInviteDeletePayload(invite())).toEqual({
      guildId: '100000000000000001',
      code: 'bloom01',
    });
  });

  it('drops an invite with no guild', () => {
    expect(toInviteDeletePayload(invite({ guild: null }))).toBeNull();
  });
});

describe('ownership of the invite events', () => {
  it('belongs to Guardian, with no observers', () => {
    for (const event of ['inviteCreate', 'inviteDelete'] as const) {
      expect(EVENT_OWNERSHIP[event].owner).toBe('guardian');
      expect(EVENT_OWNERSHIP[event].observers).toEqual([]);
    }
  });

  it('refuses registration by the bots that cannot read invites', () => {
    for (const event of ['inviteCreate', 'inviteDelete'] as const) {
      expect(() => {
        assertCanHandle('guardian', event);
      }).not.toThrow();
      expect(() => {
        assertCanHandle('companion', event);
      }).toThrow();
      expect(() => {
        assertCanHandle('labs', event);
      }).toThrow();
    }
  });

  it('explains itself, since every event ownership entry must', () => {
    for (const event of ['inviteCreate', 'inviteDelete'] as const) {
      expect(EVENT_OWNERSHIP[event].rationale.length).toBeGreaterThan(40);
    }
  });

  /*
   * There is no inviteUpdate, and there must not be one: Discord's
   * GUILD_INVITES intent covers INVITE_CREATE and INVITE_DELETE only. A use
   * count ticking up is never pushed to a gateway client, which is the
   * reason attribution re-reads and diffs instead of listening.
   */
  it('declares no invite update event, because Discord sends none', () => {
    expect(Object.keys(EVENT_OWNERSHIP)).not.toContain('inviteUpdate');
  });
});
