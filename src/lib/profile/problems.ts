/**
 * Turning a provider error into something a person can act on.
 *
 * The Profile page used to collapse every failure into one sentence —
 * "Your profile couldn't be read just now." — which is honest but useless: an
 * offline phone, an expired session, and a Supabase project that never ran the
 * identity migration all need *different* things from the person, and only one
 * of them is fixed by pressing a button again.
 *
 * So every read failure is classified once, here, and the classification
 * decides three things downstream:
 *
 *   · what the screen says,
 *   · whether another attempt is worth making automatically, and
 *   · whether reading fewer columns could still work (a project that ran the
 *     core migration but not the identity one has a `profiles` table with none
 *     of the new columns — the row is still readable, and "Bloom User" with a
 *     working page beats an error wall).
 */

export type ProfileProblemKind =
  /** No network, or the request never reached the project. */
  | "offline"
  /** The session is stale/expired — a refresh usually fixes it. */
  | "session"
  /** The project's schema is missing a table or a column. */
  | "schema"
  /** Row level security said no. */
  | "permission"
  | "unknown";

export interface ProfileProblem {
  kind: ProfileProblemKind;
  /** One calm sentence for the screen. Never a stack trace, never SQL. */
  message: string;
  /** What the provider actually said — console and bug reports only. */
  detail: string;
  /** Whether retrying on its own could plausibly succeed. */
  retryable: boolean;
  /** True when the failure is a *missing column*, so a narrower select may
   *  still read the row. A missing table is not narrower-selectable. */
  partialReadPossible: boolean;
}

const COPY: Record<ProfileProblemKind, string> = {
  offline: "You're offline, so Bloom can't reach your profile right now.",
  session: "Your sign-in went stale. Bloom is retrying it for you.",
  schema: "This copy of Bloom isn't connected to a finished profile table yet.",
  permission: "Your account isn't allowed to read that profile row yet.",
  unknown: "Your profile couldn't be read just now.",
};

/** Flatten whatever shape a provider error arrived in into one string. */
function describe(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = ["message", "code", "details", "hint", "error", "error_description", "status"]
      .map((key) => record[key])
      .filter(
        (value): value is string | number => typeof value === "string" || typeof value === "number",
      )
      .map(String);
    if (parts.length) return parts.join(" | ");
  }
  return String(error);
}

function codeOf(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as Record<string, unknown>)["code"];
    if (typeof code === "string" || typeof code === "number") return String(code).toUpperCase();
  }
  return "";
}

function problem(
  kind: ProfileProblemKind,
  detail: string,
  extra: Partial<ProfileProblem> = {},
): ProfileProblem {
  return {
    kind,
    message: COPY[kind],
    detail,
    retryable: kind === "offline" || kind === "session" || kind === "unknown",
    partialReadPossible: false,
    ...extra,
  };
}

export function classifyError(error: unknown): ProfileProblem {
  const detail = describe(error);
  const haystack = `${codeOf(error)} ${detail}`.toLowerCase();
  const has = (...needles: string[]) => needles.some((needle) => haystack.includes(needle));

  /*
   * The order is the whole function. A row-level-security refusal quotes the
   * relation it refused — `infinite recursion detected in policy for relation
   * "profiles"` — so permission has to be tested before schema, or a policy bug
   * is reported as a missing migration and sent to the wrong person. Likewise a
   * missing *column* is separated from a missing *table*: the first can still be
   * read with a narrower select, the second cannot be read at all.
   */
  if (
    has(
      "42501",
      "row-level security",
      "row level security",
      "permission denied",
      "violates row-level",
      "infinite recursion detected in policy",
    )
  ) {
    return problem("permission", detail, { retryable: false });
  }
  if (
    has(
      "pgrst301",
      "jwt expired",
      "jwtexpired",
      "invalid jwt",
      "token is expired",
      "token expired",
      "refresh_token_not_found",
      "invalid refresh token",
      "session not found",
      "not authenticated",
    ) ||
    codeOf(error) === "401"
  ) {
    return problem("session", detail);
  }
  if (
    has("42703", "column", "pgrst205", "pgrst204") &&
    has("does not exist", "not exist", "could not find")
  ) {
    return problem("schema", detail, { partialReadPossible: true, retryable: false });
  }
  if (has("42p01", "relation", "could not find the table", "schema_cache")) {
    return problem("schema", detail, { retryable: false });
  }
  if (
    has(
      "failed to fetch",
      "networkerror",
      "load failed",
      "network",
      "econnrefused",
      "econnreset",
      "timeout",
      "timed out",
      "aborted",
      "socket hang up",
      "err_internet_disconnected",
    ) ||
    error instanceof TypeError
  ) {
    return problem("offline", detail);
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return problem("offline", detail || "navigator.onLine is false");
  }
  return problem("unknown", detail);
}
