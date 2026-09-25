import type { LogEvent, LogSeverity } from '@bloom/shared-types';
import { createLogger, type LogSink, type Logger } from '@bloom/logging';

/**
 * A sink that keeps everything, so tests can assert on structured output rather
 * than scraping stdout.
 *
 * Useful for more than "did it log": the redaction guarantees and the
 * "never leak operator hints to users" rule are both assertable properties of
 * the emitted events.
 */
export class MemoryLogSink implements LogSink {
  public readonly events: LogEvent[] = [];

  public write(event: LogEvent): void {
    this.events.push(event);
  }

  public clear(): void {
    this.events.length = 0;
  }

  public bySeverity(severity: LogSeverity): readonly LogEvent[] {
    return this.events.filter((event) => event.severity === severity);
  }

  public find(eventName: string): LogEvent | undefined {
    return this.events.find((event) => event.event === eventName);
  }

  public has(eventName: string): boolean {
    return this.find(eventName) !== undefined;
  }

  /** The whole buffer as one string — for asserting that a secret never appears. */
  public serialised(): string {
    return JSON.stringify(this.events);
  }
}

export interface TestLoggerResult {
  readonly logger: Logger;
  readonly sink: MemoryLogSink;
}

export function createTestLogger(level: LogSeverity = 'trace'): TestLoggerResult {
  const sink = new MemoryLogSink();
  const logger = createLogger({
    botName: 'guardian',
    environment: 'test',
    version: '0.0.0-test',
    level,
    sink,
  });
  return { logger, sink };
}
