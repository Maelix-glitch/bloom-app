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
import { Link } from "@tanstack/react-router";
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
import { requestMagicLink } from "@/lib/auth/magicLink";
import { verifyEmailCode } from "@/lib/auth/verifyCode";
import { hasSupabaseConfig } from "@/lib/supabase";

/** The emailed code's length, as configured on the project (mailer_otp_length). */
const CODE_LENGTH = 8;

/** Where the email's backup link lands. Root, not /profile: the app decides. */
function redirectTarget(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/`;
}

export function AccessGate() {
  const [state, dispatch] = useReducer(authReducer, INITIAL_AUTH);
  const { ask } = useInviteAccess();
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [code, setCode] = useState("");

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

  const onVerify = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (state.phase !== "sent") return;
      const token = code.trim();
      if (token.length !== CODE_LENGTH) return;
      dispatch({ type: "verify" });
      const result = await verifyEmailCode(state.sentTo ?? state.email, token, {
        scope: "access:verify-code",
      });
      if (!result.ok) {
        dispatch({ type: "verify-error", message: result.message });
        return;
      }
      /* Verified. Supabase now holds a session in this tab, and the root's
         session handling swaps the gate for the app — no navigation, no new
         tab, nothing more for this screen to do. */
    },
    [code, state.email, state.phase, state.sentTo],
  );

  const onEditEmail = useCallback(() => {
    setCode("");
    dispatch({ type: "edit-email" });
  }, []);

  const busy = state.phase === "checking" || state.phase === "sending";
  const verifying = state.phase === "verifying";
  const sent = state.phase === "sent" || verifying;

  return (
    <div className="ag-root">
      <div className="ag-panel">
        <div className="ag-mark">
          {/* The favicon itself — the tile the browser tab shows — at 46px. */}
          <BloomLogo size={46} tile />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {sent ? (
            /* ---------------------------- code sent --------------------------- */
            <motion.form
              key="sent"
              className="ag-body"
              onSubmit={(e) => void onVerify(e)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="ag-done" aria-hidden>
                <Check className="size-4" />
              </span>
              <h1 className="ag-title">Check your email for a code.</h1>
              <p className="ag-copy">
                We sent an {CODE_LENGTH}-digit code to{" "}
                <span className="ag-email">{state.sentTo}</span>. Type it here and you're in — right
                here, in this tab. The same email also has a link, if you'd rather tap that.
              </p>

              <label className="ag-label" htmlFor="ag-code">
                Sign-in code
              </label>
              <input
                id="ag-code"
                className="ag-input ag-code"
                type="text"
                name="code"
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="numeric"
                placeholder="12345678"
                value={code}
                disabled={verifying}
                aria-invalid={state.message ? true : undefined}
                aria-describedby={state.message ? "ag-message" : undefined}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
              />

              <AnimatePresence initial={false}>
                {state.message ? (
                  <motion.p
                    id="ag-message"
                    key={state.message}
                    className="ag-message"
                    role="status"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {state.message}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              <button
                type="submit"
                className="ag-btn"
                disabled={verifying || code.trim().length !== CODE_LENGTH}
              >
                {verifying ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                {verifying ? "Checking…" : "Verify and come in"}
              </button>

              <div className="ag-actions">
                <button
                  type="button"
                  className="ag-btn ag-btn--quiet"
                  disabled={!canResend(state)}
                  onClick={() => void onSubmit()}
                >
                  {canResend(state) ? "Send a fresh code" : "Code sent"}
                </button>
                <button type="button" className="ag-btn ag-btn--quiet" onClick={onEditEmail}>
                  Use a different email
                </button>
              </div>
              <p className="ag-note">
                Nothing arrived? Check spam, then send a fresh code. Codes last an hour.
              </p>
            </motion.form>
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
                Enter the email you were invited with. If it's on the list, we'll email you a code
                to sign in.
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
      </p>
    </div>
  );
}
