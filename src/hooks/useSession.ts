/**
 * Who is signed in, as a subscription.
 *
 * Several hooks already call `supabase.auth.getSession()` on mount — which is
 * why a tab change used to re-run a session fetch, a profile query and a prefs
 * sync. This subscribes once for the whole app and shares the answer, using the
 * same module-store shape as `useAdminAccess` and `lib/prefsStore`.
 *
 * SSR note: the server pass has no session and must return a stable object, so
 * the HTML and the hydration pass match. `signedOut` is a module constant for
 * that reason — a fresh literal each call would warn and re-render.
 */

import { useEffect, useSyncExternalStore } from "react";

import { watchAuth } from "@/lib/supabase";

export interface Session {
  userId: string | null;
  /** False until the first auth answer arrives, including on the server. */
  ready: boolean;
}

const signedOut: Session = { userId: null, ready: false };
const ANON: Session = { userId: null, ready: true };

let snapshot: Session = signedOut;
const listeners = new Set<() => void>();
let unwatch: (() => void) | null = null;

function publish(next: Session): void {
  if (next.userId === snapshot.userId && next.ready === snapshot.ready) return;
  snapshot = next;
  for (const l of [...listeners]) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

const getSnapshot = (): Session => snapshot;
const getServerSnapshot = (): Session => signedOut;

function ensureStarted(): void {
  if (unwatch) return;
  unwatch = watchAuth((userId) => {
    publish(userId ? { userId, ready: true } : ANON);
  });
}

/** The current session, and whether the answer has arrived yet. */
export function useSession(): Session {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    ensureStarted();
  }, []);
  return value;
}

export const isSignedIn = (session: Session): boolean =>
  session.ready && session.userId !== null;

/** Test helper: forget what we knew. */
export function __resetSessionForTests(): void {
  snapshot = signedOut;
  if (unwatch) {
    unwatch();
    unwatch = null;
  }
}
