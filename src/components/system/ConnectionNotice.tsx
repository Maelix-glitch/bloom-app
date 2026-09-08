/**
 * Tell the person when Bloom isn't connected to a database.
 *
 * This is the fix for the *worst* part of the bug report: not that saving
 * failed, but that it failed silently. Habits wouldn't save, the magic link
 * did nothing, the cycle page spun — and nothing anywhere said why. From the
 * outside that is indistinguishable from the app being broken.
 *
 * Bloom is genuinely usable with no database at all: every feature falls back
 * to this device. That's a legitimate mode, not an error — so this reads as a
 * status, not an alarm, and it can be dismissed. But it must be *visible*,
 * because "saved on this device only" and "saved to your account" are very
 * different promises and the person deserves to know which one they have.
 */

import { useEffect, useState } from "react";
import { CloudOff, X } from "lucide-react";

import { hasSupabaseConfig, supabaseConfigProblem } from "@/lib/supabase";
import "@/styles/connection-notice.css";

const DISMISSED_KEY = "bloom.connection-notice.dismissed.v1";

export function ConnectionNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    /* Only after mount — the server can't read localStorage, and rendering
       this during SSR would put it in the HTML for correctly-configured apps. */
    if (hasSupabaseConfig) return;
    try {
      if (window.localStorage.getItem(DISMISSED_KEY) === "1") return;
    } catch {
      /* private browsing — show it, that's the safe default */
    }
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="conn-notice" role="status">
      <span className="conn-notice-icon" aria-hidden>
        <CloudOff size={14} />
      </span>
      <div className="conn-notice-body">
        <p className="conn-notice-title">Saving to this device only</p>
        <p className="conn-notice-text">
          {supabaseConfigProblem()} Your logs are safe here, but they won't sync or
          survive clearing your browser data.
        </p>
      </div>
      <button
        type="button"
        className="conn-notice-x"
        aria-label="Dismiss"
        onClick={() => {
          setShow(false);
          try {
            window.localStorage.setItem(DISMISSED_KEY, "1");
          } catch {
            /* nothing to do — it just reappears next load */
          }
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
