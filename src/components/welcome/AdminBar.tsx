/**
 * The way back out of admin mode.
 *
 * Without this the admin door is a trap: it writes `done: true`, the welcome
 * flow never reappears, and there is no way to see the real first-run
 * experience again short of clearing storage. That is exactly the flow you most
 * need to re-test while building it.
 *
 * So admin mode is *visible* and *exitable*. A thin bar, pinned low and out of
 * the way, that does two things:
 *
 *   · reopens the launcher, so you can jump somewhere else without navigating;
 *   · exits — clearing the onboarding record so the welcome flow runs again.
 *
 * It is the only consumer of the `admin` flag, which is what turns that flag
 * from bookkeeping into a mode.
 */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Shield } from "lucide-react";

import { AdminPanel } from "@/components/welcome/AdminPanel";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useOnboarding } from "@/hooks/useOnboarding";
import { isAdmin } from "@/lib/onboarding/profileKind";
import "@/styles/admin-panel.css";

export function AdminBar() {
  const { state, hydrated, reset } = useOnboarding();
  const adminAccess = useAdminAccess();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  /*
   * The local `admin` flag only records *how someone got in*; whether they may
   * stay in is the database's answer. Everyone who used the old ungated door
   * has the flag set, so clearing it here is what puts them back into the real
   * setup flow instead of leaving them skipping onboarding forever with a mode
   * they can no longer see.
   *
   * Only ever on a settled "denied" — never while the check is still in
   * flight, or a slow network would throw an admin out of their own app.
   */
  const clearedRef = useRef(false);
  const staleAdminFlag = hydrated && isAdmin(state) && adminAccess.status === "denied";
  useEffect(() => {
    if (!staleAdminFlag || clearedRef.current) return;
    clearedRef.current = true;
    reset();
  }, [staleAdminFlag, reset]);

  /* `hydrated` guards the server pass, which can't read storage. */
  if (!hydrated || !isAdmin(state) || adminAccess.status !== "granted") return null;

  return (
    <>
      <motion.div
        className="adm-bar"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
      >
        <span className="adm-bar-mark" aria-hidden>
          <Shield size={11} />
        </span>
        <span className="adm-bar-label">{adminAccess.devOnly ? "Dev" : "Admin"}</span>
        <button type="button" className="adm-bar-btn" onClick={() => setOpen(true)}>
          Go to…
        </button>
        <button
          type="button"
          className="adm-bar-btn adm-bar-exit"
          onClick={() => {
            /* Clearing the record is what brings the welcome flow back — the
               whole point of being able to leave. */
            reset();
            void navigate({ to: "/" });
          }}
          title="Clear setup and see the welcome flow again"
        >
          <LogOut size={11} />
          Exit
        </button>
      </motion.div>

      <AnimatePresence>
        {open && adminAccess.status === "granted" ? (
          <AdminPanel
            onLaunch={(to) => {
              setOpen(false);
              void navigate({ to });
            }}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}