/* eslint-disable @typescript-eslint/no-empty-function -- every method here is
   intentionally empty: this is the null object used by tests and by the CLI
   tools that must not emit log lines. */
import type { LogSeverity } from '@bloom/shared-types';
import type { LogFields, Logger, LogSink } from './types.js';

/**
 * A logger that discards everything.
 *
 * For unit tests of code that logs incidentally, and for the narrow window
 * during boot before configuration has been validated — at that point we do not
 * yet know the log level or the environment, and guessing would mean either
 * losing lines or emitting malformed ones.
 */
class NoopLogger implements Logger {
  public readonly level: LogSeverity = 'fatal';

  public trace(): void {}
  public debug(): void {}
  public info(): void {}
  public warn(): void {}
  public error(): void {}
  public fatal(): void {}
  public log(): void {}

  public child(): Logger {
    return this;
  }

  public startTimer(): (message: string, fields?: LogFields) => void {
    return () => {};
  }
}

export const noopLogger: Logger = new NoopLogger();

/** A sink that drops everything. Pairs with `noopLogger` where a sink is required. */
export const noopSink: LogSink = { write: () => {} };
