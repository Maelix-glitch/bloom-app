import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import type { Starter } from "@/lib/coach/ui-helpers";
import { CoachGlyph } from "./bloom-mark";

/**
 * The considered first conversation. Editorial rather than chatty: a quiet
 * claim about what Bloom is, then starters that each send a real prompt.
 * When the record has data the starters name the topics it actually holds;
 * when it doesn't, they invite the honest "here's what I can do" read.
 *
 * Personalised from minute zero: when onboarding recorded a name (and it
 * always knows the hour), the welcome opens with the person — the same
 * greeting shape the Today hero uses — and, when a cycle is tracked, the
 * phase line says why today might feel the way it does. Nothing here invents:
 * every optional line is passed in by the page, which reads it from the
 * person's own answers.
 */
export function EmptyWelcome({
  starters,
  thinking,
  onStart,
  greeting,
  phaseLine,
}: {
  starters: Starter[];
  thinking: boolean;
  onStart: (starter: Starter) => void;
  /** "Good evening, Maya." — computed by the page from onboarding + clock. */
  greeting?: string | null | undefined;
  /** One hedged science line about the current cycle phase, when tracked. */
  phaseLine?: string | null | undefined;
}) {
  return (
    <div className="coach-welcome" aria-hidden={thinking}>
      <motion.div
        className="coach-welcome-inner"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="coach-welcome-mark">
          <CoachGlyph size={40} active={thinking} />
        </div>
        <p className="coach-welcome-kicker">Bloom Coach</p>
        <h1 className="coach-welcome-title">
          A second mind
          <br />
          for your day.
        </h1>
        {greeting ? (
          <motion.p
            className="coach-welcome-greeting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            {greeting}
          </motion.p>
        ) : null}
        <p className="coach-welcome-copy">
          Ask, reflect, plan, or simply talk. I&rsquo;ll read what you&rsquo;ve actually logged when
          it helps — and say so plainly when there&rsquo;s nothing to go on.
        </p>
        {phaseLine ? <p className="coach-welcome-phase">{phaseLine}</p> : null}
        <div className="coach-welcome-starters" aria-label="Ways to begin">
          {starters.map((starter, index) => (
            <motion.button
              key={starter.text}
              type="button"
              className="coach-starter"
              disabled={thinking}
              onClick={() => onStart(starter)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="coach-starter-text">{starter.text}</span>
              <ArrowUpRight className="coach-starter-arrow" aria-hidden="true" />
            </motion.button>
          ))}
        </div>
        <p className="coach-welcome-note">
          Bloom works from the context you keep — raw tracker history never appears here.
        </p>
      </motion.div>
    </div>
  );
}
