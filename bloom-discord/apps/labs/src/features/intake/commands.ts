import { bloomError } from '@bloom/shared-types';
import type { BugArea, BugStatus, FeedbackCategory, TriageTarget } from '@bloom/database';
import { TRIAGE_TARGETS } from '@bloom/database';
import { requireBloomMember, requireModerator } from '@bloom/permissions';
import {
  encodeCustomId,
  type BloomCommand,
  type CommandInvocation,
  type SubcommandContribution,
} from '@bloom/commands';
import type { BloomModal } from '@bloom/embeds';
import type { LabsDeps } from '../../deps.js';
import * as copy from './messages.js';
import { requireGuildId } from './service.js';
import { FEEDBACK_FIELDS, BUG_FIELDS } from './fields.js';

/**
 * Labs' intake commands.
 *
 * ## Why these are modals
 *
 * A bug report is four fields, two of them paragraphs. As command options that
 * is a single line of autocomplete hell — Discord shows one option at a time,
 * the text is capped at what fits a chat box, and there is no way to see the
 * whole thing before sending. A modal gives a form, multi-line inputs, and a
 * draft the member can read back.
 *
 * The cost is that a modal cannot be deferred: Discord accepts it only as the
 * *initial* response, so the command itself must do no slow work before showing
 * it. That is why the policy check is all that happens here and every database
 * call lives in the submit handler.
 */

const FEEDBACK_CATEGORIES: readonly { name: string; value: FeedbackCategory }[] = [
  { name: 'Feature idea', value: 'feature' },
  { name: 'Improvement to something that exists', value: 'improvement' },
  { name: 'Content — copy, guidance, wording', value: 'content' },
  { name: 'Something else', value: 'other' },
];

const BUG_AREAS: readonly { name: string; value: BugArea }[] = [
  { name: 'Bloom app', value: 'app' },
  { name: 'This Discord server', value: 'discord' },
  { name: 'Account or sign-in', value: 'account' },
  { name: 'Something else', value: 'other' },
];

const TRIAGE_CHOICES: readonly { name: string; value: TriageTarget }[] = [
  { name: 'Triaged — confirmed and queued', value: 'TRIAGED' },
  { name: 'Fixed', value: 'FIXED' },
  { name: 'Will not fix', value: 'WONT_FIX' },
  { name: 'Duplicate', value: 'DUPLICATE' },
];

function feedbackModal(category: FeedbackCategory): BloomModal {
  return {
    // The category rides in the custom id rather than being a fifth field.
    // Discord allows five, and spending one on something already chosen from a
    // validated list would be wasteful and would let the two disagree.
    customId: encodeCustomId({
      bot: 'labs',
      feature: 'feedback',
      action: 'submit',
      argument: category,
    }),
    title: 'Share feedback',
    fields: [...FEEDBACK_FIELDS],
  };
}

function bugModal(area: BugArea): BloomModal {
  return {
    customId: encodeCustomId({
      bot: 'labs',
      feature: 'bug',
      action: 'submit',
      argument: area,
    }),
    title: 'Report a bug',
    fields: [...BUG_FIELDS],
  };
}

// -----------------------------------------------------------------------------
// /feedback
// -----------------------------------------------------------------------------

/**
 * Top-level, not `/labs feedback`.
 *
 * The one Labs command a member is likely to reach for without thinking about
 * which bot owns what. Everything else lives under the namespace.
 */
export const feedbackCommand: BloomCommand<LabsDeps> = {
  bot: 'labs',
  // A modal must be the initial response, so this must not defer.
  defer: false,
  ephemeral: true,

  spec: {
    name: 'feedback',
    description: 'Share feedback about Bloom.',
    guildOnly: true,
    options: [
      {
        type: 'string',
        name: 'category',
        description: 'What kind of feedback this is.',
        required: true,
        choices: FEEDBACK_CATEGORIES,
      },
    ],
  },

  policy: requireBloomMember(),

  async execute(invocation): Promise<void> {
    // Discord validated it against the choice list; the cast is the last step
    // of a value that has already been constrained twice.
    const category = (invocation.options.getString('category') ??
      'other') as FeedbackCategory;
    await invocation.respond.showModal(feedbackModal(category));
  },
};

export const intakeCommands: readonly BloomCommand<LabsDeps>[] = [feedbackCommand];

// -----------------------------------------------------------------------------
// /labs bug …
// -----------------------------------------------------------------------------

export const intakeSubcommands: readonly SubcommandContribution<LabsDeps>[] = [
  {
    group: 'bug',
    spec: {
      name: 'report',
      description: 'Report something that is broken.',
      options: [
        {
          type: 'string',
          name: 'area',
          description: 'Where you saw it.',
          required: true,
          choices: BUG_AREAS,
        },
      ],
    },
    defer: false,
    async execute(invocation): Promise<void> {
      const area = (invocation.options.getString('area') ?? 'other') as BugArea;
      await invocation.respond.showModal(bugModal(area));
    },
  },

  {
    group: 'bug',
    spec: {
      name: 'show',
      description: 'Look up a bug by its number.',
      options: [
        {
          type: 'integer',
          name: 'number',
          description: 'The bug number.',
          required: true,
          minValue: 1,
        },
      ],
    },
    async execute(invocation, deps, auth) {
      const bugNumber = requireNumber(invocation);
      const bug = await deps.repositories.labs.findBug(
        requireGuildId(invocation.guildId),
        bugNumber,
      );

      if (!bug) return copy.bugNotFound(bugNumber);

      /*
       * Readable by any member, not only the reporter.
       *
       * A bug report is about the software, it is already posted in a public
       * channel, and "is this known?" is the question that stops the same
       * thing being filed six times. What is gated is the triager's name.
       */
      return copy.bugDetail(bug, requireModerator()(auth).ok);
    },
  },

  {
    group: 'bug',
    spec: {
      name: 'queue',
      description: 'Bugs still waiting on someone.',
      options: [
        {
          type: 'string',
          name: 'status',
          description: 'Only this status. Defaults to everything still open.',
          required: false,
          choices: [
            { name: 'New', value: 'NEW' },
            { name: 'Triaged', value: 'TRIAGED' },
            { name: 'Fixed', value: 'FIXED' },
            { name: 'Will not fix', value: 'WONT_FIX' },
            { name: 'Duplicate', value: 'DUPLICATE' },
          ],
        },
      ],
    },
    // Reading the queue is staff work: it is a to-do list, not a catalogue.
    policy: requireModerator(),
    async execute(invocation, deps) {
      const status = invocation.options.getString('status') as BugStatus | null;
      const bugs = await deps.repositories.labs.bugQueue(
        requireGuildId(invocation.guildId),
        status ? { status } : {},
      );
      return copy.bugQueue(bugs);
    },
  },

  {
    group: 'admin',
    spec: {
      name: 'triage',
      description: 'Move a bug through triage.',
      options: [
        {
          type: 'integer',
          name: 'number',
          description: 'The bug number.',
          required: true,
          minValue: 1,
        },
        {
          type: 'string',
          name: 'status',
          description: 'Where it goes.',
          required: true,
          choices: TRIAGE_CHOICES,
        },
        {
          type: 'string',
          name: 'resolution',
          description: 'Why. Required for anything that closes the bug.',
          required: false,
          maxLength: 1000,
        },
        {
          type: 'integer',
          name: 'duplicate-of',
          description: 'For a duplicate: the bug it duplicates.',
          required: false,
          minValue: 1,
        },
      ],
    },
    policy: requireModerator(),
    async execute(invocation, deps) {
      const status = invocation.options.getString('status') ?? '';
      if (!isTriageTarget(status)) {
        throw bloomError('INVALID_INPUT', {
          operatorHint: `Triage received an unknown status "${status}".`,
        });
      }

      const result = await deps.intake.triage({
        guildId: requireGuildId(invocation.guildId),
        bugNumber: requireNumber(invocation),
        status,
        actorId: invocation.actor.userId,
        resolution: invocation.options.getString('resolution'),
        duplicateOf: invocation.options.getInteger('duplicate-of'),
        correlationId: invocation.correlationId,
      });

      switch (result.kind) {
        case 'moved':
          return copy.bugTriaged(result.bug, result.from);
        case 'unchanged':
          return copy.bugUnchanged(result.bug);
        case 'not_found':
          return copy.bugNotFound(requireNumber(invocation));
        case 'needs_resolution':
          return copy.needsResolution();
        case 'needs_duplicate_target':
          return copy.needsDuplicateTarget();
        case 'duplicate_target_missing':
          return copy.duplicateTargetMissing(result.bugNumber);
      }
    },
  },
];

/**
 * Read the required `number` option.
 *
 * Discord enforces required-ness before the interaction arrives, so this can
 * only fail if the registered spec and this code have drifted apart — which is
 * precisely the deploy-order mistake worth an explicit error over a `!`.
 */
function requireNumber(invocation: CommandInvocation): number {
  const value = invocation.options.getInteger('number');
  if (value === null) {
    throw bloomError('INVALID_INPUT', {
      operatorHint: 'A bug command arrived without its required "number" option.',
    });
  }
  return value;
}

function isTriageTarget(value: string): value is TriageTarget {
  return (TRIAGE_TARGETS as readonly string[]).includes(value);
}
