/**
 * BLOOM LABS — entry point.
 *
 * Beta testing, cohorts, feature feedback, voting, bug intake, experiments,
 * release notes, sneak peeks and feature status.
 *
 * Labs never assigns roles — including ◌ Beta Tester, which stays a deliberate
 * manual grant — and never moderates. The capability manifest enforces both:
 * the role and moderation services are not built for this process.
 *
 * Phase 7 brings it online with the intake spine — feedback, bug reports and
 * triage — and with the platform's first modal-driven flow.
 */
import {
  CommandDispatcher,
  CommandRegistry,
  InteractionDispatcher,
} from '@bloom/commands';
import { commandTelemetry, runBotMain, startBotProcess } from '@bloom/discord';
import type { LabsDeps } from './deps.js';
import { labsCommands } from './commands.js';
import { intakeModalHandlers } from './features/intake/handlers.js';
import { IntakeService } from './features/intake/service.js';

await runBotMain(() =>
  startBotProcess<LabsDeps>({
    bot: 'labs',

    createDeps(context) {
      const intake = new IntakeService({
        config: context.platform,
        repositories: context.repositories,
        messaging: context.discord.messaging,
        logger: context.logger,
      });

      return {
        bot: 'labs',
        config: context.platform,
        logger: context.logger,
        repositories: context.repositories,
        guilds: context.discord.guilds,
        messaging: context.discord.messaging,
        intake,
      };
    },

    createFeatures(deps, context) {
      const registry = new CommandRegistry<LabsDeps>('labs').registerAll(labsCommands);

      const commands = new CommandDispatcher<LabsDeps>({
        bot: 'labs',
        config: context.platform,
        logger: context.logger,
        registry,
        deps,
        telemetry: commandTelemetry(context.repositories.telemetry),
      });

      const interactions = new InteractionDispatcher<LabsDeps>({
        bot: 'labs',
        config: context.platform,
        logger: context.logger,
        deps,
        modals: intakeModalHandlers,
      });

      return {
        commands,
        interactions,
        commandCount: registry.size,
        interactionCount: interactions.size,
      };
    },
  }),
);
