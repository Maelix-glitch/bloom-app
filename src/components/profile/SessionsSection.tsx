/**
 * SessionsSection — where you're signed in, and the switches to end it.
 *
 * Honest by construction: the browser can only see *this* device, so the
 * section says exactly that. What it offers is what a client can truly do —
 * end this session, end every session (Supabase revokes all refresh tokens),
 * and erase what this browser holds. No fabricated device list.
 */

import { useEffect, useState } from "react";
import { Eraser, Laptop, LogOut, MonitorSmartphone } from "lucide-react";

import { bloomKeys } from "@/lib/data/erase";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

interface SessionInfo {
  email: string | null;
  since: string | null;
}

export function SessionsSection({
  isSignedIn,
  onOpenErase,
}: {
  isSignedIn: boolean;
  onOpenErase: () => void;
}) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [deviceKeys, setDeviceKeys] = useState<number>(0);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState<null | "local" | "global">(null);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const load = () => {
      void supabase.auth.getSession().then(({ data }) => {
        setSession(
          data.session
            ? {
                email: data.session.user.email ?? null,
                since: data.session.user.created_at?.slice(0, 10) ?? null,
              }
            : null,
        );
      });
    };
    load();
    const { data } = supabase.auth.onAuthStateChange(() => load());
    return () => data.subscription.unsubscribe();
  }, [isSignedIn]);

  useEffect(() => {
    setDeviceKeys(bloomKeys(window.localStorage).length);
  }, []);

  const signOutHere = async () => {
    setBusy("local");
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setBusy(null);
      setSession(null);
    }
  };

  const signOutEverywhere = async () => {
    if (!confirmAll) {
      setConfirmAll(true);
      window.setTimeout(() => setConfirmAll(false), 4000);
      return;
    }
    setBusy("global");
    try {
      await supabase.auth.signOut({ scope: "global" });
    } finally {
      setBusy(null);
      setConfirmAll(false);
      setSession(null);
    }
  };

  return (
    <section aria-label="Sessions and devices" className="pf-group">
      <div className="pf-group-rows">
        <div className="pf-row">
          <span className="pf-row-icon" aria-hidden>
            <Laptop className="size-4" />
          </span>
          <span className="pf-row-text">
            <span className="pf-row-label">This device</span>
            <span className="pf-row-hint">
              {deviceKeys > 0
                ? `${deviceKeys} local record${deviceKeys === 1 ? "" : "s"} stored in this browser`
                : "Nothing stored in this browser yet"}
            </span>
          </span>
          <span className="pf-row-value">{isSignedIn ? "signed in" : "local only"}</span>
          <span />
        </div>

        {isSignedIn && session ? (
          <div className="pf-row">
            <span className="pf-row-icon" aria-hidden>
              <MonitorSmartphone className="size-4" />
            </span>
            <span className="pf-row-text">
              <span className="pf-row-label">{session.email ?? "Your account"}</span>
              <span className="pf-row-hint">
                {session.since ? `account since ${session.since}` : "signed in on this device"}
              </span>
            </span>
            <span className="pf-row-value">active here</span>
            <span />
          </div>
        ) : null}

        {isSignedIn ? (
          <>
            <button
              type="button"
              className="pf-row"
              onClick={() => void signOutHere()}
              disabled={busy !== null}
            >
              <span className="pf-row-icon" aria-hidden>
                <LogOut className="size-4" />
              </span>
              <span className="pf-row-text">
                <span className="pf-row-label">Sign out on this device</span>
                <span className="pf-row-hint">Your record stays in your account</span>
              </span>
              <span className="pf-row-value">{busy === "local" ? "Signing out…" : ""}</span>
              <span />
            </button>

            <button
              type="button"
              className="pf-row"
              onClick={() => void signOutEverywhere()}
              disabled={busy !== null}
            >
              <span className="pf-row-icon" aria-hidden>
                <LogOut className="size-4" />
              </span>
              <span className="pf-row-text">
                <span className="pf-row-label">Sign out on every device</span>
                <span className="pf-row-hint">
                  Revokes all sessions at once, including this one
                </span>
              </span>
              <span className="pf-row-value">
                {busy === "global" ? "Signing out…" : confirmAll ? "Tap again to confirm" : ""}
              </span>
              <span />
            </button>
          </>
        ) : null}

        <button type="button" className="pf-row" onClick={onOpenErase}>
          <span className="pf-row-icon" aria-hidden>
            <Eraser className="size-4" />
          </span>
          <span className="pf-row-text">
            <span className="pf-row-label">Erase this device</span>
            <span className="pf-row-hint">
              Removes every local record from this browser{isSignedIn ? " — account untouched" : ""}
            </span>
          </span>
          <span className="pf-row-value pf-row-value--danger">Erase…</span>
          <span />
        </button>
      </div>
    </section>
  );
}
