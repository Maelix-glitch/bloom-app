/**
 * AccessGate — the invite-only door.
 *
 * Bloom is by invitation. This is the whole of that idea on screen: a mark, a
 * sentence, an email box and a button. Nothing else earns its place here,
 * because this is the moment someone decides whether to trust the app, and a
 * busy form argues against that.
 *
 * Layout rules, which exist because earlier versions of this screen got it
 * wrong on phones:
 *
 *   · the composition is capped at 400px and centred, so a tablet or a desktop
 *     shows a small intentional panel rather than a stretched sheet
 *   · side margins come from `max()`, so a 320px phone still gets air and the
 *     panel never touches an edge
 *   · safe-area insets are respected at top and bottom
 *   · nothing here is large: the biggest type on the screen is the one line
 *     that says what Bloom is
 *
 * The flow is driven by `lib/auth/flow` — a reducer, not a pile of booleans —
 * so the eleven states can't contradict each other. The whitelist answer comes
 * from the database (`is_email_invited`); the real enforcement is the
 * `bloom_invites_only` trigger, which means this screen can be bypassed
 * without the rule being.
 */

import { useCallback, useReducer, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { BloomLogo } from "@/components/BloomLogo";
import { useInviteAccess } from "@/hooks/useInviteAccess";
import {
  authReducer,
  canResend,
  canSubmit,
  INITIAL_AUTH,
  isLikelyEmail,
  submitLabel,
} from "@/lib/auth/flow";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import { report } from "@/lib/profile/errors";

/** Where a magic link lands. Root, not /profile: the app decides from there. */
function redirectTarget(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/`;
}

export function AccessGate() {
  const [state, dispatch] = useReducer(authReducer, INITIAL_AUTH);
  const { ask } = useInviteAccess();
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!canSubmit(state)) return;
      if (!isLikelyEmail(state.email)) {
        dispatch({ type: "submit" }); // the reducer produces the invalid state
        return;
      }

      setUnavailable(null);

      /* Resending skips the check — they were already approved. */
      if (state.phase !== "sent") {
        dispatch({ type: "submit" });
        const result = await ask(state.email);
        if (result.status === "invited") {
          dispatch({ type: "invited" });
        } else if (result.status === "not-invited") {
          dispatch({ type: "not-invited" });
          return;
        } else {
          /* The database couldn't answer. Say so, and stop — sending a link
             that the trigger would reject anyway is worse than being honest. */
          setUnavailable(result.reason);
          dispatch({ type: "retry" });
          return;
        }
      } else {
        dispatch({ type: "submit" });
      }

      const email = state.email.trim().toLowerCase();
      try {
        const redirectTo = redirectTarget();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
        });
        if (error) {
          report("access:magic-link", error);
          dispatch({ type: "error", message: error.message });
          return;
        }
        dispatch({ type: "sent", email });
      } catch (error) {
        report("access:magic-link", error);
        dispatch({
          type: "error",
          message: error instanceof Error ? error.message : "unknown",
        });
      }
    },
    [ask, state],
  );

  const busy = state.phase === "checking" || state.phase === "sending";
  const sent = state.phase === "sent";

  return (
    <div className="ag-root">
      <div className="ag-panel">
        <div className="ag-mark">
          {/* The favicon itself — the tile the browser tab shows — at 46px. */}
          <BloomLogo size={46} />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {sent ? (
            /* ---------------------------- link sent --------------------------- */
            <motion.div
              key="sent"
              className="ag-body"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="ag-done" aria-hidden>
                <Check className="size-4" />
              </span>
              <h1 className="ag-title">Your Bloom link is on its way.</h1>
              <p className="ag-copy">
                Open the email we sent to <span className="ag-email">{state.sentTo}</span> and tap
                the link to come in.
              </p>
              <div className="ag-actions">
                <button
                  type="button"
                  className="ag-btn"
                  disabled={!canResend(state)}
                  onClick={() => void onSubmit()}
                >
                  {canResend(state) ? "Send it again" : "Link sent"}
                </button>
                <button
                  type="button"
                  className="ag-btn ag-btn--quiet"
                  onClick={() => dispatch({ type: "edit-email" })}
                >
                  Use a different email
                </button>
              </div>
              <p className="ag-note">Nothing arrived? Check spam, then send it again.</p>
            </motion.div>
          ) : (
            /* ------------------------------ ask ------------------------------ */
            <motion.form
              key="ask"
              className="ag-body"
              onSubmit={(e) => void onSubmit(e)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="ag-title">Bloom is by invitation.</h1>
              <p className="ag-copy">
                Enter the email you were invited with. If it's on the list, we'll send you a link to
                sign in.
              </p>

              <label className="ag-label" htmlFor="ag-email">
                Email
              </label>
              <input
                id="ag-email"
                className="ag-input"
                type="email"
                name="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
                placeholder="you@example.com"
                value={state.email}
                disabled={busy}
                aria-invalid={state.phase === "invalid" || state.phase === "rejected"}
                aria-describedby={state.message || unavailable ? "ag-message" : undefined}
                onChange={(e) => dispatch({ type: "email", value: e.target.value })}
              />

              <AnimatePresence initial={false}>
                {state.message || unavailable ? (
                  <motion.p
                    id="ag-message"
                    key={state.message ?? unavailable ?? ""}
                    className="ag-message"
                    role="status"
                    data-tone={state.phase === "rejected" ? "reject" : "warn"}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {state.message ?? unavailable}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <button type="submit" className="ag-btn" disabled={busy}>
                {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                {submitLabel(state)}
              </button>

              {state.phase === "rejected" ? (
                <button
                  type="button"
                  className="ag-btn ag-btn--quiet"
                  onClick={() => dispatch({ type: "edit-email" })}
                >
                  <ArrowLeft className="size-3.5" aria-hidden /> Try another email
                </button>
              ) : null}
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      <p className="ag-foot">
        {hasSupabaseConfig
          ? "Invitations are private. We only use your email to sign you in."
          : "This copy of Bloom has no account system connected."}
      </p>
    </div>
  );
}
