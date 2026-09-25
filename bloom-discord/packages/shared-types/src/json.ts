/**
 * The shape of anything we are willing to serialise into a log line, an audit
 * row or an error payload.
 *
 * This is deliberately narrower than `unknown`. Log details must survive
 * `JSON.stringify` without throwing on a BigInt and without silently dropping a
 * function, and audit rows must round-trip through `jsonb` unchanged.
 */
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type JsonObject = Record<string, JsonValue>;

/** Structured, serialisable context attached to errors, logs and audit rows. */
export type Details = Readonly<JsonObject>;
