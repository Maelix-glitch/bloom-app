/**
 * What /cycle shows to someone who said the cycle isn't part of their Bloom.
 *
 * Deliberately *not* a permission wall. They aren't blocked, they opted out —
 * usually during setup, possibly by tapping the wrong card, and quite possibly
 * they've arrived here from a bookmark or a shared link and simply changed
 * their mind. So this page:
 *
 *   · doesn't scold, explain a policy, or use the word "access";
 *   · says plainly what lives here and why it's hidden;
 *   · turns it on in one tap, and lands them straight in it;
 *   · offers a way back to the rest of the app for anyone who arrived by
 *     accident.
 */

import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Sparkles } from "lucide-react";

import { useOnboarding } from "@/hooks/useOnboarding";
import { useSound } from "@/hooks/useSound";
import art from "@/assets/mood/flower-branch.jpg";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CycleNotYours() {
  const { setKind } = useOnboarding();
  const { sound } = useSound();
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[80dvh] items-center justify-center overflow-hidden px-5 py-16">
      <img
        src={art}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full scale-105 object-cover opacity-25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, transparent, color-mix(in oklab, var(--background) 80%, transparent) 60%), linear-gradient(180deg, color-mix(in oklab, var(--background) 40%, transparent), var(--background) 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative w-full max-w-[480px] text-center"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-full border border-border bg-surface/60 backdrop-blur">
          <Sparkles size={22} strokeWidth={1.6} aria-hidden />
        </span>

        <h1 className="mt-6 font-display text-[30px] leading-tight tracking-tight sm:text-[36px]">
          This part isn't in your Bloom
        </h1>
        <p className="mx-auto mt-3 max-w-[40ch] text-[14.5px] leading-relaxed text-muted-foreground">
          You told us cycle tracking wasn't for you, so Bloom keeps it out of the
          way — phases, predictions and the daily cycle log all live behind this
          page.
        </p>
        <p className="mx-auto mt-2 max-w-[40ch] text-[13.5px] leading-relaxed text-muted-foreground/80">
          Changed your mind? Turn it on and everything appears. You can switch it
          back off in settings whenever you like.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="bsheet-primary"
            onClick={() => {
              sound("celebrate");
              setKind("cycle");
              /* No navigation needed — the route re-renders into the real page. */
            }}
          >
            <Sparkles size={16} aria-hidden />
            Turn on cycle tracking
          </button>
          <button
            type="button"
            className="bsheet-ghost"
            onClick={() => {
              sound("navigate");
              void navigate({ to: "/" });
            }}
          >
            <ArrowLeft size={15} aria-hidden />
            Back to Bloom
          </button>
        </div>
      </motion.div>
    </div>
  );
}
