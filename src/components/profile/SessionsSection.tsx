/**
 * SessionsSection — where you're signed in, and the switches to end it.
 *
 * Honest by construction: the browser can only see *this* device, so the
 * section says exactly that. What it offers is what a client can truly do —
 * end this session, end every session (Supabase revokes all refresh tokens),
 * and erase what this browser holds. No fabricated device list.
 */

import { useEffect, useState } from "react";
import { IconDevices, IconErase, IconLaptop, IconLogOut } from "@/components/profile/SettingsIcons";
import { BloomConfirm } from "@/components/ui/bloom-sheet";

import { bloomKeys } from "@/lib/data/erase";
import { fmtDate } from "@/lib/format";
import { hasSupabaseConfig, supabase, watchAuth } from "@/lib/supabase";

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
  /* Which sign-out the confirmation sheet is armed with (M-234). Both
     rows open the sheet; the sign-out call itself waits for the confirm. */
  const [pending, setPending] = useState<null | "local" | "global">(null);
  const [busy, setBusy] = useState<null | "local" | "global">(null);

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const load = () => {
      void supabase.auth
        .getSession()
        .then(({ data }) => {
          setSession(
            data.session
              ? {
                  email: data.session.user.email ?? null,
                  since: data.session.user.created_at?.slice(0, 10) ?? null,
                }
              : null,
          );
        })
        .catch(() => setSession(null));
    };
    const stop = watchAuth(() => load());
    return () => stop();
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
    setBusy("global");
    try {
      await supabase.auth.signOut({ scope: "global" });
    } finally {
      setBusy(null);
      setSession(null);
    }
  };

  return (
    <section aria-label="Sessions and devices" className="pf-group">
      <div className="pf-group-rows">
        <div className="pf-row">
          <span className="pf-row-icon" aria-hidden>
            <IconLaptop />
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
              <IconDevices />
            </span>
            <span className="pf-row-text">
              <span className="pf-row-label">{session.email ?? "Your account"}</span>
              <span className="pf-row-hint">
                {session.since ? `account since ${fmtDate(session.since)}` : "signed in on this device"}
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
              onClick={() => setPending("local")}
              disabled={busy !== null}
            >
              <span className="pf-row-icon" aria-hidden>
                <IconLogOut />
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
              onClick={() => setPending("global")}
              disabled={busy !== null}
            >
              <span className="pf-row-icon" aria-hidden>
                <IconLogOut />
              </span>
              <span className="pf-row-text">
                <span className="pf-row-label">Sign out on every device</span>
                <span className="pf-row-hint">
                  Revokes all sessions at once, including this one
                </span>
              </span>
              <span className="pf-row-value">{busy === "global" ? "Signing out…" : ""}</span>
              <span />
            </button>
          </>
        ) : null}

      </div>

      {/* Danger zone — its own rose-toned card, separated from the sessions
          list above it (the owner's Profile file pattern). Erase everything
          lives inside the EraseSheet this row opens. */}
      <p className="pf-danger-label">Danger zone</p>
      <div className="pf-group-rows pf-group-rows--danger">
        <button type="button" className="pf-row" onClick={onOpenErase}>
          <span className="pf-row-icon" aria-hidden>
            <IconErase />
          </span>
          <span className="pf-row-text">
            <span className="pf-row-label">Erase this device</span>
            <span className="pf-row-hint">
              Removes every local record from this browser{isSignedIn ? ", account untouched" : ""}
            </span>
          </span>
          <span className="pf-row-value pf-row-value--danger">Erase…</span>
          <span />
        </button>
      </div>

      {/* One confirmation for both sign-out rows (M-234): the copy names
          the cost (a fresh sign-in link); the global variant adds that
          every session ends. Nothing signs out until this confirms. */}
      <BloomConfirm
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Sign out?"
        description={
          pending === "global"
            ? "You'll need a fresh sign-in link to get back in. This signs you out on every device."
            : "You'll need a fresh sign-in link to get back in."
        }
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        busyLabel="Signing out…"
        onConfirm={async () => {
          if (pending === "global") await signOutEverywhere();
          else await signOutHere();
        }}
      />
    </section>
  );
}
