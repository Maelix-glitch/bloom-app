import { randomUUID } from 'node:crypto';
import type { BotName } from '@bloom/shared-types';
import type { Logger } from '@bloom/logging';
import type { TelemetryRepository } from '@bloom/database';
import type { GatewayStatus } from './ports.js';

/**
 * Each process writing down that it is alive.
 *
 * `system_health` has existed since migration `0003`, where its comment says
 * the row is "written by each process on a heartbeat" and that this is how one
 * bot's health can report on the other two. Nothing wrote it. The repository
 * had `writeHealth`, `readHealth` and `readAllHealth`, and not one of them had
 * a caller — so the table was empty in every environment and the promise in the
 * comment was false.
 *
 * It matters because the three bots are three separate containers with three
 * separate gateway connections. Each one's `/health` can only see itself, and
 * "is Companion actually up?" is a question somebody asks during an incident,
 * usually from somewhere without shell access to all three.
 *
 * ## Why this is not a scheduled job
 *
 * Every other recurring task in the platform goes through the scheduler, and
 * this deliberately does not. A scheduled job takes a lease, and a lease means
 * **exactly one process runs it** — which is precisely right for a nightly
 * prune and precisely wrong here. One process writing all three rows would be
 * one process asserting that the other two are alive, which is the fabricated
 * status the brief rules out. Each process must speak for itself, so each
 * process keeps its own timer.
 *
 * It is the only interval outside the scheduler, it is owned by one object with
 * a `stop()`, and it is stopped on shutdown.
 */

/** How often a process re-states that it is alive. */
const DEFAULT_INTERVAL_SECONDS = 30;

/**
 * How long before a row is no longer evidence of anything.
 *
 * Three missed heartbeats. One missed write is a slow query or a redeployment;
 * ninety seconds of silence is a process that is not running.
 */
export const HEARTBEAT_STALE_AFTER_SECONDS = 90;

export interface HeartbeatOptions {
  readonly bot: BotName;
  readonly version: string;
  readonly environment: string;
  readonly telemetry: TelemetryRepository;
  readonly logger: Logger;
  readonly gatewayStatus: () => GatewayStatus;
  readonly databaseOk: () => Promise<boolean>;
  readonly intervalSeconds?: number;
  /** Overridable for tests; defaults to a fresh id per process. */
  readonly instanceId?: string;
}

export class Heartbeat {
  private timer: NodeJS.Timeout | null = null;
  private readonly startedAt = new Date();
  private readonly instanceId: string;

  public constructor(private readonly options: HeartbeatOptions) {
    /*
     * A new id per process, not per bot.
     *
     * This is what distinguishes a process that restarted thirty seconds ago
     * from one that has been stuck for an hour — the row's `started_at` moves
     * and the id changes. Without it, a crash loop looks identical to a healthy
     * process, because both produce a recent `observed_at`.
     */
    this.instanceId = options.instanceId ?? randomUUID();
  }

  /** Write once immediately, then on an interval. */
  public start(): void {
    if (this.timer) return;

    const intervalMs = (this.options.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS) * 1000;

    // Immediately, so a bot that starts and then dies still leaves a trace of
    // having started rather than looking like it never ran.
    void this.beat();

    this.timer = setInterval(() => void this.beat(), intervalMs);
    /*
     * Unref'd: the heartbeat must never be the reason the process stays alive.
     * A bot whose only remaining work is telling the database it is alive
     * should exit.
     */
    this.timer.unref();
  }

  public stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * One heartbeat.
   *
   * Failures are logged at debug and swallowed. This is the one place in the
   * platform where that is right: the heartbeat is a report *about* health, and
   * a bot that is serving members perfectly well must not be brought down
   * because it could not write a row saying so. The absence of the row is
   * itself the signal — a reader treats a stale `observed_at` as "last seen
   * at", which is exactly what a failing write produces.
   */
  private async beat(): Promise<void> {
    try {
      const gateway = this.options.gatewayStatus();
      const databaseOk = await this.options.databaseOk();

      await this.options.telemetry.writeHealth({
        botName: this.options.bot,
        instanceId: this.instanceId,
        version: this.options.version,
        environment: this.options.environment,
        gatewayConnected: gateway.connected,
        gatewayPingMs: gateway.pingMs,
        databaseOk,
        startedAt: this.startedAt,
        commandsHandled: 0,
        errorsTotal: 0,
        lastCommandAt: null,
        lastErrorAt: null,
        lastErrorCode: null,
        details: {},
      });
    } catch (error) {
      this.options.logger.debug(
        'heartbeat.write_failed',
        'Could not record this process as alive; the row will go stale.',
        { error },
      );
    }
  }
}

export interface PeerHealth {
  readonly bot: BotName;
  readonly instanceId: string;
  readonly version: string;
  readonly gatewayConnected: boolean;
  readonly databaseOk: boolean;
  /** Seconds since that process last wrote. The authoritative field. */
  readonly lastSeenSecondsAgo: number;
  /** True when the row is too old to be evidence of anything. */
  readonly stale: boolean;
}

/**
 * What the other bots last said about themselves.
 *
 * Reported as observations, never as assertions: the shape deliberately has no
 * "online" field, only `lastSeenSecondsAgo` and `stale`. A row saying a gateway
 * was connected is a statement about a moment in the past, and a reader that
 * rendered it as "ONLINE" would be inventing a present-tense claim out of a
 * historical one — which is the specific thing the table's own comment warns
 * against.
 */
export async function readPeers(
  telemetry: TelemetryRepository,
  self: BotName,
  now: Date = new Date(),
): Promise<readonly PeerHealth[]> {
  const rows = await telemetry.readAllHealth();

  return rows
    .filter((row) => row.botName !== self)
    .map((row) => {
      const secondsAgo = Math.max(
        0,
        Math.floor((now.getTime() - row.observedAt.getTime()) / 1000),
      );
      return {
        bot: row.botName,
        instanceId: row.instanceId,
        version: row.version,
        gatewayConnected: row.gatewayConnected,
        databaseOk: row.databaseOk,
        lastSeenSecondsAgo: secondsAgo,
        stale: secondsAgo > HEARTBEAT_STALE_AFTER_SECONDS,
      };
    });
}
