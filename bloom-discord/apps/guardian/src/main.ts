/**
 * BLOOM GUARDIAN — entry point.
 *
 * Guardian is the highest-trust application: verification and onboarding, the
 * role lifecycle, moderation, reports and cases, audit logging and anti-spam.
 * It is the only bot with Manage Roles, and the only one holding the privileged
 * GuildMembers intent.
 *
 * At Phase 0 it registers no commands and no event handlers, so `startBotProcess`
 * refuses to bring it online rather than presenting an idle bot as a working
 * one. Phase 1 adds the onboarding feature set here.
 */
import { runBotMain, startBotProcess } from '@bloom/discord';

await runBotMain(() =>
  startBotProcess({
    bot: 'guardian',
    features: {
      // Phase 1: onboarding commands and the guildMemberAdd handler.
      // Phase 2: moderation, reports and cases.
    },
  }),
);
