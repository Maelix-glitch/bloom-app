/**
 * AccessGate — the invite-only door.
 *
 * Bloom is by invitation. This is the whole of that idea on screen: a mark, a
 * sentence, an email box and a button. Nothing else earns its place here,
 * because this is the moment someone decides whether to trust the app, and a
 * busy form argues against that.
 *
 * Layout (M-172): the gate wears the owner-approved invitation preview's
 * composition — the four-pool mesh scene, the words sitting directly on
 * it in a 410px column, the preview's glass flower over the ask, one
 * glass field, the solid gold CTA pinned to the foot. The presentation
 * lives in styles/invite.css, layered over access.css (whose text is
 * pinned by ui.guard and contrast.guard and stays untouched). The rules
 * that exist because earlier versions of this screen got it wrong on
 * phones still hold:
 *
 *   · the composition is capped at 410px and centred, so a tablet or a desktop
 *     shows the same intentional column rather than a stretched sheet
 *   · side padding is a fixed step, so a 320px phone still gets air and the
 *     column never touches an edge
 *   · safe-area insets are respected at top and bottom
 *
 * The flow is driven by `lib/auth/flow` — a reducer, not a pile of booleans —
 * so the eleven states can't contradict each other. The whitelist answer comes
 * from the database (`is_email_invited`); the real enforcement is the
 * `bloom_invites_only` trigger, which means this screen can be bypassed
 * without the rule being.
 */

import { useCallback, useReducer, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

import { useInviteAccess } from "@/hooks/useInviteAccess";
import {
  authReducer,
  canResend,
  canSubmit,
  INITIAL_AUTH,
  isLikelyEmail,
  submitLabel,
} from "@/lib/auth/flow";
import { requestMagicLink } from "@/lib/auth/magicLink";
import { hasSupabaseConfig } from "@/lib/supabase";

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
      const result = await requestMagicLink(email, {
        redirectTo: redirectTarget(),
        scope: "access:magic-link",
      });
      if (!result.ok) {
        dispatch({ type: "error", message: result.message });
        return;
      }
      dispatch({ type: "sent", email });
    },
    [ask, state],
  );

  const busy = state.phase === "checking" || state.phase === "sending";
  const sent = state.phase === "sent";

  return (
    <div className="ag-root">
      {/* The preview's mesh: four pools of palette light, each with its
          own drift, behind the words (styles/invite.css). */}
      <div className="ig-mesh" aria-hidden>
        <i className="m1" />
        <i className="m2" />
        <i className="m3" />
        <i className="m4" />
      </div>

      <div className="ag-scene">
        {!sent ? (
          /* The preview's hero flower over the ask: glass petals over a
             gold heart. The sent state trades it for the seal inside
             its own body. Pure decoration. */
          <div className="ig-flower" aria-hidden>
            <i />
            <i />
            <i />
            <b />
          </div>
        ) : null}

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
              <p className="ig-kicker">Bloom is invite-only</p>
              <h1 className="ag-title">Your Bloom link is on its way.</h1>
              <p className="ag-copy">
                Open the email we sent to <span className="ag-email">{state.sentTo}</span> and tap
                the link to come in.
              </p>
              <div className="ag-actions">
                <button
                  type="button"
                  className="ag-btn glass-cta"
                  disabled={!canResend(state)}
                  onClick={() => void onSubmit()}
                >
                  {canResend(state) ? "Send it again" : "Link sent"}
                </button>
                <button
                  type="button"
                  className="ag-btn ag-btn--quiet glass-pill"
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
              <p className="ig-kicker">Bloom is invite-only</p>
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
                className="ag-input glass-field"
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

              <button type="submit" className="ag-btn glass-cta" data-solid="true" disabled={busy}>
                {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                {submitLabel(state)}
              </button>

              {state.phase === "rejected" ? (
                <button
                  type="button"
                  className="ag-btn ag-btn--quiet glass-pill"
                  onClick={() => dispatch({ type: "edit-email" })}
                >
                  <ArrowLeft className="size-3.5" aria-hidden /> Try another email
                </button>
              ) : null}
            </motion.form>
          )}
        </AnimatePresence>

        <p className="ag-foot">
          {hasSupabaseConfig
            ? "Invitations are private. We only use your email to sign you in."
            : "This copy of Bloom has no account system connected."}
        </p>
        <p className="ag-foot mt-1 flex justify-center gap-4">
          <Link
            to="/privacy"
            className="underline underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="underline underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
          >
            Terms
          </Link>
          <Link
            to="/refund"
            className="underline underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
          >
            Refunds
          </Link>
          <Link
            to="/contact"
            className="underline underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
          >
            Contact
          </Link>
        </p>
      </div>
    </div>
  );
}
