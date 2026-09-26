import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { CorrelationId } from '@bloom/shared-types';

/**
 * Correlation context.
 *
 * One interaction produces log lines from the router, the authorization layer,
 * a service, two repositories and possibly a Discord retry. Without a shared id
 * those are six unrelated lines in a log aggregator and debugging a report from
 * a member becomes archaeology.
 *
 * `AsyncLocalStorage` propagates the id through `await` boundaries without
 * threading it through every signature. It is the one piece of implicit context
 * this codebase allows, and it is read-only.
 */
export interface CorrelationContext {
  readonly correlationId: CorrelationId;
  /** When the unit of work started, for duration measurement. */
  readonly startedAt: number;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

export function newCorrelationId(): CorrelationId {
  return randomUUID() as CorrelationId;
}

/** Run `fn` inside a fresh correlation scope. */
export function withCorrelation<T>(
  fn: (context: CorrelationContext) => T,
  correlationId: CorrelationId = newCorrelationId(),
): T {
  const context: CorrelationContext = { correlationId, startedAt: Date.now() };
  return storage.run(context, () => fn(context));
}

export function currentCorrelation(): CorrelationContext | undefined {
  return storage.getStore();
}

export function currentCorrelationId(): CorrelationId | null {
  return storage.getStore()?.correlationId ?? null;
}

/** Milliseconds since the current scope began, or `null` outside a scope. */
export function elapsedMs(): number | null {
  const context = storage.getStore();
  return context ? Date.now() - context.startedAt : null;
}
