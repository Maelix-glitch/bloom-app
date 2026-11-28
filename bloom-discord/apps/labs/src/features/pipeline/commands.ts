import { bloomError } from '@bloom/shared-types';
import {
  LABS_FEATURE_STATUSES,
  LABS_FEATURE_STATUS_LABELS,
  type LabsFeatureStatus,
} from '@bloom/database';
import { requireStaffCapability } from '@bloom/permissions';
import type { SubcommandContribution } from '@bloom/commands';
import type { LabsDeps } from '../../deps.js';
import * as copy from './messages.js';
import { requireGuildId } from '../intake/service.js';

/**
 * The pipeline commands: `/labs feature status`, `/labs vote`,
 * `/labs cohort …`, `/labs release latest`, and the staff writers under
 * `/labs admin …`.
 *
 * Member commands are reads and self-service writes (a backing, a cohort
 * seat) — the namespace's Bloom Member floor covers them. Every staff
 * writer takes `staff.labs.triage`, the same capability that moves a bug:
 * one write tier for Labs, stated once.
 */

const STATUS_CHOICES: readonly { name: string; value: LabsFeatureStatus }[] =
  LABS_FEATURE_STATUSES.map((status) => ({
    name: LABS_FEATURE_STATUS_LABELS[status],
    value: status,
  }));

function isFeatureStatus(value: string): value is LabsFeatureStatus {
  return (LABS_FEATURE_STATUSES as readonly string[]).includes(value);
}

function requireOption(
  invocation: { options: { getString(name: string): string | null } },
  name: string,
): string {
  const value = invocation.options.getString(name);
  if (!value) {
    throw bloomError('INVALID_INPUT', {
      operatorHint: `A pipeline command reached execution without its "${name}" option.`,
    });
  }
  return value;
}

export const pipelineSubcommands: readonly SubcommandContribution<LabsDeps>[] = [
  // ---------------------------------------------------------------------------
  // /labs feature status
  // ---------------------------------------------------------------------------
  {
    group: 'feature',
    spec: {
      name: 'status',
      description: 'What the team is working on, and what is being shaped.',
      options: [
        {
          type: 'string',
          name: 'name',
          description: 'One feature, by name. Omit for the whole pipeline.',
          required: false,
          maxLength: 80,
        },
      ],
    },
    async execute(invocation, deps) {
      const guildId = requireGuildId(invocation.guildId);
      const name = invocation.options.getString('name');

      if (name) {
        const feature = await deps.repositories.labs.findFeatureByName(guildId, name);
        if (!feature) return copy.featureNotFoundMessage(name);
        const voted = await deps.repositories.labs.hasVoted(
          feature.id,
          invocation.actor.userId,
        );
        return copy.featureDetailMessage(feature, voted);
      }

      const { features, votedIds } = await deps.pipeline.listFeatures(
        guildId,
        invocation.actor.userId,
      );
      return copy.featureListMessage(features, votedIds);
    },
  },

  // ---------------------------------------------------------------------------
  // /labs vote
  // ---------------------------------------------------------------------------
  {
    spec: {
      name: 'vote',
      description: 'Back a feature on the pipeline — or withdraw your backing.',
      options: [
        {
          type: 'string',
          name: 'feature',
          description: 'The feature name, as shown by /labs feature status.',
          required: true,
          maxLength: 80,
        },
      ],
    },
    async execute(invocation, deps) {
      const guildId = requireGuildId(invocation.guildId);
      const name = requireOption(invocation, 'feature');
      const result = await deps.pipeline.vote(guildId, name, invocation.actor.userId);
      switch (result.kind) {
        case 'voted':
          return copy.voteRecordedMessage(result.feature);
        case 'withdrawn':
          return copy.voteWithdrawnMessage(result.feature);
        case 'closed':
          return copy.voteClosedMessage(result.feature);
        case 'not_found':
          return copy.featureNotFoundMessage(name);
      }
    },
  },

  // ---------------------------------------------------------------------------
  // /labs cohort …
  // ---------------------------------------------------------------------------
  {
    group: 'cohort',
    spec: {
      name: 'list',
      description: 'The beta cohorts, and whether you are in them.',
      options: [],
    },
    async execute(invocation, deps) {
      const { cohorts, memberIds } = await deps.pipeline.listCohorts(
        requireGuildId(invocation.guildId),
        invocation.actor.userId,
      );
      return copy.cohortListMessage(cohorts, memberIds);
    },
  },
  {
    group: 'cohort',
    spec: {
      name: 'join',
      description: 'Put your name down for a beta cohort.',
      options: [
        {
          type: 'string',
          name: 'name',
          description: 'The cohort name, as shown by /labs cohort list.',
          required: true,
          maxLength: 60,
        },
      ],
    },
    async execute(invocation, deps) {
      const guildId = requireGuildId(invocation.guildId);
      const name = requireOption(invocation, 'name');
      const outcome = await deps.repositories.labs.joinCohort(
        guildId,
        name,
        invocation.actor.userId,
      );
      switch (outcome.kind) {
        case 'joined':
          return copy.cohortJoinedMessage(outcome.cohort);
        case 'already_member':
          return copy.cohortAlreadyMemberMessage(outcome.cohort);
        case 'closed':
          return copy.cohortClosedMessage(outcome.cohort);
        case 'not_found':
          return copy.cohortNotFoundMessage(name);
      }
    },
  },
  {
    group: 'cohort',
    spec: {
      name: 'leave',
      description: 'Take your name off a beta cohort.',
      options: [
        {
          type: 'string',
          name: 'name',
          description: 'The cohort name.',
          required: true,
          maxLength: 60,
        },
      ],
    },
    async execute(invocation, deps) {
      const guildId = requireGuildId(invocation.guildId);
      const name = requireOption(invocation, 'name');
      const outcome = await deps.repositories.labs.leaveCohort(
        guildId,
        name,
        invocation.actor.userId,
      );
      switch (outcome.kind) {
        case 'left':
          return copy.cohortLeftMessage(outcome.cohort);
        case 'not_member':
          return copy.cohortNotMemberMessage(outcome.cohort);
        case 'not_found':
          return copy.cohortNotFoundMessage(name);
      }
    },
  },

  // ---------------------------------------------------------------------------
  // /labs release latest
  // ---------------------------------------------------------------------------
  {
    group: 'release',
    spec: {
      name: 'latest',
      description: 'The most recent release notes.',
      options: [],
    },
    async execute(invocation, deps) {
      const note = await deps.repositories.labs.latestRelease(
        requireGuildId(invocation.guildId),
      );
      return note ? copy.releaseMessage(note) : copy.noReleaseMessage();
    },
  },

  // ---------------------------------------------------------------------------
  // /labs admin … (staff writers)
  // ---------------------------------------------------------------------------
  {
    group: 'admin',
    spec: {
      name: 'feature-add',
      description: 'Add a feature to the pipeline.',
      options: [
        {
          type: 'string',
          name: 'name',
          description: 'The feature name members will see and vote on.',
          required: true,
          maxLength: 80,
        },
        {
          type: 'string',
          name: 'description',
          description: 'One short paragraph on what it is.',
          required: false,
          maxLength: 500,
        },
      ],
    },
    policy: requireStaffCapability('staff.labs.triage'),
    async execute(invocation, deps) {
      const result = await deps.pipeline.createFeature({
        guildId: requireGuildId(invocation.guildId),
        name: requireOption(invocation, 'name'),
        description: invocation.options.getString('description'),
        actorId: invocation.actor.userId,
        correlationId: invocation.correlationId,
      });
      return result.kind === 'created'
        ? copy.featureCreatedMessage(result.feature)
        : copy.featureExistsMessage(result.feature);
    },
  },
  {
    group: 'admin',
    spec: {
      name: 'feature-status',
      description: 'Move a feature along the pipeline.',
      options: [
        {
          type: 'string',
          name: 'name',
          description: 'The feature name.',
          required: true,
          maxLength: 80,
        },
        {
          type: 'string',
          name: 'status',
          description: 'Where it goes.',
          required: true,
          choices: STATUS_CHOICES,
        },
      ],
    },
    policy: requireStaffCapability('staff.labs.triage'),
    async execute(invocation, deps) {
      const status = requireOption(invocation, 'status');
      if (!isFeatureStatus(status)) {
        throw bloomError('INVALID_INPUT', {
          operatorHint: `Feature status received an unknown value "${status}".`,
        });
      }
      const name = requireOption(invocation, 'name');
      const result = await deps.pipeline.setFeatureStatus({
        guildId: requireGuildId(invocation.guildId),
        name,
        status,
        actorId: invocation.actor.userId,
        correlationId: invocation.correlationId,
      });
      return result.kind === 'updated'
        ? copy.featureStatusSetMessage(result.feature)
        : copy.featureNotFoundMessage(name);
    },
  },
  {
    group: 'admin',
    spec: {
      name: 'cohort-create',
      description: 'Open a beta cohort.',
      options: [
        {
          type: 'string',
          name: 'name',
          description: 'The cohort name members will join by.',
          required: true,
          maxLength: 60,
        },
        {
          type: 'string',
          name: 'description',
          description: 'What this cohort is testing.',
          required: false,
          maxLength: 300,
        },
        {
          type: 'boolean',
          name: 'closed',
          description: 'Start closed to new members.',
          required: false,
        },
      ],
    },
    policy: requireStaffCapability('staff.labs.triage'),
    async execute(invocation, deps) {
      const result = await deps.pipeline.createCohort({
        guildId: requireGuildId(invocation.guildId),
        name: requireOption(invocation, 'name'),
        description: invocation.options.getString('description'),
        joinable: invocation.options.getBoolean('closed') !== true,
        actorId: invocation.actor.userId,
        correlationId: invocation.correlationId,
      });
      return result.kind === 'created'
        ? copy.cohortCreatedMessage(result.cohort)
        : copy.cohortExistsMessage(result.cohort);
    },
  },
  {
    group: 'admin',
    spec: {
      name: 'release-publish',
      description: 'Publish release notes as the latest release.',
      options: [
        {
          type: 'string',
          name: 'version',
          description: 'The version label, e.g. 1.4.0.',
          required: true,
          maxLength: 40,
        },
        {
          type: 'string',
          name: 'title',
          description: 'The headline of this release.',
          required: true,
          maxLength: 120,
        },
        {
          type: 'string',
          name: 'notes',
          description: 'The notes themselves.',
          required: true,
          maxLength: 4000,
        },
      ],
    },
    policy: requireStaffCapability('staff.labs.triage'),
    async execute(invocation, deps) {
      const { note, posted } = await deps.pipeline.publishRelease({
        guildId: requireGuildId(invocation.guildId),
        version: requireOption(invocation, 'version'),
        title: requireOption(invocation, 'title'),
        body: requireOption(invocation, 'notes'),
        actorId: invocation.actor.userId,
        correlationId: invocation.correlationId,
      });
      return copy.releasePublishedMessage(note, posted);
    },
  },
];
