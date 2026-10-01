import type { UserId } from '@bloom/shared-types';
import type { InviteSnapshot, InviteUsageSnapshot } from '@bloom/discord';
import type { ReferralSource } from '@bloom/database';

/**
 * Deciding who invited someone, from two readings of the invite list.
 *
 * Discord has no "who invited this member" field. The only mechanism is to
 * know every invite's use count before the join and compare it after, and
 * that comparison is ambiguous more often than invite-tracking bots like to
 * admit: two people can join in the same second, an invite can be created and
 * used before the next reading, and a restart loses the baseline entirely.
 *
 * This module is the whole decision, as a pure function over plain data. No
 * discord.js, no clock, no database — so every branch below is a one-line
 * test, which matters because the cost of getting it wrong is paying points
 * to the wrong person.
 *
 * The governing rule, from the brief: when attribution cannot be trusted,
 * record no inviter. There is no "best guess" branch, and adding one later
 * should require deleting a test that says so.
 */

export interface AttributionResult {
  readonly inviterId: UserId | null;
  readonly inviteCode: string | null;
  readonly source: ReferralSource;
  /** True when the identified inviter is an application, not a person. */
  readonly inviterIsBot: boolean;
}

/** The cached reading from before the join. Code → use count. */
export type InviteUsageCache = ReadonlyMap<string, number>;

const UNAVAILABLE: AttributionResult = {
  inviterId: null,
  inviteCode: null,
  source: 'unavailable',
  inviterIsBot: false,
};

const AMBIGUOUS: AttributionResult = {
  inviterId: null,
  inviteCode: null,
  source: 'ambiguous',
  inviterIsBot: false,
};

const VANITY: AttributionResult = {
  inviterId: null,
  inviteCode: null,
  source: 'vanity',
  inviterIsBot: false,
};

/**
 * Compare a cached reading with a fresh one.
 *
 * `previous` being empty is treated as no information rather than as "every
 * invite is new", which is the difference between a restart producing
 * unattributed joins and a restart paying out for every invite in the guild.
 */
export function attributeJoin(input: {
  readonly previous: InviteUsageCache | null;
  readonly current: InviteUsageSnapshot | null;
  readonly previousVanityUses: number | null;
}): AttributionResult {
  const { previous, current } = input;

  // The read failed, or we have no baseline to compare against.
  if (!current || !previous || previous.size === 0) return UNAVAILABLE;

  const advanced: InviteSnapshot[] = [];
  let unknownBaseline = 0;

  for (const invite of current.invites) {
    const before = previous.get(invite.code);

    if (before === undefined) {
      /*
       * An invite we had never seen. It may have been created and used since
       * the last reading, or created and not used — we cannot tell which, and
       * `uses === 1` is not proof because an invite can be created with uses
       * already on it only in our imagination, but it *can* have been used
       * twice between readings. Counted as uncertainty, never as a candidate.
       */
      if (invite.uses > 0) unknownBaseline += 1;
      continue;
    }

    if (invite.uses > before) advanced.push(invite);
  }

  const vanityAdvanced =
    current.vanityUses !== null &&
    input.previousVanityUses !== null &&
    current.vanityUses > input.previousVanityUses;

  // Exactly one ordinary invite advanced, nothing else moved, and no invite
  // appeared that we cannot account for. The only case that attributes.
  if (advanced.length === 1 && unknownBaseline === 0 && !vanityAdvanced) {
    const invite = advanced[0];
    if (!invite) return AMBIGUOUS;

    // An invite with no creator — widget or system — tells us a code but not
    // a person. Nothing to pay.
    if (!invite.inviterId) {
      return {
        inviterId: null,
        inviteCode: invite.code,
        source: 'ambiguous',
        inviterIsBot: false,
      };
    }

    return {
      inviterId: invite.inviterId,
      inviteCode: invite.code,
      source: 'invite_diff',
      inviterIsBot: invite.inviterIsBot,
    };
  }

  // Only the vanity URL moved: a real answer, and one with no inviter.
  if (advanced.length === 0 && unknownBaseline === 0 && vanityAdvanced) {
    return VANITY;
  }

  /*
   * Everything else is ambiguity, and they are kept separate from
   * `unavailable` on purpose: "two people joined at once" and "I could not
   * read the invites" are different operational problems, and staff looking
   * at a run of unattributed joins should be able to tell which they have.
   */
  if (advanced.length === 0 && unknownBaseline === 0 && !vanityAdvanced) {
    // Nothing moved at all. The member arrived some other way — added by an
    // OAuth bot, or through an invite deleted before we looked.
    return UNAVAILABLE;
  }

  return AMBIGUOUS;
}

/** Fold a reading into the cache shape kept between joins. */
export function toUsageCache(snapshot: InviteUsageSnapshot): Map<string, number> {
  return new Map(snapshot.invites.map((invite) => [invite.code, invite.uses]));
}
