import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import type { Starter } from "@/lib/coach/ui-helpers";
import { CoachGlyph } from "./bloom-mark";

/**
 * The considered first conversation. Editorial rather than chatty: a quiet
 * claim about what Bloom is, then starters that each send a real prompt.
 * When the record has data the starters name the topics it actually holds;
 * when it doesn't, they invite the honest "here's what I can do" read.
 */
export function EmptyWelcome({
  starters,
  thinking,
  onStart,
}: {
  starters: Starter[];
  thinking: boolean;
  onStart: (starter: Starter) => void;
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
        <p className="coach-welcome-copy">
          Ask, reflect, plan, or simply talk. I&rsquo;ll read what you&rsquo;ve actually logged when
          it helps — and say so plainly when there&rsquo;s nothing to go on.
        </p>
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
