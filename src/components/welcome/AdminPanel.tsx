/**
 * The admin door.
 *
 * The first version was a ghost link that dropped you on the home page and
 * wrote an `admin: true` flag nothing ever read. This is the interface that
 * link should have opened: a launcher for the parts of Bloom that are
 * otherwise unreachable, plus the switches you'd want off while you work.
 *
 * Three deliberate choices:
 *
 *   · **It's a launcher, not a skip.** The person pressing this is building
 *     the app; the useful question is "which surface?", not "may I in?".
 *     Picking a destination *is* the confirmation, so there's no extra step.
 *   · **Keyboard first.** Type to filter, arrows to move, enter to go. This is
 *     a developer tool and it should behave like one — the mouse is optional.
 *   · **Honest about what it is.** Reaching this panel means the database
 *     already said yes: `useAdminAccess` asks `public.app_admins` before a
 *     single caller renders the button. Nothing here invents an identity, and
 *     the reward admin and point audit still enforce their own rules on the
 *     server regardless of how you got here. The footer says so.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Search, Shield, Volume2, VolumeX, X } from "lucide-react";

import { adminTargetsByGroup, type AdminTarget } from "@/lib/onboarding/adminTargets";
import { useSound } from "@/hooks/useSound";
import "@/styles/admin-panel.css";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function AdminPanel({
  onLaunch,
  onClose,
}: {
  /** Enter admin mode and go to `to`. */
  onLaunch: (to: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const { sound, enabled: soundOn, setEnabled: setSoundOn } = useSound();

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return adminTargetsByGroup();
    return adminTargetsByGroup()
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (t) =>
            t.label.toLowerCase().includes(q) ||
            t.detail.toLowerCase().includes(q) ||
            t.to.includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  /* One flat list so the arrow keys can cross group boundaries. */
  const flat = useMemo<AdminTarget[]>(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* Filtering can shorten the list out from under the cursor. */
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setCursor((c) => (flat.length === 0 ? 0 : (c + 1) % flat.length));
        return;
      }
      if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setCursor((c) => (flat.length === 0 ? 0 : (c - 1 + flat.length) % flat.length));
        return;
      }
      if (e.key === "Enter") {
        const target = flat[cursor];
        if (target) {
          e.preventDefault();
          sound("celebrate");
          onLaunch(target.to);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flat, cursor, onLaunch, onClose, sound]);

  /* Keep the highlighted row in view when arrowing past the fold. */
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  let index = -1;

  return (
    <motion.div
      className="adm"
      role="dialog"
      aria-modal="true"
      aria-label="Admin launcher"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button className="adm-scrim" onClick={onClose} aria-label="Close admin launcher" />

      <motion.div
        className="adm-panel"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.99 }}
        transition={{ duration: 0.36, ease: EASE }}
      >
        <header className="adm-head">
          <span className="adm-badge">
            <Shield size={13} />
          </span>
          <div className="min-w-0">
            <p className="adm-title">Admin launcher</p>
            <p className="adm-sub">Skip setup and open any surface directly.</p>
          </div>
          <button type="button" className="adm-x" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </header>

        <div className="adm-search">
          <Search size={14} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            placeholder="Search surfaces…"
            aria-label="Search admin destinations"
            spellCheck={false}
            autoComplete="off"
          />
          <kbd className="adm-kbd">esc</kbd>
        </div>

        <div className="adm-list" ref={listRef} role="listbox" aria-label="Destinations">
          {groups.length === 0 ? (
            <p className="adm-empty">Nothing matches “{query.trim()}”.</p>
          ) : (
            groups.map((g) => (
              <section key={g.group} className="adm-group">
                <p className="adm-group-label">{g.label}</p>
                {g.items.map((t) => {
                  index += 1;
                  const i = index;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="option"
                      aria-selected={i === cursor}
                      data-index={i}
                      className="adm-item"
                      data-on={i === cursor}
                      onPointerEnter={() => setCursor(i)}
                      onClick={() => {
                        sound("celebrate");
                        onLaunch(t.to);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="adm-item-label">{t.label}</span>
                        <span className="adm-item-detail">{t.detail}</span>
                      </span>
                      <span className="adm-item-route">{t.to}</span>
                      <ArrowRight size={14} className="adm-item-arrow" aria-hidden />
                    </button>
                  );
                })}
              </section>
            ))
          )}
        </div>

        <footer className="adm-foot">
          <button
            type="button"
            className="adm-toggle"
            role="switch"
            aria-checked={soundOn}
            onClick={() => setSoundOn(!soundOn)}
            title="Sound is usually the first thing you want off while working"
          >
            {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
            Sound {soundOn ? "on" : "off"}
          </button>
          <p className="adm-note">
            This door only appears for an account listed in Bloom's admin table. It skips setup and
            opens surfaces directly — the reward admin and point audit still check your access on
            the server.
          </p>
        </footer>
      </motion.div>
    </motion.div>
  );
}
