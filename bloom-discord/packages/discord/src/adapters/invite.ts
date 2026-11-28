import type { Invite } from 'discord.js';
import { unsafeSnowflake, type GuildId, type UserId } from '@bloom/shared-types';
import type { InviteCreatePayload, InviteDeletePayload } from '@bloom/events';

/**
 * Invite gateway events, translated out of discord.js.
 *
 * Discord sends `INVITE_CREATE` and `INVITE_DELETE` and nothing else — there
 * is no `INVITE_UPDATE`, and a use count ticking up is never pushed. That
 * omission is the entire reason referral attribution has to diff two readings
 * of the invite list instead of listening for an event.
 *
 * What these two events are good for is the *baseline*. An invite Guardian
 * has never seen has no baseline, so a join through it cannot be attributed;
 * `INVITE_CREATE` supplies that baseline at the moment of creation.
 */

/**
 * `Invite#guild` can be a partial, and for a group-DM invite it is null. An
 * invite with no guild is not ours to track.
 */
export function toInviteCreatePayload(invite: Invite): InviteCreatePayload | null {
  const guildId = invite.guild?.id;
  if (!guildId) return null;

  return {
    guildId: unsafeSnowflake<GuildId>(guildId),
    code: invite.code,
    /*
     * `uses` is nullable on the structure. A created invite is zero, but the
     * null is reported as zero rather than guessed at — and a null here only
     * ever makes an invite *less* attributable, never more.
     */
    uses: invite.uses ?? 0,
    inviterId: invite.inviter ? unsafeSnowflake<UserId>(invite.inviter.id) : null,
    inviterIsBot: invite.inviter?.bot ?? false,
  };
}

export function toInviteDeletePayload(invite: Invite): InviteDeletePayload | null {
  const guildId = invite.guild?.id;
  if (!guildId) return null;

  return {
    guildId: unsafeSnowflake<GuildId>(guildId),
    code: invite.code,
  };
}
