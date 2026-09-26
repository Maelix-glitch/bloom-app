import type { UserId } from '@bloom/shared-types';
import { bloomEmbed, neutralEmbed, type BloomMessage } from '@bloom/embeds';
import { discordTimestamp } from '@bloom/utils';
import type { AwardDefinition } from './definitions.js';
import type { AwardProgress } from './service.js';

/**
 * What recognition sounds like.
 *
 * The failure mode here is not being unclear, it is being too much. A milestone
 * announcement that shouts turns a quiet acknowledgement into a demand for
 * applause, and forty of those in #milestones makes the channel unreadable and
 * the recognition worthless.
 *
 * So: one line of fact, one line of warmth, nothing else. No exclamation marks,
 * no trophies, no "LEVEL UP", no @everyone. The same rules the rest of
 * Companion follows, asserted in the same way.
 */

/** Posted publicly to #milestones or #achievements. */
export function awardAnnouncement(
  definition: AwardDefinition,
  userId: UserId,
): BloomMessage {
  return {
    embeds: [
      bloomEmbed({
        title: definition.name,
        description: [
          `<@${userId}> — ${definition.condition}`,
          '',
          definition.earnedLine,
        ].join('\n'),
      }),
    ],
  };
}

/**
 * Appended to the reply of whatever action earned it.
 *
 * Kept to one line per award. Someone who has just checked in wants to know
 * they checked in; the milestone is a footnote to that, not a takeover.
 */
export function earnedLines(granted: readonly AwardDefinition[]): readonly string[] {
  if (granted.length === 0) return [];
  return ['', ...granted.map((award) => `**${award.name}** — ${award.earnedLine}`)];
}

function progressLines(entries: readonly AwardProgress[]): readonly string[] {
  return entries.map(({ definition, award }) =>
    award
      ? `**${definition.name}** · ${discordTimestamp(award.earnedAt, 'D')}`
      : `${definition.name} · ${definition.condition}`,
  );
}

export function milestonesMessage(entries: readonly AwardProgress[]): BloomMessage {
  const earned = entries.filter((entry) => entry.award !== null);

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Milestones',
        description: [
          `${String(earned.length)} of ${String(entries.length)} reached.`,
          '',
          ...progressLines(entries),
          '',
          // Said plainly, because the alternative is members assuming there is
          // a trick to it.
          'Milestones are counts of things you have actually done. None of them expire, and none of them award points.',
        ].join('\n'),
      }),
    ],
  };
}

export function achievementsMessage(entries: readonly AwardProgress[]): BloomMessage {
  const earned = entries.filter((entry) => entry.award !== null);

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Achievements',
        description: [
          `${String(earned.length)} of ${String(entries.length)} earned.`,
          '',
          ...progressLines(entries),
          '',
          'There is nothing here for a perfect run. Missing a day never costs you one of these.',
        ].join('\n'),
      }),
    ],
  };
}

/* -----------------------------------------------------------------------------
 * Staff awards
 * ---------------------------------------------------------------------------*/

export function manualAwardMessage(input: {
  readonly userId: UserId;
  readonly points: number;
  readonly balance: number;
  readonly reason: string;
}): BloomMessage {
  const verb = input.points >= 0 ? 'Added' : 'Removed';
  const amount = Math.abs(input.points);

  return {
    ephemeral: true,
    embeds: [
      bloomEmbed({
        title: 'Points adjusted',
        description: [
          `${verb} ${String(amount)} points for <@${input.userId}>.`,
          `New total: ${String(input.balance)}.`,
          '',
          `Reason: ${input.reason}`,
          '',
          // Staff should know this is on the record before they do it again.
          'Recorded in the ledger against your name, and in the audit log.',
        ].join('\n'),
      }),
    ],
  };
}

export function manualAwardRefusedMessage(input: {
  readonly reason: 'limit' | 'insufficient' | 'duplicate';
  readonly limit: number;
  readonly balance?: number;
}): BloomMessage {
  const description =
    input.reason === 'limit'
      ? [
          `A single adjustment is capped at ${String(input.limit)} points.`,
          '',
          'Not a permission check — administrators are trusted — but a mistyped zero is not recoverable in any way a member would find satisfying. Make two awards if you meant it.',
        ].join('\n')
      : input.reason === 'insufficient'
        ? [
            `That would take the balance below zero. It currently stands at ${String(input.balance ?? 0)}.`,
            '',
            'Balances are a sum of the ledger, and the ledger has no negative totals.',
          ].join('\n')
        : 'That adjustment was already recorded. Nothing was applied twice.';

  return {
    ephemeral: true,
    embeds: [neutralEmbed({ title: 'Not applied', description })],
  };
}
