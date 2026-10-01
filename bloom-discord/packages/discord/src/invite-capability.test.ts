import { describe, expect, it } from 'vitest';
import { BOT_CAPABILITIES, hasCapability, type BotName } from '@bloom/shared-types';
import { BOT_INTENTS } from './intents.js';

/** The intent names a bot subscribes to, without the rationale metadata. */
const intentsOf = (bot: BotName): readonly string[] =>
  BOT_INTENTS[bot].map((entry) => entry.intent);

/**
 * Who may read invites.
 *
 * Invite use counts name the person who brought each member in. That is the
 * most socially sensitive thing the platform reads, so the grant is pinned
 * here: Guardian only, and only because Guardian is the bot that already sees
 * joins. If this file ever needs editing, the change is a privacy decision
 * and not a refactor.
 */

const BOTS: readonly BotName[] = ['guardian', 'companion', 'labs'];

describe('the invite:read capability', () => {
  it('belongs to Guardian alone', () => {
    expect(hasCapability('guardian', 'invite:read')).toBe(true);
    expect(hasCapability('companion', 'invite:read')).toBe(false);
    expect(hasCapability('labs', 'invite:read')).toBe(false);
  });

  it('appears in exactly one manifest', () => {
    const holders = BOTS.filter((bot) =>
      (BOT_CAPABILITIES[bot] as readonly string[]).includes('invite:read'),
    );

    expect(holders).toEqual(['guardian']);
  });

  /*
   * Reading invites is the only new power. If granting it had also quietly
   * handed Guardian a role or moderation capability it did not have, this
   * list would change — so the whole manifest is pinned, not just the one
   * entry.
   */
  it('did not widen Guardian beyond the one new entry', () => {
    expect([...BOT_CAPABILITIES.guardian]).toEqual([
      'role:write',
      'role:read',
      'moderation:execute',
      'moderation:record',
      'staff:channels',
      'message:manage',
      'message:send',
      'invite:read',
      'audit:write',
    ]);
  });

  it('left the other two bots untouched', () => {
    expect([...BOT_CAPABILITIES.companion]).toEqual([
      'role:read',
      'message:send',
      'rewards:grant',
      'events:manage',
      'audit:write',
    ]);
    expect([...BOT_CAPABILITIES.labs]).toEqual([
      'role:read',
      'message:send',
      'beta:manage',
      'audit:write',
    ]);
  });
});

describe('the GuildInvites intent', () => {
  /*
   * Invite use counts arrive only to a client subscribed to GuildInvites.
   * It is not privileged, so it needs no Discord approval — but it is still
   * a scope widening and belongs to the one bot that reads invites.
   */
  it('is requested by Guardian and nobody else', () => {
    expect(intentsOf('guardian')).toContain('GuildInvites');
    expect(intentsOf('companion')).not.toContain('GuildInvites');
    expect(intentsOf('labs')).not.toContain('GuildInvites');
  });

  it('tracks the capability — the intent and the grant agree', () => {
    for (const bot of BOTS) {
      expect(intentsOf(bot).includes('GuildInvites')).toBe(
        hasCapability(bot, 'invite:read'),
      );
    }
  });

  it('marks the new intent as non-privileged', () => {
    const entry = BOT_INTENTS.guardian.find((item) => item.intent === 'GuildInvites');

    expect(entry?.privileged).toBe(false);
    // Every intent carries a written reason; an unexplained one is how scope
    // creeps.
    expect(entry?.reason.length).toBeGreaterThan(40);
  });

  it('adds no privileged intent to any bot', () => {
    // GuildMembers is the one privileged intent Bloom uses, and only Guardian
    // has it. MessageContent and GuildPresences are never requested.
    for (const bot of BOTS) {
      expect(intentsOf(bot)).not.toContain('MessageContent');
      expect(intentsOf(bot)).not.toContain('GuildPresences');
    }
    expect(intentsOf('companion')).not.toContain('GuildMembers');
    expect(intentsOf('labs')).not.toContain('GuildMembers');
  });
});
