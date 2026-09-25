/**
 * BLOOM COMPANION — entry point.
 *
 * Community, wellbeing and engagement: welcomes, daily check-ins, small wins,
 * achievements, milestones, Bloom Rewards, challenges and events.
 *
 * Companion never assigns roles and never moderates. It reads onboarding state
 * that Guardian writes, and the capability manifest enforces that — the role
 * and moderation services are simply not built for this process, so wiring one
 * in fails to compile rather than failing in production.
 *
 * This is the first phase in which Companion has something to do: the daily
 * check-in prompt, and the shared job administration surface that comes with
 * owning scheduled work.
 */
import { CommandDispatcher, CommandRegistry } from '@bloom/commands';
import { commandTelemetry, runBotMain, startBotProcess } from '@bloom/discord';
import type { CompanionDeps } from './deps.js';
import { companionCommands } from './commands.js';
import { createDailyCheckInJob } from './features/checkin/job.js';

await runBotMain(() =>
  startBotProcess<CompanionDeps>({
    bot: 'companion',

    createDeps(context) {
      return {
        bot: 'companion',
        config: context.platform,
        logger: context.logger,
        repositories: context.repositories,
        guilds: context.discord.guilds,
        messaging: context.discord.messaging,
        scheduler: context.scheduler,
        jobSettings: context.jobSettings,
      };
    },

    createFeatures(deps, context) {
      /*
       * Registered unconditionally; whether it fires is decided by its own
       * `enabled` flag, the global FEATURE_SCHEDULED_MESSAGES switch, and the
       * per-guild setting the scheduler's gate reads on every tick.
       *
       * Registering even when disabled is what lets `/companion jobs list` show
       * an operator a job that exists and is switched off, rather than an empty
       * list that looks like a broken deployment.
       */
      context.scheduler.register(createDailyCheckInJob(deps));

      const registry = new CommandRegistry<CompanionDeps>('companion').registerAll(
        companionCommands,
      );

      const commands = new CommandDispatcher<CompanionDeps>({
        bot: 'companion',
        config: context.platform,
        logger: context.logger,
        registry,
        deps,
        telemetry: commandTelemetry(context.repositories.telemetry),
      });

      return { commands, commandCount: registry.size };
    },
  }),
);
