import {
  isErrorCode,
  unsafeSnowflake,
  type ChannelId,
  type CorrelationId,
} from '@bloom/shared-types';
import type { CommandTelemetry } from '@bloom/commands';
import type { TelemetryRepository } from '@bloom/database';

/**
 * Bridge the dispatcher's telemetry port to the telemetry repository.
 *
 * The two shapes differ on purpose, and the difference is worth keeping:
 *
 *   • `CommandDispatcher` lives in `@bloom/commands`, which must not depend on
 *     the database. Its port therefore speaks in plain strings.
 *   • The repository speaks in branded ids and the closed error-code union,
 *     because those are what the schema constrains.
 *
 * Collapsing them would mean either dragging `@bloom/database` into the command
 * layer or weakening the repository's types. This adapter is the seam instead,
 * and it is the only place the narrowing happens.
 */
export function commandTelemetry(repository: TelemetryRepository): CommandTelemetry {
  return {
    async record(entry): Promise<void> {
      await repository.recordCommand({
        guildId: entry.guildId,
        botName: entry.botName,
        command: entry.command,
        actorId: entry.actorId,
        channelId:
          entry.channelId === null ? null : unsafeSnowflake<ChannelId>(entry.channelId),
        outcome: entry.outcome,
        /*
         * An unrecognised code is stored as null rather than passed through.
         *
         * The column is constrained to the catalog, so writing an unknown
         * string would fail the insert — and losing one telemetry row to a
         * constraint violation is a silly way to turn a successful command into
         * a logged error.
         */
        errorCode: isErrorCode(entry.errorCode) ? entry.errorCode : null,
        durationMs: entry.durationMs,
        correlationId: entry.correlationId as CorrelationId,
      });
    },
  };
}
