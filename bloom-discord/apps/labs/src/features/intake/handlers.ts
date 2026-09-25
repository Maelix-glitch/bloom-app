import { bloomError } from '@bloom/shared-types';
import type { BugArea, FeedbackCategory } from '@bloom/database';
import { requireBloomMember } from '@bloom/permissions';
import type { ModalHandler } from '@bloom/commands';
import { storableUserText } from '@bloom/utils';
import type { BloomMessage } from '@bloom/embeds';
import type { LabsDeps } from '../../deps.js';
import * as copy from './messages.js';
import { requireGuildId } from './service.js';
import {
  BUG_EXPECTED_FIELD,
  BUG_STEPS_FIELD,
  BUG_SUMMARY_FIELD,
  FEEDBACK_DETAIL_FIELD,
  FEEDBACK_SUMMARY_FIELD,
  SUMMARY_MIN,
} from './fields.js';

/**
 * Modal submissions.
 *
 * This is where a submission becomes real, and where three things have to be
 * true that the form alone cannot guarantee.
 *
 * **The policy runs again.** Discord gives a modal fifteen minutes to be
 * submitted. A member can lose ❋ Bloom Member in that window — by being
 * revoked, or by leaving and rejoining into onboarding — and the check that
 * happened when the form opened says nothing about now. The dispatcher
 * re-evaluates `policy` on submit against live role data.
 *
 * **The text is sanitised, not trusted.** Field lengths are enforced by Discord
 * client-side, which is a convenience for the member and nothing more. The
 * server re-checks, because a client-side limit is not a limit.
 *
 * **The category comes from the custom id, and is validated.** The id was
 * written by this bot from a choice list, so it should always be one of four
 * values — and "should always" is exactly the assumption worth checking before
 * it reaches a CHECK constraint.
 */

const FEEDBACK_CATEGORIES: readonly FeedbackCategory[] = [
  'feature',
  'improvement',
  'content',
  'other',
];

const BUG_AREAS: readonly BugArea[] = ['app', 'discord', 'account', 'other'];

/**
 * Read a modal field, or return null when it is blank.
 *
 * Discord sends an empty string for an untouched optional field rather than
 * omitting it, so `fields.get(x) ?? null` would store `''` where the column
 * means "not provided" and the difference would show up as an empty heading in
 * the channel post.
 */
function optionalField(
  fields: ReadonlyMap<string, string>,
  name: string,
  max: number,
): string | null {
  const raw = fields.get(name);
  if (raw === undefined) return null;
  const clean = storableUserText(raw, max);
  return clean.length > 0 ? clean : null;
}

function requiredField(
  fields: ReadonlyMap<string, string>,
  name: string,
  max: number,
): string {
  const clean = storableUserText(fields.get(name) ?? '', max);
  if (clean.length < SUMMARY_MIN) {
    // Reachable only if the client-side minimum was bypassed, which is the
    // reason to check it at all.
    throw bloomError('INVALID_INPUT', {
      userMessage: `“${name}” needs at least ${String(SUMMARY_MIN)} characters to be useful.`,
    });
  }
  return clean;
}

export const feedbackModalHandler: ModalHandler<LabsDeps> = {
  bot: 'labs',
  feature: 'feedback',
  action: 'submit',
  policy: requireBloomMember(),
  ephemeral: true,

  async execute(invocation, deps, context): Promise<BloomMessage> {
    const category = context.customId.argument;
    if (category === null || !isFeedbackCategory(category)) {
      throw bloomError('INVALID_INPUT', {
        operatorHint: `Feedback modal carried an unknown category "${String(category)}".`,
      });
    }

    const result = await deps.intake.submitFeedback({
      guildId: requireGuildId(invocation.guildId),
      userId: invocation.actor.userId,
      category,
      summary: requiredField(invocation.fields, FEEDBACK_SUMMARY_FIELD, 200),
      detail: optionalField(invocation.fields, FEEDBACK_DETAIL_FIELD, 2000),
      correlationId: invocation.correlationId,
    });

    if (result.kind === 'rate_limited') {
      return copy.rateLimited('pieces of feedback', result.limit);
    }
    return copy.feedbackSubmitted(result.posted);
  },
};

export const bugModalHandler: ModalHandler<LabsDeps> = {
  bot: 'labs',
  feature: 'bug',
  action: 'submit',
  policy: requireBloomMember(),
  ephemeral: true,

  async execute(invocation, deps, context): Promise<BloomMessage> {
    const area = context.customId.argument;
    if (area === null || !isBugArea(area)) {
      throw bloomError('INVALID_INPUT', {
        operatorHint: `Bug modal carried an unknown area "${String(area)}".`,
      });
    }

    const result = await deps.intake.fileBug({
      guildId: requireGuildId(invocation.guildId),
      userId: invocation.actor.userId,
      area,
      summary: requiredField(invocation.fields, BUG_SUMMARY_FIELD, 200),
      steps: requiredField(invocation.fields, BUG_STEPS_FIELD, 2000),
      expected: optionalField(invocation.fields, BUG_EXPECTED_FIELD, 1000),
      correlationId: invocation.correlationId,
    });

    if (result.kind === 'rate_limited') {
      return copy.rateLimited('bug reports', result.limit);
    }
    return copy.bugFiled(result.bug, result.posted);
  },
};

export const intakeModalHandlers: readonly ModalHandler<LabsDeps>[] = [
  feedbackModalHandler,
  bugModalHandler,
];

function isFeedbackCategory(value: string): value is FeedbackCategory {
  return (FEEDBACK_CATEGORIES as readonly string[]).includes(value);
}

function isBugArea(value: string): value is BugArea {
  return (BUG_AREAS as readonly string[]).includes(value);
}
