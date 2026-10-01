import type {
  EventHandler,
  InviteCreatePayload,
  InviteDeletePayload,
} from '@bloom/events';
import type { GuardianDeps } from '../../deps.js';

/**
 * Keeping the invite baseline current.
 *
 * These two handlers exist so that referral attribution does not have to
 * treat every newly created invite as uncertainty. Neither writes to the
 * database, neither posts anything, and neither can fail in a way a member
 * would notice — they maintain an in-process map and nothing else.
 *
 * There is deliberately no third handler for "an invite was used". Discord
 * does not send one: `GUILD_INVITES` covers `INVITE_CREATE` and
 * `INVITE_DELETE` only, and a use count ticking up is never pushed to a
 * gateway client. That gap is precisely why attribution re-reads the invite
 * list on each join and diffs it, and no amount of event handling removes the
 * need for that read.
 */

export const inviteCreateHandler: EventHandler<InviteCreatePayload, GuardianDeps> = {
  event: 'inviteCreate',
  bot: 'guardian',
  name: 'referrals.invite-create',

  /*
   * A resume replays buffered events, so this can arrive twice. Recording the
   * same code at the same use count twice is already harmless — the map
   * assignment is idempotent — but the key makes that explicit rather than
   * accidental, and keeps the dispatcher's log honest about what it skipped.
   */
  dedupeKey(payload) {
    return `invite-create:${payload.guildId}:${payload.code}`;
  },

  handle(payload, deps) {
    deps.referrals.rememberInvite({
      guildId: payload.guildId,
      code: payload.code,
      uses: payload.uses,
    });
    return Promise.resolve();
  },
};

export const inviteDeleteHandler: EventHandler<InviteDeletePayload, GuardianDeps> = {
  event: 'inviteDelete',
  bot: 'guardian',
  name: 'referrals.invite-delete',

  dedupeKey(payload) {
    return `invite-delete:${payload.guildId}:${payload.code}`;
  },

  handle(payload, deps) {
    deps.referrals.forgetInvite(payload.guildId, payload.code);
    return Promise.resolve();
  },
};
