/**
 * BLOOM COMPANION — entry point.
 *
 * Community, wellbeing and engagement: welcomes, daily check-ins, small wins,
 * achievements, milestones, Bloom Rewards, challenges and events.
 *
 * Companion never assigns roles and never moderates. It reads onboarding state
 * that Guardian writes, and the capability manifest enforces that — wiring a
 * role service into this process fails at construction, not at runtime.
 *
 * It still registers nothing, so the process refuses to present itself as online.
 * Phase 3 adds the engagement feature set here.
 */
import { runBotMain, startBotProcess } from '@bloom/discord';

await runBotMain(() =>
  startBotProcess({
    bot: 'companion',
    // Nothing to build yet. The shared bootstrap still validates configuration,
    // proves the database is reachable and then refuses to go online with no
    // features — an idle bot showing as online is a lie about readiness.
    createDeps: () => ({}),
    createFeatures: () => ({
      // Phase 3: check-ins, wins, rewards.
      // Phase 4: challenges, events, scheduled prompts.
    }),
  }),
);
