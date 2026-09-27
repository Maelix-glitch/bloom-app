import { describe, expect, it } from 'vitest';
import { TEST_CHANNEL_IDS, TEST_GUILD_ID, TEST_USER_IDS } from '@bloom/testing';
import { companionHarness, type CompanionHarness } from '../../companion.harness.js';
import { PROMPT_COUNT, promptForDate } from './messages.js';

const JOB_KEY = 'companion.checkin.daily_prompt';

const run = (harness: CompanionHarness): Promise<void> =>
  harness.scheduler.runNow(JOB_KEY);

describe('companion.checkin.daily_prompt', () => {
  it('is registered with a schedule, a lease and an off switch', () => {
    const harness = companionHarness();
    const job = harness.scheduler.status().find((entry) => entry.key === JOB_KEY);

    expect(job).toBeDefined();
    expect(job?.enabled).toBe(true);
    expect(job?.schedule).toBe('0 9 * * *');
    expect(job?.nextRunAt).toBeInstanceOf(Date);
  });

  it('posts the prompt to the check-in channel', async () => {
    const harness = companionHarness();

    await run(harness);

    expect(harness.messaging.sent).toHaveLength(1);
    expect(harness.messaging.sent[0]?.channelId).toBe(TEST_CHANNEL_IDS.dailyCheckIn);
    expect(JSON.stringify(harness.messaging.sent[0]?.message)).toContain(
      'Daily check-in',
    );
  });

  it('posts once per cooldown window, however many times it runs', async () => {
    const harness = companionHarness();

    await run(harness);
    await run(harness);
    await run(harness);

    // A visible duplicate in a public channel is worse than a missed prompt.
    expect(harness.messaging.sent).toHaveLength(1);
    expect(harness.logs.serialised()).toContain('jobs.checkin.suppressed');
  });

  it('writes an audit row with no actor, because nobody did this', async () => {
    const harness = companionHarness();

    await run(harness);

    const event = harness.repositories.audit.events.find(
      (entry) => entry.event === 'jobs.checkin_prompt_posted',
    );
    expect(event).toBeDefined();
    expect(event?.actorId ?? null).toBeNull();
    expect(event?.botName).toBe('companion');
    expect(event?.source).toBe(JOB_KEY);
  });

  it('is disabled, not broken, when the check-in channel is unconfigured', async () => {
    const harness = companionHarness({ checkInChannel: null });
    const job = harness.scheduler.status().find((entry) => entry.key === JOB_KEY);

    expect(job?.enabled).toBe(false);
    expect(job?.nextRunAt).toBeNull();

    await run(harness);
    expect(harness.messaging.sent).toHaveLength(0);
    expect(harness.lock.runs.at(-1)?.status).toBe('succeeded');
  });

  it('is registered but disabled when scheduled messages are globally off', () => {
    const harness = companionHarness({ scheduledMessages: false });
    const job = harness.scheduler.status().find((entry) => entry.key === JOB_KEY);

    expect(job).toBeDefined();
    expect(job?.enabled).toBe(false);
  });

  /*
   * The per-guild switch. This is the case the whole gate exists for: an
   * administrator turns the prompt off, and it must stop — including when
   * someone triggers it by hand.
   */
  it('does not post when an administrator has disabled it for the guild', async () => {
    const harness = companionHarness();
    await harness.jobSettings.write(
      TEST_GUILD_ID,
      JOB_KEY,
      false,
      TEST_USER_IDS.administrator,
    );

    await run(harness);

    expect(harness.messaging.sent).toHaveLength(0);
    // No lease was taken either: writing a job_runs row for work that never
    // happened would make the table lie about how often the job ran.
    expect(harness.lock.runs).toHaveLength(0);
    expect(harness.logs.serialised()).toContain('scheduler.job_disabled');
  });

  it('posts again once the switch is turned back on', async () => {
    const harness = companionHarness();
    await harness.jobSettings.write(
      TEST_GUILD_ID,
      JOB_KEY,
      false,
      TEST_USER_IDS.administrator,
    );
    await run(harness);
    expect(harness.messaging.sent).toHaveLength(0);

    await harness.jobSettings.write(
      TEST_GUILD_ID,
      JOB_KEY,
      true,
      TEST_USER_IDS.administrator,
    );
    await run(harness);

    expect(harness.messaging.sent).toHaveLength(1);
  });
});

describe('check-in prompt copy', () => {
  it('rotates through every prompt before repeating one', () => {
    const seen = new Set<string>();
    for (let day = 0; day < PROMPT_COUNT; day += 1) {
      seen.add(promptForDate(new Date(Date.UTC(2026, 0, 1 + day))));
    }

    // A random pick would collide by chance and read as broken; indexing by day
    // guarantees a full cycle.
    expect(seen.size).toBe(PROMPT_COUNT);
  });

  it('gives the same prompt for the same day, whenever it is asked', () => {
    const morning = new Date(Date.UTC(2026, 4, 12, 9, 0, 0));
    const evening = new Date(Date.UTC(2026, 4, 12, 21, 30, 0));

    expect(promptForDate(morning)).toBe(promptForDate(evening));
  });

  it('keeps the register calm — no exclamation marks, no shouting', () => {
    for (let day = 0; day < PROMPT_COUNT; day += 1) {
      const prompt = promptForDate(new Date(Date.UTC(2026, 0, 1 + day)));
      expect(prompt).not.toContain('!');
      // No all-caps words: "HEY!!! WELCOME!!!" is explicitly ruled out, and the
      // quieter version of that is a stray shouted word.
      expect(prompt).not.toMatch(/\b[A-Z]{3,}\b/);
    }
  });

  it('never implies a streak, a score or an obligation', () => {
    const wholeCopy = Array.from({ length: PROMPT_COUNT }, (_unused, day) =>
      promptForDate(new Date(Date.UTC(2026, 0, 1 + day))),
    ).join(' ');

    // No reward inflation and no fake stats: none of these exist, and hinting
    // at them to drive engagement is exactly what the brief rules out.
    expect(wholeCopy.toLowerCase()).not.toMatch(
      /streak|points|score|rank|don't miss|must/,
    );
  });
});
