/**
 * BLOOM LABS — entry point.
 *
 * Beta testing, cohorts, feature feedback, voting, bug intake, experiments,
 * release notes, sneak peeks and feature status.
 *
 * Labs never assigns roles — including ◌ Beta Tester, which stays a deliberate
 * manual grant — and never moderates.
 *
 * It still registers nothing, so the process refuses to present itself as online.
 * Phase 5 adds the testing feature set here.
 */
import { runBotMain, startBotProcess } from '@bloom/discord';

await runBotMain(() =>
  startBotProcess({
    bot: 'labs',
    // See the note in Companion's entry point: no features means the bootstrap
    // deliberately refuses to bring the bot online.
    createDeps: () => ({}),
    createFeatures: () => ({
      // Phase 5: cohorts, feedback intake, voting, bug reports.
    }),
  }),
);
