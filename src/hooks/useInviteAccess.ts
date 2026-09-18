/**
 * Is this email invited? Asked of the database, never decided here.
 *
 * Modelled on `useAdminAccess`, which solved the same problem for the admin
 * door: fail closed, cache, time out, and cope with a project where the
 * function isn't installed yet.
 *
 * The distinction that matters, and the reason this hook returns four states
 * rather than two:
 *
 *   · **`invited` / `not-invited`** — the database answered.
 *   · **`unavailable`** — the database couldn't answer: no project is
 *     configured, the `is_email_invited` function isn't installed, the call
 *     timed out, or the network failed.
 *
 * `unavailable` is not treated as "invited". But it also isn't a silent
 * rejection, because the *real* enforcement is server-side: the
 * `bloom_invites_only` trigger on `auth.users` refuses to create an account
 * for an uninvited email no matter what this hook returned. This hook decides
 * what the screen says; the trigger decides who gets in.
 *
 * That split is deliberate. If a missing migration made the hook reject
 * everyone, running the client against a not-yet-migrated project would lock
 * out every existing user with a message claiming they weren't invited — which
 * would be a lie, and an unfixable one from where they're sitting. So the UI
 * says plainly that invite checking isn't active, and the server remains the
 * authority.
 */

import { useCallback, useRef, useState } from "react";

import { hasSupabaseConfig, supabase, supabaseConfigProblem } from "@/lib/supabase";

export type InviteStatus = "checking" | "invited" | "not-invited" | "unavailable";

export interface InviteCheck {
  status: InviteStatus;
  /** Set when the database could not answer, so the UI can say why. */
  reason: string | null;
}

const CHECKING: InviteCheck = { status: "checking", reason: null };
const INVITED: InviteCheck = { status: "invited", reason: null };
const NOT_INVITED: InviteCheck = { status: "not-invited", reason: null };

/** "The function isn't installed" — the migration hasn't been run. */
function isMissingFunction(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === "42883" || code === "PGRST202") return true;
  return typeof message === "string" && /could not find the function/i.test(message);
}

/** Give up on a slow call rather than leaving the button spinning forever. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("invite check timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function unavailable(reason: string): InviteCheck {
  return { status: "unavailable", reason };
}

/**
 * Ask whether an address is on the invite list.
 *
 * Exported as well as wrapped in a hook, because the sign-in screen needs to
 * await the answer in an event handler rather than react to it in an effect.
 */
export async function checkInvited(rawEmail: string): Promise<InviteCheck> {
  const email = rawEmail.trim().toLowerCase();
  if (!email) return unavailable("Enter an email address first.");

  if (!hasSupabaseConfig) {
    return unavailable(
      supabaseConfigProblem() ??
        "This copy of Bloom has no account system connected, so invite checking isn't active.",
    );
  }

  try {
    /* `rpc()` returns a thenable builder, not a Promise — wrap before timing. */
    const { data, error } = await withTimeout(
      Promise.resolve(supabase.rpc("is_email_invited", { p_email: email })),
      12_000,
    );

    if (error) {
      if (isMissingFunction(error)) {
        return unavailable(
          "This project hasn't had invite-only access enabled yet, so Bloom can't check the list.",
        );
      }
      return unavailable("Bloom couldn't reach the invite list. Check your connection.");
    }

    /* Only a literal true counts. Null, a string, an object — all mean no. */
    return data === true ? INVITED : NOT_INVITED;
  } catch {
    return unavailable("Bloom couldn't reach the invite list. Check your connection.");
  }
}

export interface InviteAccess {
  check: InviteCheck;
  /** Run a check for an address. Resolves with the answer. */
  ask: (email: string) => Promise<InviteCheck>;
  reset: () => void;
}

export function useInviteAccess(): InviteAccess {
  const [check, setCheck] = useState<InviteCheck>(CHECKING);
  /* Guards against a late answer overwriting a newer one — type fast, get two
     responses back out of order, and the stale one must lose. */
  const request = useRef(0);

  const ask = useCallback(async (email: string) => {
    const id = (request.current += 1);
    setCheck(CHECKING);
    const result = await checkInvited(email);
    if (request.current === id) setCheck(result);
    return result;
  }, []);

  const reset = useCallback(() => {
    request.current += 1;
    setCheck(CHECKING);
  }, []);

  return { check, ask, reset };
}
