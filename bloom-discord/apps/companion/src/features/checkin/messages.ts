import { bloomEmbed, type BloomMessage } from '@bloom/embeds';

/**
 * The daily check-in prompt.
 *
 * Tone is a requirement, not a preference, so the words live here where they
 * can be read in one pass and reviewed as writing. The register is calm and
 * plain: no exclamation marks, no emoji confetti, no manufactured enthusiasm.
 * This is a wellbeing community, and a prompt that shouts at someone having a
 * difficult morning is worse than no prompt.
 *
 * Every line below is an invitation that can be declined. Nothing implies a
 * streak, a score or an obligation, because none of those exist — and inventing
 * the feeling of them to drive engagement is exactly the reward inflation the
 * brief rules out.
 */

/**
 * Prompts rotate by day so the channel does not read like a cron job.
 *
 * Deliberately a fixed, ordered list rather than a random pick. Random
 * selection repeats by chance, and "it asked the same thing three days running"
 * reads as broken. Indexing by the day of the year guarantees a full cycle
 * before anything recurs, and makes the output reproducible in a test.
 */
const PROMPTS: readonly string[] = [
  'What is one small thing you would like to get done today?',
  'How are you arriving today — rested, tired, somewhere in between?',
  'Is there something you have been putting off that you could make a start on?',
  'What would make today feel manageable?',
  'What is taking up most of your attention at the moment?',
  'Is there anything you would like to set down for the day?',
  'What is one thing that went better than expected recently?',
];

/**
 * Picks the prompt for a given day.
 *
 * Exported so the job can pass the scheduled date and a test can pin it. Uses
 * the UTC date parts rather than the local ones: the caller has already decided
 * which moment this is, and reinterpreting it against the runner's own timezone
 * would make the same scheduled run produce different text on two machines.
 */
export function promptForDate(date: Date): string {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000);
  // `% length` is always in range and never negative for a real date.
  return PROMPTS[dayOfYear % PROMPTS.length] ?? PROMPTS[0]!;
}

export function dailyCheckInPrompt(date: Date): BloomMessage {
  return {
    embeds: [
      bloomEmbed({
        title: 'Daily check-in',
        description: [
          promptForDate(date),
          '',
          'Reply here if you would like to. There is no wrong answer, and skipping a day costs you nothing.',
        ].join('\n'),
        timestamp: date,
      }),
    ],
  };
}

/** How many prompts exist, so a test can assert the rotation covers them all. */
export const PROMPT_COUNT = PROMPTS.length;
