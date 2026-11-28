import { beforeEach, describe, expect, it } from 'vitest';
import {
  TEST_CHANNEL_IDS,
  TEST_GUILD_ID,
  TEST_USER_IDS,
  testSubject,
} from '@bloom/testing';
import type { GuildId, UserId } from '@bloom/shared-types';
import { MODERATOR_STAFF_CAPABILITIES } from '@bloom/permissions';
import { companionHarness, type CompanionHarness } from '../../companion.harness.js';
import { BOARD_CATEGORIES, supportsAllTime } from './service.js';
import { recapMessage } from './messages.js';
import { createWeeklyRecapJob } from './job.js';

/**
 * Highlights, boards and the weekly recap.
 *
 * Everything in this feature is a read, so the properties worth defending are
 * different from the rest of Companion. Nothing here can pay twice or
 * oversubscribe a capacity. What it *can* do is show a member something that
 * was not theirs to see, rank people in an order that changes when nothing
 * has changed, or publish the same week twice to a public channel — so those
 * are what the tests are about.
 */

const member = TEST_USER_IDS.member;
const other = TEST_USER_IDS.newcomer;
const third = TEST_USER_IDS.betaTester;
const admin = TEST_USER_IDS.administrator;
const moderator = TEST_USER_IDS.moderator;

const RECAP_JOB = 'companion.community.weekly_recap';

let h: CompanionHarness;
let now = new Date('2026-03-12T09:00:00.000Z');

const asMember = (userId: UserId = member): ReturnType<typeof testSubject> =>
  testSubject({ userId, roles: ['bloomMember'] });
const asAdmin = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: admin, roles: ['administrator'] });
const asModerator = (): ReturnType<typeof testSubject> =>
  testSubject({ userId: moderator, roles: ['moderator'] });

beforeEach(() => {
  now = new Date('2026-03-12T09:00:00.000Z');
  h = companionHarness({ now: () => now });
});

// -----------------------------------------------------------------------------
// Helpers that produce real records through real paths
// -----------------------------------------------------------------------------

async function checkIn(userId: UserId): Promise<void> {
  await h.dispatch({ commandName: 'checkin', actor: asMember(userId) });
}

/** A ledger row at a chosen instant, so window tests can place activity. */
function seedPoints(userId: UserId, points: number, at: Date, suffix: string): void {
  h.repositories.rewards.events.push({
    id: `evt-${userId}-${suffix}`,
    guildId: TEST_GUILD_ID,
    userId,
    kind: 'check_in',
    points,
    reason: null,
    awardedBy: null,
    idempotencyKey: `seed:${userId}:${suffix}`,
    createdAt: at,
  });
}

/** A qualified referral, as the Guardian handoff would leave it. */
function seedReferral(
  inviter: UserId,
  qualifiedAt: Date,
  suffix: string,
  harness: CompanionHarness = h,
): void {
  const id = `ref-${inviter}-${suffix}`;
  harness.repositories.referrals.triggers.push({
    id,
    guildId: TEST_GUILD_ID,
    inviterUserId: inviter,
    referredUserId: String(900000000000000000n + BigInt(suffix.length)) as UserId,
    source: 'invite_diff',
    state: 'qualified',
    inviteCode: null,
    rejectedReason: null,
    attempts: 0,
    pointEventId: null,
    createdAt: new Date(qualifiedAt.getTime() - 1000),
    qualifiedAt,
    consumedAt: null,
    claimedAt: null,
    claimedBy: null,
    idempotencyKey: `seed:${id}`,
    correlationId: null,
  });
}

async function createActivity(
  kind: 'challenge' | 'event',
  options: { title?: string; reward?: number; startsInMinutes?: number } = {},
): Promise<string> {
  const result = await h.dispatch({
    commandName: 'companion',
    subcommandGroup: 'admin',
    subcommand: `${kind}-create`,
    actor: asAdmin(),
    options: {
      strings: {
        title: options.title ?? (kind === 'challenge' ? 'Ten check-ins' : 'Garden hours'),
        description: 'Something to do together.',
        ...(kind === 'challenge' ? { metric: 'check_ins' } : {}),
      },
      integers: {
        length_days: 7,
        ...(kind === 'challenge' ? { target: 3 } : {}),
        ...(options.reward === undefined ? {} : { reward: options.reward }),
        ...(options.startsInMinutes === undefined
          ? {}
          : { starts_in_minutes: options.startsInMinutes }),
      },
    },
  });
  const match = /activity-\d+/u.exec(result.responder.visibleText);
  if (!match) throw new Error(`no id in: ${result.responder.visibleText}`);
  return match[0];
}

/** Record a completion directly on the fake, at a chosen instant. */
function seedCompletion(activityId: string, userId: UserId, completedAt: Date): void {
  h.repositories.community.records.set(`${activityId}:${userId}`, {
    activityId,
    guildId: TEST_GUILD_ID,
    userId,
    state: 'completed',
    joinedAt: new Date(completedAt.getTime() - 1000),
    completedAt,
    progress: null,
    pointEventId: null,
  });
}

async function board(
  category: string,
  period?: string,
  actor: ReturnType<typeof testSubject> = asMember(),
): Promise<string> {
  const result = await h.dispatch({
    commandName: 'companion',
    subcommand: 'leaderboard',
    actor,
    options: { strings: { category, ...(period ? { period } : {}) } },
  });
  return result.responder.visibleText;
}

// =============================================================================
// Phase 1 — the extended leaderboard
// =============================================================================

describe('/companion leaderboard', () => {
  it('ranks Bloom Points', async () => {
    await checkIn(other);
    await checkIn(member);
    await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'a win' } },
    });

    const text = await board('points');

    expect(text).toContain('Bloom Points');
    expect(text.indexOf(member)).toBeLessThan(text.indexOf(other));
  });

  it('ranks qualified referrals', async () => {
    seedReferral(member, new Date(now.getTime() - 86_400_000), 'a');
    seedReferral(member, new Date(now.getTime() - 86_400_000), 'bb');
    seedReferral(other, new Date(now.getTime() - 86_400_000), 'ccc');

    const text = await board('referrals');

    expect(text).toContain('People invited who stayed');
    expect(text).toContain('2 people');
    expect(text).toContain('1 person');
    expect(text.indexOf(member)).toBeLessThan(text.indexOf(other));
  });

  it('ranks challenge completions', async () => {
    const id = await createActivity('challenge');
    seedCompletion(id, member, new Date(now.getTime() - 3600_000));
    seedCompletion(id, other, new Date(now.getTime() - 1800_000));

    const text = await board('challenges');

    expect(text).toContain('Challenges finished');
    expect(text).toContain('1 challenge');
    // Earliest completion wins the tie, so member precedes other.
    expect(text.indexOf(member)).toBeLessThan(text.indexOf(other));
  });

  it('ranks event completions', async () => {
    const id = await createActivity('event');
    seedCompletion(id, member, new Date(now.getTime() - 3600_000));

    const text = await board('events');

    expect(text).toContain('Events finished');
    expect(text).toContain('1 event');
  });

  it('counts completions, not sign-ups', async () => {
    /*
     * The difference between a participation record and a recognition one.
     * Joining nine events and finishing none must put nobody on a board, or
     * the board rewards clicking rather than turning up.
     */
    const id = await createActivity('event');
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'join',
      actor: asMember(),
      options: { strings: { id } },
    });

    expect(await board('events')).toContain('No events have been finished');

    // And the totals the status view and the recap read agree.
    const totals = await h.repositories.community.completionTotals(
      TEST_GUILD_ID,
      'event',
      new Date(now.getTime() - 30 * 86_400_000),
      null,
    );
    expect(totals).toEqual({ completions: 0, members: 0 });
  });

  it('does not count a cancelled activity towards anyone', async () => {
    // Cancelling paid nobody. Ranking its sign-ups would recognise an event
    // that explicitly did not happen.
    const id = await createActivity('event');
    seedCompletion(id, member, new Date(now.getTime() - 3600_000));
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'event-close',
      actor: asAdmin(),
      options: { strings: { id, outcome: 'cancelled' } },
    });

    expect(await board('events')).toContain('No events have been finished');
  });

  describe('periods', () => {
    it('honours the 7-day window', async () => {
      seedPoints(member, 50, new Date(now.getTime() - 2 * 86_400_000), 'recent');
      seedPoints(other, 500, new Date(now.getTime() - 20 * 86_400_000), 'old');

      const text = await board('points', 'week');

      expect(text).toContain('last 7 days');
      expect(text).toContain(member);
      expect(text).not.toContain(other);
    });

    it('honours the 30-day window', async () => {
      seedPoints(other, 500, new Date(now.getTime() - 20 * 86_400_000), 'old');

      const text = await board('points', 'month');

      expect(text).toContain('last 30 days');
      expect(text).toContain(other);
    });

    it('honours all time for the count categories', async () => {
      seedReferral(member, new Date(now.getTime() - 300 * 86_400_000), 'ancient');

      expect(await board('referrals', 'week')).toContain('No invited members');
      const allTime = await board('referrals', 'all');
      expect(allTime).toContain('all time');
      expect(allTime).toContain(member);
    });

    it('declines all time for points, and says why', async () => {
      seedPoints(member, 10, new Date(now.getTime() - 2 * 86_400_000), 'a');

      const text = await board('points', 'all');

      expect(text).toContain('last 30 days');
      expect(text).toContain('no all-time view');
      expect(text).not.toContain('all time');
    });

    it('agrees with the service about which categories allow all time', () => {
      // The copy above is only honest if the service's rule is the one the
      // command enforces, so the rule itself is pinned.
      const allowed = BOARD_CATEGORIES.filter((category) => supportsAllTime(category));
      expect([...allowed]).toEqual(['referrals', 'challenges', 'events']);
    });
  });

  it('breaks ties deterministically, however the rows arrive', async () => {
    /*
     * Three members, same score, same instant. Without a total order the
     * board would be free to reshuffle between two identical requests, which
     * reads to members as the numbers being made up.
     */
    const at = new Date(now.getTime() - 3600_000);
    seedPoints(member, 10, at, 'tie');
    seedPoints(other, 10, at, 'tie');
    seedPoints(third, 10, at, 'tie');

    const first = await board('points');
    const second = await board('points');
    const order = (text: string): number[] =>
      [member, other, third].map((id) => text.indexOf(id));

    expect(order(first)).toEqual(order(second));
    // user_id ascending is the documented final tiebreak.
    const sorted = [member, other, third].toSorted((a, b) => a.localeCompare(b));
    const positions = sorted.map((id) => first.indexOf(id));
    expect(positions).toEqual([...positions].toSorted((a, b) => a - b));
  });

  it('is bounded however many members qualify', async () => {
    for (let index = 0; index < 30; index += 1) {
      const userId = String(800000000000000000n + BigInt(index)) as UserId;
      seedPoints(
        userId,
        100 - index,
        new Date(now.getTime() - 3600_000),
        `b${String(index)}`,
      );
    }

    const text = await board('points');

    // Ten entries plus the embed's own framing — never thirty.
    const ranked = text.split('\n').filter((line) => /^\d+\./u.test(line.trim()));
    expect(ranked).toHaveLength(10);
  });

  it('says plainly when a board is empty', async () => {
    expect(await board('challenges')).toContain('No challenges have been finished');
  });

  it('counts only this guild', async () => {
    /*
     * Guild scoping is the boundary that keeps one server's board out of
     * another's. Asserted at the repository, because the command layer only
     * ever passes the invocation's guild and so cannot demonstrate the filter
     * exists at all.
     */
    const elsewhere = '999999999999999999' as GuildId;
    h.repositories.rewards.events.push({
      id: 'evt-elsewhere',
      guildId: elsewhere,
      userId: member,
      kind: 'check_in',
      points: 9999,
      reason: null,
      awardedBy: null,
      idempotencyKey: 'seed:elsewhere',
      createdAt: new Date(now.getTime() - 3600_000),
    });

    expect(await board('points')).toContain('No points have been earned');

    const theirs = await h.repositories.rewards.leaderboard(elsewhere, {});
    expect(theirs).toHaveLength(1);
  });

  it('is off when the rewards economy is off', async () => {
    h = companionHarness({ now: () => now, rewards: false });
    expect(await board('events')).toContain('Bloom Rewards is off');
  });
});

// =============================================================================
// Phase 2 — highlights and status
// =============================================================================

const communityView = async (
  subcommand: 'highlights' | 'status',
  actor: ReturnType<typeof testSubject> = asMember(),
): Promise<string> => {
  const result = await h.dispatch({
    commandName: 'companion',
    subcommandGroup: 'community',
    subcommand,
    actor,
  });
  return result.responder.visibleText;
};

describe('/companion community highlights', () => {
  it('shows who has been most active', async () => {
    await checkIn(member);

    const text = await communityView('highlights');

    expect(text).toContain('Most active');
    expect(text).toContain(member);
  });

  it('shows recent recognition', async () => {
    /*
     * A first check-in grants a *milestone*, not an achievement — the two are
     * separate kinds with separate channels, and the view keeps them apart
     * rather than flattening them into one "stuff you got" list.
     */
    await checkIn(member);

    const text = await communityView('highlights');

    expect(text).toContain('Milestones reached');
    expect(text).toContain('First Check-in');
  });

  it('shows referral activity', async () => {
    seedReferral(member, new Date(now.getTime() - 86_400_000), 'r');

    const text = await communityView('highlights');

    expect(text).toContain('Brought people in');
    expect(text).toContain('1 person');
  });

  it('says so quietly when there is nothing to highlight', async () => {
    const text = await communityView('highlights');

    expect(text).toContain('Nothing to highlight');
    // Not six empty headings, which would read as broken rather than quiet.
    expect(text).not.toContain('Most active');
    expect(text).not.toContain('Milestones reached');
  });

  it('is ephemeral', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'community',
      subcommand: 'highlights',
      actor: asMember(),
    });
    expect(result.responder.messages[0]?.ephemeral).toBe(true);
  });

  it('leaks nothing private', async () => {
    /*
     * The guard against the obvious future mistake: a highlights board is
     * exactly where someone would later add "and their balance". Balances,
     * award evidence and point reasons are all things the member can see
     * about themselves and nobody else may see about them.
     */
    await checkIn(member);
    await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'a private sounding note' } },
    });

    const text = await communityView('highlights');

    expect(text).not.toContain('a private sounding note');
    expect(text).not.toContain('balance');
    expect(text).not.toContain('checkIns');
    expect(text).not.toContain('evidence');
  });
});

describe('/companion community status', () => {
  it('shows the challenges and events that are running', async () => {
    await createActivity('challenge', { title: 'Ten mornings' });
    await createActivity('event', { title: 'Garden hours' });

    const text = await communityView('status');

    expect(text).toContain('Challenges running');
    expect(text).toContain('Ten mornings');
    expect(text).toContain('Events happening');
    expect(text).toContain('Garden hours');
  });

  it('separates an event that has not started yet', async () => {
    await createActivity('event', { title: 'Later on', startsInMinutes: 600 });

    const text = await communityView('status');

    expect(text).toContain('Coming up');
    expect(text).toContain('Later on');
    expect(text).not.toContain('Events happening');
  });

  it('summarises the week', async () => {
    await checkIn(member);

    const text = await communityView('status');

    expect(text).toContain('This week');
    expect(text).toContain('1 member earned');
  });

  it('says so plainly when nothing is running', async () => {
    const text = await communityView('status');

    expect(text).toContain('Nothing is running at the moment');
  });

  it('shows no moderation or case information', async () => {
    await createActivity('event');
    const text = await communityView('status');

    for (const forbidden of ['case', 'report', 'warn', 'ban', 'moderation']) {
      expect(text.toLowerCase()).not.toContain(forbidden);
    }
  });
});

// =============================================================================
// Phase 3 — the weekly recap
// =============================================================================

const runRecap = (harness: CompanionHarness): Promise<void> =>
  harness.scheduler.runNow(RECAP_JOB);

/**
 * Only what the recap posted.
 *
 * The harness shares one messaging fake across every feature, and a check-in
 * that earns a milestone posts an announcement of its own. Asserting on
 * `messaging.sent` as a whole would make these tests pass or fail on whether
 * an unrelated award happened to fire.
 */
const recapPosts = (harness: CompanionHarness): typeof harness.messaging.sent =>
  harness.messaging.sent.filter((sent) => sent.channelId === TEST_CHANNEL_IDS.challenges);

describe('companion.community.weekly_recap', () => {
  /*
   * This block runs on the wall clock, not the frozen harness one.
   *
   * `Scheduler.execute` stamps each run with `new Date()`, and the recap
   * derives its window from that stamp. With the harness pinned to March the
   * job would be summarising a week in March while the test's records sat in
   * whatever month the suite actually ran — so the two clocks are aligned
   * here instead. The window arithmetic itself is asserted separately, where
   * it can be pinned exactly.
   */
  beforeEach(() => {
    h = companionHarness({ now: () => new Date() });
  });

  it('is registered with a weekly schedule, a lease and an off switch', () => {
    const job = h.scheduler.status().find((entry) => entry.key === RECAP_JOB);

    expect(job).toBeDefined();
    expect(job?.enabled).toBe(true);
    expect(job?.schedule).toBe('0 10 * * 1');
    expect(job?.nextRunAt).toBeInstanceOf(Date);
  });

  it('posts the recap to the challenges channel', async () => {
    await checkIn(member);

    await runRecap(h);

    const posted = recapPosts(h);
    expect(posted).toHaveLength(1);
    expect(JSON.stringify(posted[0]?.message)).toContain('The week in Bloom');
  });

  it('is not ephemeral — it is the community looking at its own week', async () => {
    await checkIn(member);
    await runRecap(h);

    expect(recapPosts(h)[0]?.message.ephemeral ?? false).toBe(false);
  });

  it('reports the same numbers every time for the same week', async () => {
    /*
     * Asserted against the service and the renderer with an explicit window,
     * rather than by running the job twice: the job stamps its own window
     * from the wall clock, so two runs describe two different weeks by
     * design. What has to be deterministic is the summary of a *given* week,
     * which is what a retry re-publishes.
     */
    await checkIn(member);
    await checkIn(other);
    seedReferral(member, new Date(Date.now() - 2 * 86_400_000), 'det');

    // Closed after the records exist: a half-open window ending at the
    // instant the test started would exclude everything the test just did.
    const to = new Date(Date.now() + 1000);
    const from = new Date(to.getTime() - 7 * 86_400_000);

    const first = await h.deps.highlights.recap({ guildId: TEST_GUILD_ID, from, to });
    const second = await h.deps.highlights.recap({ guildId: TEST_GUILD_ID, from, to });

    expect(second).toEqual(first);
    expect(recapMessage(second)).toEqual(recapMessage(first));
    expect(first.participatingMembers).toBe(2);
    expect(first.referrals).toBe(1);
  });

  it('says the week was quiet rather than inventing something', async () => {
    await runRecap(h);

    const posted = JSON.stringify(recapPosts(h)[0]?.message);
    expect(posted).toContain('A quiet week');
    expect(posted).not.toContain('Most active');
  });

  it('posts once per cooldown window, however many times it runs', async () => {
    await checkIn(member);

    await runRecap(h);
    await runRecap(h);
    await runRecap(h);

    expect(recapPosts(h)).toHaveLength(1);
    expect(h.logs.serialised()).toContain('jobs.recap.suppressed');
  });

  it('posts once when two workers run it at the same time', async () => {
    /*
     * The claim is an atomic insert against a unique key, so the second
     * worker loses it rather than discovering the duplicate afterwards.
     */
    await checkIn(member);

    await Promise.all([runRecap(h), runRecap(h)]);

    expect(recapPosts(h)).toHaveLength(1);
  });

  it('is held by the scheduler lock while it runs', async () => {
    await checkIn(member);
    await runRecap(h);

    const run = h.lock.runs.find((entry) => entry.jobKey === RECAP_JOB);
    expect(run).toBeDefined();
    expect(run?.status).toBe('succeeded');
  });

  it('is disabled, not broken, when the challenges channel is unconfigured', async () => {
    const harness = companionHarness({ now: () => now, challengesChannel: null });

    const job = harness.scheduler.status().find((entry) => entry.key === RECAP_JOB);
    expect(job?.enabled).toBe(false);

    // And running it by hand degrades rather than throwing: the rest of the
    // community systems must not care that a digest has nowhere to go.
    await expect(runRecap(harness)).resolves.toBeUndefined();
    expect(recapPosts(harness)).toHaveLength(0);
    expect(harness.logs.serialised()).toContain('jobs.recap.no_channel');
  });

  it('can be run again after a failed attempt', async () => {
    await checkIn(member);

    const sendToChannel = h.messaging.sendToChannel.bind(h.messaging);
    h.messaging.sendToChannel = () => Promise.reject(new Error('discord is down'));

    /*
     * The scheduler catches what a job throws and records it against the run
     * rather than letting it escape — one failing job must not take the
     * process with it. So this does not reject; the evidence is in the lock.
     */
    await runRecap(h);
    expect(recapPosts(h)).toHaveLength(0);
    expect(h.lock.runs.find((entry) => entry.jobKey === RECAP_JOB)?.status).toBe(
      'failed',
    );

    /*
     * The claim is still held, so the next scheduled tick will not retry
     * silently — which is the documented behaviour: a missed week is skipped
     * rather than published late. An operator who wants it anyway clears the
     * claim and runs the job by hand, which is this.
     */
    h.messaging.sendToChannel = sendToChannel;
    await h.repositories.cooldowns.clear(TEST_GUILD_ID, 'job.recap', RECAP_JOB);

    await runRecap(h);
    expect(recapPosts(h)).toHaveLength(1);
  });

  it('records the failure against the run, not against the community', async () => {
    await checkIn(member);
    h.messaging.sendToChannel = () => Promise.reject(new Error('discord is down'));

    await runRecap(h);

    const run = h.lock.runs.find((entry) => entry.jobKey === RECAP_JOB);
    expect(run?.status).toBe('failed');
    // No audit row claiming a recap was posted.
    expect(
      h.repositories.audit.events.some(
        (event) => event.event === 'jobs.community_recap_posted',
      ),
    ).toBe(false);
  });

  it('reports the week the run was scheduled for, not the week it ran in', async () => {
    /*
     * Timezone and lateness in one property. The job's window comes from the
     * scheduled instant, so a run that happens late — or by hand on a
     * Tuesday — still describes the seven days the schedule meant. Deriving
     * it from the clock would let two workers a second apart publish two
     * different weeks.
     */
    await checkIn(member);
    await runRecap(h);

    const audit = h.repositories.audit.events.find(
      (event) => event.event === 'jobs.community_recap_posted',
    );
    expect(audit).toBeDefined();

    const fromValue = audit?.details?.['from'];
    const toValue = audit?.details?.['to'];
    expect(typeof fromValue).toBe('string');
    expect(typeof toValue).toBe('string');

    const from = new Date(fromValue as string);
    const to = new Date(toValue as string);
    expect(to.getTime() - from.getTime()).toBe(7 * 24 * 60 * 60 * 1000);

    // The schedule is cron in BLOOM_TIMEZONE, so the instant it fires is a
    // zone-aware 10:00 rather than 10:00 UTC.
    const job = h.scheduler.status().find((entry) => entry.key === RECAP_JOB);
    expect(job?.nextRunAt).toBeInstanceOf(Date);
    expect(job?.schedule).toBe('0 10 * * 1');
  });

  it('describes the week its run was stamped for, not the week it ran in', async () => {
    /*
     * Driven through the job's own `run` with a synthetic context, because
     * that is the only way to make the scheduled instant differ from the
     * wall clock. Running late, or being triggered by hand on Wednesday,
     * must not silently move the window — two workers a second apart would
     * otherwise publish two different summaries of "last week".
     */
    const scheduledFor = new Date('2026-05-04T10:00:00.000Z');
    const job = createWeeklyRecapJob(h.deps);

    await job.run({
      jobKey: RECAP_JOB,
      guildId: TEST_GUILD_ID,
      runId: 'run-synthetic',
      logger: h.deps.logger,
      scheduledFor,
    });

    const audit = h.repositories.audit.events.find(
      (event) => event.event === 'jobs.community_recap_posted',
    );
    expect(audit?.details?.['to']).toBe(scheduledFor.toISOString());
    expect(audit?.details?.['from']).toBe(
      new Date(scheduledFor.getTime() - 7 * 86_400_000).toISOString(),
    );
  });

  it('audits what it published, with no actor', async () => {
    /*
     * Seeded a minute back rather than through a check-in at the current
     * instant. The job's window closes at the instant the run was stamped,
     * and in a test the stamp can land in the same millisecond as the
     * record — which is the half-open boundary doing exactly what it should,
     * and not something to loosen the window for.
     */
    seedPoints(member, 10, new Date(Date.now() - 60_000), 'recap-audit');
    await runRecap(h);

    const audit = h.repositories.audit.events.find(
      (event) => event.event === 'jobs.community_recap_posted',
    );
    expect(audit?.actorId ?? null).toBeNull();
    expect(audit?.source).toBe(RECAP_JOB);
    expect(audit?.details).toMatchObject({ members: 1, quiet: false });
  });

  it('publishes no member-sensitive data', async () => {
    await checkIn(member);
    await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'something I would not want reposted' } },
    });

    await runRecap(h);
    const posted = JSON.stringify(recapPosts(h).at(-1)?.message);

    expect(posted).not.toContain('something I would not want reposted');
    expect(posted).not.toContain('balance');
    expect(posted).not.toContain('evidence');
  });
});

// =============================================================================
// Phase 4 — recognition
// =============================================================================

describe('achievement recognition', () => {
  it('tells the member in their own reply when they earn something', async () => {
    const result = await h.dispatch({ commandName: 'checkin', actor: asMember() });

    expect(result.responder.messages[0]?.ephemeral).toBe(true);
    expect(result.responder.visibleText).toContain('First Check-in');
  });

  it('announces once publicly, and only where a channel is configured', async () => {
    await checkIn(member);

    const announcements = h.messaging.sent.filter(
      (sent) => sent.channelId === TEST_CHANNEL_IDS.milestones,
    );
    expect(announcements).toHaveLength(1);
  });

  it('does not announce again when the same award is re-evaluated', async () => {
    /*
     * Three more evaluations of the same records, through three different
     * paths. A win earns a *different* milestone and is allowed to announce;
     * what must never happen is the first check-in being announced twice.
     */
    await checkIn(member);
    await checkIn(member);
    await h.dispatch({
      commandName: 'win',
      actor: asMember(),
      options: { strings: { description: 'a win' } },
    });
    await h.dispatch({
      commandName: 'companion',
      subcommand: 'milestones',
      actor: asMember(),
    });

    const announcements = h.messaging.sent.filter(
      (sent) =>
        sent.channelId === TEST_CHANNEL_IDS.milestones &&
        JSON.stringify(sent.message).includes('First Check'),
    );
    expect(announcements).toHaveLength(1);
  });

  it('grants the award exactly once', async () => {
    await checkIn(member);
    await checkIn(member);

    const held = await h.repositories.awards.list(TEST_GUILD_ID, member);
    const first = held.filter((award) => award.awardKey === 'milestone.checkins.1');
    expect(first).toHaveLength(1);
  });

  it('pays no points for an achievement', async () => {
    /*
     * The standing product rule: achievements are recognition, never
     * currency. Asserted at the ledger rather than at the definitions,
     * because the definitions are where someone would change it and the
     * ledger is where it would matter.
     */
    await checkIn(member);

    const kinds = h.repositories.rewards.events.map((event) => event.kind);
    expect(kinds).not.toContain('achievement_reward');
    expect(kinds).toEqual(['check_in']);
  });

  it('degrades quietly when there is nowhere to announce', async () => {
    const harness = companionHarness({ now: () => now, milestonesChannel: null });
    const result = await harness.dispatch({
      commandName: 'checkin',
      actor: asMember(),
    });

    // The member still learns they earned it.
    expect(result.responder.visibleText).toContain('First Check-in');
  });
});

// =============================================================================
// Phase 5 — the staff view
// =============================================================================

const staffOverview = (
  actor: ReturnType<typeof testSubject>,
): ReturnType<CompanionHarness['dispatch']> =>
  h.dispatch({
    commandName: 'companion',
    subcommandGroup: 'admin',
    subcommand: 'community-overview',
    actor,
  });

describe('/companion admin community-overview', () => {
  it('shows activities, participation and totals to an administrator', async () => {
    const id = await createActivity('event', { title: 'Garden hours' });
    await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'event',
      subcommand: 'join',
      actor: asMember(),
      options: { strings: { id } },
    });
    await checkIn(member);
    seedReferral(other, new Date(now.getTime() - 86_400_000), 's');

    const result = await staffOverview(asAdmin());
    const text = result.responder.visibleText;

    expect(text).toContain('Garden hours');
    expect(text).toContain('1 joined');
    expect(text).toContain('Last 30 days');
    expect(text).toContain('1 referrals qualified');
    expect(result.responder.messages[0]?.ephemeral).toBe(true);
  });

  it('refuses a moderator', async () => {
    const result = await staffOverview(asModerator());

    expect(result.responder.visibleText).toContain(
      'This command is available to the Bloom staff team.',
    );
  });

  it('refuses a member', async () => {
    const result = await staffOverview(asMember());

    expect(result.responder.visibleText).toContain(
      'This command is available to the Bloom staff team.',
    );
  });

  it('refuses outside the configured guild', async () => {
    const result = await h.dispatch({
      commandName: 'companion',
      subcommandGroup: 'admin',
      subcommand: 'community-overview',
      actor: { ...asAdmin(), guildId: '123456789012345678' as GuildId },
    });

    expect(result.responder.visibleText).toContain(
      'only available in the Bloom Labs server',
    );
  });

  it('is gated on a read capability no moderator holds', () => {
    /*
     * Two assertions in one: the overview is a read, so it must not require
     * the capability that creates and closes activities; and the read
     * capability it does require must stay off the moderator tier, because
     * the overview states the guild's economic totals.
     */
    expect([...MODERATOR_STAFF_CAPABILITIES]).not.toContain('staff.rewards.read');
    expect([...MODERATOR_STAFF_CAPABILITIES]).not.toContain('staff.community.manage');
  });

  it('shows no case or report information', async () => {
    await createActivity('event');
    const result = await staffOverview(asAdmin());
    const text = result.responder.visibleText.toLowerCase();

    for (const forbidden of ['case ', 'report', 'ban', 'warn']) {
      expect(text).not.toContain(forbidden);
    }
  });
});
