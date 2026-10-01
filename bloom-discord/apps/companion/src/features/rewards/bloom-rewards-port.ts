import type { CorrelationId, GuildId, PointKind, UserId } from '@bloom/shared-types';

/**
 * The seam where Bloom Rewards will meet the main Bloom product.
 *
 * ## What this is, and what it is not
 *
 * The main Bloom app has its own reward system. One day a check-in here should
 * be visible there, and progress there should be visible here. That day is not
 * today: the product's contract has not been confirmed, and this package has
 * no credentials, no connector and no knowledge of its schema. **Nothing in
 * this file talks to anything.** It is a port — the business-shaped hole an
 * adapter will later fill.
 *
 * It exists now, before the integration, for one reason: so the integration
 * does not require rewriting `RewardsService`. The alternative is discovering
 * at integration time that the only way to reach the ledger is through code
 * that assumes a Discord interaction, and the shortest path from there is a
 * second economy living beside the first.
 *
 * ## The rules it encodes
 *
 * **The ledger stays the source of truth.** Every operation here is phrased as
 * *reporting* something that already happened in `point_events`, or *reading*
 * a summary of it. There is deliberately no balance setter, no points adder,
 * and no mutation path that bypasses `RewardsService.manualAward`. An adapter
 * cannot be written against this interface that invents points, because the
 * interface gives it nowhere to put them — a guard test asserts the absence
 * by name, so adding one convenient method fails the build.
 *
 * **It speaks business, not transport.** No Supabase client, no HTTP, no SQL,
 * no auth token appears in these types. Those are the adapter's problem, and
 * keeping them out is what lets the adapter be replaced — or stubbed in a
 * test — without touching Companion.
 *
 * **It is allowed to be unavailable.** Every result models failure as a value
 * rather than an exception, because an external system being down must never
 * cost a member their check-in. A reward is earned in the Discord ledger the
 * moment it is earned; synchronising it elsewhere is a separate, best-effort
 * concern that can be retried.
 */

/** A ledger entry, described without reference to how it is stored. */
export interface RewardEventRecord {
  readonly guildId: GuildId;
  readonly userId: UserId;
  readonly kind: PointKind;
  /** Signed, exactly as the ledger stores it. */
  readonly points: number;
  /**
   * The ledger's own idempotency key.
   *
   * Passed through rather than regenerated so the remote system can recognise
   * a replay as the same event. Retrying a sync must never pay twice.
   */
  readonly idempotencyKey: string;
  readonly occurredAt: Date;
  readonly correlationId: CorrelationId;
  /**
   * Staff-written justification, present only for manual kinds.
   *
   * Never member-authored text: the body of a shared win is not stored in the
   * ledger and must not leave the platform through this port either.
   */
  readonly reason?: string | undefined;
}

/** What the remote system reports back about a member. */
export interface ExternalRewardSummary {
  readonly userId: UserId;
  readonly points: number;
  /** The remote system's own name for where they stand. Opaque here. */
  readonly tier: string | null;
  readonly updatedAt: Date;
}

/**
 * The outcome of talking to a system that may not be there.
 *
 * `unavailable` is a first-class answer rather than a thrown error so callers
 * are forced to decide what happens when the integration is down — and the
 * honest default, today, is that every implementation returns it.
 */
export type RewardPortResult<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'duplicate' }
  | { readonly kind: 'unavailable'; readonly reason: string };

export interface BloomRewardsPort {
  /**
   * Tell the external system that points were earned here.
   *
   * Reporting, not requesting: the event is already committed to the ledger
   * before this is called. A failure is a sync to retry, never a reward to
   * take back.
   */
  recordRewardEvent(event: RewardEventRecord): Promise<RewardPortResult<void>>;

  /** Read a member's standing in the external system. */
  getMemberRewardSummary(
    guildId: GuildId,
    userId: UserId,
  ): Promise<RewardPortResult<ExternalRewardSummary>>;

  /**
   * Ask whether a previously reported event is present remotely.
   *
   * For the reconciliation job that will exist once there is something to
   * reconcile with. Separate from `recordRewardEvent` because "did this
   * arrive?" and "please take this" fail in different ways and deserve
   * different retry behaviour.
   */
  reconcileRewardEvent(
    idempotencyKey: string,
  ): Promise<RewardPortResult<{ readonly present: boolean }>>;
}

/**
 * The only implementation that exists, and the only honest one.
 *
 * Says "not configured" to everything. It is here so the port is a real,
 * instantiable, testable thing rather than an interface nobody has tried to
 * satisfy, and so that wiring it up later is a substitution rather than a
 * construction. Returning a value instead of throwing is the point: a caller
 * written against this cannot accidentally depend on the integration working.
 */
export class UnconfiguredBloomRewardsPort implements BloomRewardsPort {
  private static readonly REASON =
    'The main Bloom rewards integration is not configured. No external system is connected.';

  public recordRewardEvent(): Promise<RewardPortResult<void>> {
    return Promise.resolve(this.unavailable());
  }

  public getMemberRewardSummary(): Promise<RewardPortResult<ExternalRewardSummary>> {
    return Promise.resolve(this.unavailable());
  }

  public reconcileRewardEvent(): Promise<
    RewardPortResult<{ readonly present: boolean }>
  > {
    return Promise.resolve(this.unavailable());
  }

  private unavailable(): { readonly kind: 'unavailable'; readonly reason: string } {
    return { kind: 'unavailable', reason: UnconfiguredBloomRewardsPort.REASON };
  }
}
