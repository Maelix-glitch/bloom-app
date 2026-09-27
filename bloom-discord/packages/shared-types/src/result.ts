/**
 * Explicit success/failure.
 *
 * Used for *expected* outcomes — "this member is not authorized", "the bot role
 * is too low", "that reward was already granted". Those are normal branches in
 * a Discord bot, not exceptions, and modelling them as return values forces
 * every call site to decide what to tell the user.
 *
 * Exceptions remain reserved for genuinely unexpected failures.
 */
export type Result<TValue, TError> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly error: TError };

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value };
}

export function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error };
}

export function isOk<TValue, TError>(
  result: Result<TValue, TError>,
): result is { ok: true; value: TValue } {
  return result.ok;
}

export function isErr<TValue, TError>(
  result: Result<TValue, TError>,
): result is { ok: false; error: TError } {
  return !result.ok;
}

/** Unwrap or throw. Only for call sites that have already checked, and for tests. */
export function unwrap<TValue, TError>(result: Result<TValue, TError>): TValue {
  if (result.ok) return result.value;
  throw result.error instanceof Error
    ? result.error
    : new Error(`Attempted to unwrap a failed Result: ${JSON.stringify(result.error)}`);
}

export function mapResult<TValue, TNext, TError>(
  result: Result<TValue, TError>,
  fn: (value: TValue) => TNext,
): Result<TNext, TError> {
  return result.ok ? ok(fn(result.value)) : result;
}
