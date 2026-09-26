import { bloomError } from '@bloom/shared-types';
import { CommandDispatcher, CommandRegistry } from '@bloom/commands';
import { EventDispatcher } from '@bloom/events';
import { DatabaseRateLimiter, TokenBucketRateLimiter } from '@bloom/security';
import { commandTelemetry, type BotBootstrapContext } from '@bloom/discord';
import type { GuardianDeps } from './deps.js';
import { OnboardingService } from './features/onboarding/service.js';
import { ModerationActionService } from './features/moderation/service.js';
import { CaseService } from './features/moderation/case-service.js';
import { guardianCommands } from './commands.js';
import { memberJoinHandler, memberLeaveHandler } from './features/onboarding/handlers.js';
import { createStaleCaseSweepJob } from './features/jobs/stale-case-sweep.js';
import { createRetentionSweepJob } from './features/jobs/retention-sweep.js';

export function createGuardianDeps(context: BotBootstrapContext): GuardianDeps {
  const roles = context.discord.roles;
  if (!roles) {
    throw bloomError('CAPABILITY_DENIED', {
      operatorHint:
        'Guardian started without a role service. Its capability manifest must include "role:write".',
    });
  }

  const discordModeration = context.discord.moderation;
  const channelModeration = context.discord.channelModeration;

  if (!discordModeration || !channelModeration) {
    throw bloomError('CAPABILITY_DENIED', {
      operatorHint:
        'Guardian started without the moderation services. Its capability manifest must include "moderation:execute" and "message:manage".',
    });
  }

  const onboarding = new OnboardingService({
    config: context.platform,
    repositories: context.repositories,
    roles,
    messaging: context.discord.messaging,
    guilds: context.discord.guilds,
    logger: context.logger,
  });

  const moderation = new ModerationActionService({
    config: context.platform,
    repositories: context.repositories,
    guilds: context.discord.guilds,
    discord: discordModeration,
    channels: channelModeration,
    messaging: context.discord.messaging,
    logger: context.logger,
  });

  const cases = new CaseService({
    config: context.platform,
    repositories: context.repositories,
    messaging: context.discord.messaging,
    logger: context.logger,
  });

  return {
    bot: 'guardian',
    config: context.platform,
    logger: context.logger,
    repositories: context.repositories,
    scheduler: context.scheduler,
    jobSettings: context.jobSettings,
    guilds: context.discord.guilds,
    roles,
    messaging: context.discord.messaging,
    discordModeration,
    channelModeration,
    onboarding,
    moderation,
    cases,

    verifyLimiter: new DatabaseRateLimiter(
      context.repositories.cooldowns,
      context.platform.discord.guildId,
      'onboarding.verify',
      30,
    ),

    moderationLimiter: new TokenBucketRateLimiter({
      capacity: 10,
      refillPerSecond: 0.5,
    }),

    reportLimiter: new DatabaseRateLimiter(
      context.repositories.cooldowns,
      context.platform.discord.guildId,
      'moderation.report',
      60,
    ),
  };
}

export function createGuardianFeatures(deps: GuardianDeps, context: BotBootstrapContext) {
  context.scheduler
    .register(createStaleCaseSweepJob(deps))
    .register(createRetentionSweepJob(deps));

  const registry = new CommandRegistry<GuardianDeps>('guardian').registerAll(
    guardianCommands,
  );

  const commands = new CommandDispatcher<GuardianDeps>({
    bot: 'guardian',
    config: context.platform,
    logger: context.logger,
    registry,
    deps,
    telemetry: commandTelemetry(context.repositories.telemetry),
  });

  const events = new EventDispatcher<GuardianDeps>({
    bot: 'guardian',
    logger: context.logger,
    deps,
    dedupe: {
      tryClaim: async (key, ttlSeconds) => {
        const result = await context.repositories.cooldowns.tryAcquire(
          context.platform.discord.guildId,
          'event.dedupe',
          key,
          ttlSeconds,
        );

        return result.allowed;
      },
    },
  })
    .register(memberJoinHandler)
    .register(memberLeaveHandler);

  return {
    commands,
    events,
    commandCount: registry.size,
  };
}
