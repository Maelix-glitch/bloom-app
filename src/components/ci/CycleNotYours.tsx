/**
 * What /cycle shows to someone who said the cycle isn't part of their Bloom.
 *
 * Deliberately *not* a permission wall. They aren't blocked, they opted out —
 * usually during setup, possibly by tapping the wrong card, and quite possibly
 * they've arrived here from a bookmark or a shared link and simply changed
 * their mind. So this page:
 *
 *   · doesn't scold, explain a policy, or use the word "access";
 *   · says what lives here in one line, and why it's hidden in another;
 *   · turns it on in one tap, and lands them straight in it;
 *   · offers a way back for anyone who arrived by accident.
 *
 * It used to carry a blurred flower photograph behind the copy and three
 * paragraphs. A stock photo says nothing about this person, and at this point
 * in the app they want a switch, not an essay — so the ground is now a plain
 * deep field and the copy is two lines.
 */

import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Sparkles } from "lucide-react";

import { useOnboarding } from "@/hooks/useOnboarding";
import { useSound } from "@/hooks/useSound";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function CycleNotYours() {
  const { setKind } = useOnboarding();
  const { sound } = useSound();
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[80dvh] items-center justify-center overflow-hidden px-5 py-16">
      {/*
        One quiet field instead of a photograph: a faint lift at the top so the
        panel separates from the page, and nothing else. The accent stays a
        whisper because this screen is a decision, not a moment.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 55% at 50% 0%, color-mix(in oklab, var(--foreground) 5%, transparent), transparent 65%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative w-full max-w-[420px] text-center"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-surface/60">
          <Sparkles size={20} strokeWidth={1.6} aria-hidden />
        </span>

        <h1 className="mt-5 font-display text-[28px] leading-tight tracking-tight sm:text-[32px]">
          This part isn't in your Bloom
        </h1>
        <p className="mx-auto mt-3 max-w-[34ch] text-[14px] leading-relaxed text-muted-foreground">
          Phases, predictions and the cycle log stay hidden because you told us
          the cycle isn't yours to track.
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
            Turn it on
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

        <p className="mt-5 text-[12.5px] text-muted-foreground/70">
          Switch it back off any time in Settings.
        </p>
      </motion.div>
    </div>
  );
}
