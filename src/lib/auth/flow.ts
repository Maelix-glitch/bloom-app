/**
 * The invite-only sign-in flow, as a state machine.
 *
 * Kept out of the component on purpose. This flow has eleven states and the
 * transitions between them are the actual product logic — which state shows a
 * resend button, which one is a dead end, which one recovers on retry. In JSX
 * those rules become a pile of booleans that contradict each other; here they
 * are one exhaustive switch that a test can walk.
 *
 * The component's only job is to render the current state and dispatch events.
 */

export type AuthPhase =
  /** Nothing typed yet. */
  | "idle"
  /** An address is in the box. */
  | "typing"
  /** Asking the server whether this address is invited. */
  | "checking"
  /** Invited — the link is being sent. */
  | "sending"
  /** Link sent; this is a resting state, not a spinner. */
  | "sent"
  /** Not on the list. A dead end until they try another address. */
  | "rejected"
  /** The address is not a valid email. */
  | "invalid"
  /** The check or the send failed for a reason that is not their fault. */
  | "failed"
  /** Signed in, but onboarding has not been answered. */
  | "personalization"
  /** Signed in and set up. */
  | "authenticated";

export interface AuthState {
  phase: AuthPhase;
  /** What is in the email box. */
  email: string;
  /** The address a link was sent to, so the confirmation can name it. */
  sentTo: string | null;
  /** A human-facing message. Never a raw backend string — see `messageFor`. */
  message: string | null;
  /** How many links have been sent to `sentTo`, to gate resends. */
  sends: number;
}

export type AuthEvent =
  | { type: "email"; value: string }
  | { type: "submit" }
  | { type: "invited" }
  | { type: "not-invited" }
  | { type: "sent"; email: string }
  | { type: "error"; message: string }
  | { type: "retry" }
  | { type: "edit-email" }
  | { type: "authenticated"; needsPersonalization: boolean };

export const INITIAL_AUTH: AuthState = {
  phase: "idle",
  email: "",
  sentTo: null,
  message: null,
  sends: 0,
};

/**
 * Email validation that is deliberately permissive.
 *
 * The job here is to catch typos before spending a round trip, not to be a
 * mail-server parser. Anything with one `@`, a dot after it, and no spaces
 * goes through; the server has the real answer.
 */
export function isLikelyEmail(value: string): boolean {
  const email = value.trim();
  if (email.length < 3 || email.length > 320) return false;
  if (/\s/.test(email)) return false;
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  return domain.includes(".") && !domain.startsWith(".") && !domain.endsWith(".");
}

/**
 * Turn a failure into something a person can act on.
 *
 * Backend messages are written for whoever is debugging at 2am. These are
 * written for someone who just wanted to open an app.
 */
export function messageFor(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (/rate|limit|too many/i.test(text)) {
    return "That's a few too many attempts. Give it a minute and try again.";
  }
  if (/smtp|email provider|sender/i.test(text)) {
    return "Bloom can't send email right now. Try again shortly.";
  }
  if (/network|fetch|offline|failed to fetch/i.test(text)) {
    return "No connection. Check your network and try again.";
  }
  if (/invite|invitation/i.test(text)) {
    return "That address isn't on the invite list.";
  }
  return "That didn't work. Check your connection and try again.";
}

/** Whether the primary button should do anything. */
export function canSubmit(state: AuthState): boolean {
  return state.phase !== "checking" && state.phase !== "sending";
}

/** Whether a resend is allowed — gated so the button can't be hammered. */
export function canResend(state: AuthState): boolean {
  return state.phase === "sent" && state.sends < 3;
}

/** The label for the primary button, per state. */
export function submitLabel(state: AuthState): string {
  switch (state.phase) {
    case "checking":
      return "Checking…";
    case "sending":
      return "Sending…";
    case "sent":
      return "Resend link";
    default:
      return "Continue";
  }
}

export function authReducer(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case "email": {
      const email = event.value;
      /* While a link is already on its way, editing the box means starting
         over with a different address — drop the sent state. */
      const phase: AuthPhase =
        email.length === 0
          ? "idle"
          : state.phase === "sent" && email !== state.sentTo
            ? "typing"
            : state.phase === "rejected" || state.phase === "invalid" || state.phase === "failed"
              ? "typing"
              : state.phase === "sent"
                ? "sent"
                : "typing";
      return { ...state, email, phase, message: phase === "typing" ? null : state.message };
    }

    case "submit": {
      if (!canSubmit(state)) return state;
      if (!isLikelyEmail(state.email)) {
        return {
          ...state,
          phase: "invalid",
          message: "That doesn't look like an email address.",
        };
      }
      /* Resending from `sent` goes straight to sending — they were already
         approved, so there is nothing to re-check. */
      return {
        ...state,
        phase: state.phase === "sent" ? "sending" : "checking",
        message: null,
      };
    }

    case "invited":
      return state.phase === "checking" ? { ...state, phase: "sending", message: null } : state;

    case "not-invited":
      return state.phase === "checking"
        ? {
            ...state,
            phase: "rejected",
            message: "That address isn't on the invite list.",
          }
        : state;

    case "sent":
      return {
        ...state,
        phase: "sent",
        sentTo: event.email,
        sends: state.sentTo === event.email ? state.sends + 1 : 1,
        message: null,
      };

    case "error":
      /* An error while sending leaves the address approved — they can retry
         the send without another check. */
      return {
        ...state,
        phase: "failed",
        message: messageFor(event.message),
      };

    case "retry":
      /* Go back to the box with the address intact. */
      return { ...state, phase: state.email ? "typing" : "idle", message: null };

    case "edit-email":
      return { ...state, phase: state.email ? "typing" : "idle", message: null };

    case "authenticated":
      return {
        ...state,
        phase: event.needsPersonalization ? "personalization" : "authenticated",
        message: null,
      };
  }
}
