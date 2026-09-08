/**
 * Reveal an answer the way it would be spoken, not as a wall.
 *
 * The coach computes its whole reply before the UI sees a single word — the
 * local responder is synchronous, and the edge function resolves in one shot.
 * Dumping four paragraphs into the thread the instant they arrive is what makes
 * the page feel abrupt: the "thinking" indicator vanishes and a block of text
 * replaces it with no transition between the two states.
 *
 * So the text is revealed progressively after the fact. This is not a fake
 * progress bar — the words really are arriving in order, at a readable pace,
 * and the reader can start at the top while the rest lands.
 *
 * Details that matter:
 *   · **Word boundaries, not characters.** Character-by-character typing makes
 *     the text jitter as it reflows and is genuinely harder to read.
 *   · **Time-based, not tick-based.** Driven by rAF against elapsed time, so
 *     the pace is identical on a 60Hz and a 144Hz screen, and a dropped frame
 *     catches up instead of slowing the whole reveal.
 *   · **Long answers speed up.** A fixed rate would make a four-paragraph reply
 *     take a quarter of a minute. The rate scales with length so any answer
 *     finishes in roughly the same span.
 *   · **Skippable and interruptible.** Any interaction finishes it instantly,
 *     and a new message abandons the old reveal.
 *   · **Reduced motion means no reveal at all** — the full text, immediately.
 */

import { useEffect, useRef, useState } from "react";

/** Target time for a whole answer, whatever its length. */
const TARGET_MS = 1400;
/** Never slower than this per word, or short replies crawl. */
const MAX_MS_PER_WORD = 55;
/** Never faster than this, or it's just a flash. */
const MIN_MS_PER_WORD = 12;

export interface Typewriter {
  /** The paragraphs revealed so far — same shape as the input. */
  text: string[];
  /** Still revealing. */
  running: boolean;
  /** Finish now. Safe to call at any time, including when already done. */
  skip: () => void;
}

/**
 * @param full     the finished paragraphs
 * @param enabled  false renders `full` immediately (history, reduced motion)
 */
export function useTypewriter(full: string[], enabled: boolean): Typewriter {
  const [count, setCount] = useState(() => (enabled ? 0 : Infinity));
  const frame = useRef<number | undefined>(undefined);

  /* One flat word list, plus the paragraph index each word belongs to, so the
     reveal can be sliced back into paragraphs without re-splitting each frame. */
  const words = useRef<{ word: string; para: number }[]>([]);
  const key = full.join("\u0000");

  useEffect(() => {
    const flat: { word: string; para: number }[] = [];
    full.forEach((p, para) => {
      for (const word of p.split(/(\s+)/)) {
        if (word !== "") flat.push({ word, para });
      }
    });
    words.current = flat;

    if (!enabled || flat.length === 0) {
      setCount(Infinity);
      return;
    }

    const perWord = Math.min(
      MAX_MS_PER_WORD,
      Math.max(MIN_MS_PER_WORD, TARGET_MS / flat.length),
    );
    const started = performance.now();
    setCount(0);

    const tick = () => {
      /* Elapsed-time driven: a dropped frame catches up rather than slowing
         the reveal, and the pace is refresh-rate independent. */
      const elapsed = performance.now() - started;
      const shown = Math.floor(elapsed / perWord);
      if (shown >= flat.length) {
        setCount(Infinity);
        return;
      }
      setCount(shown);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
    /* `key` stands in for `full` — a new array with identical content must not
       restart a reveal that is already running. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const skip = () => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    setCount(Infinity);
  };

  if (count === Infinity) return { text: full, running: false, skip };

  /* Rebuild the paragraphs from the words revealed so far. Trailing empties
     are dropped so a paragraph doesn't appear before it has any content. */
  const out: string[] = full.map(() => "");
  for (let i = 0; i < Math.min(count, words.current.length); i += 1) {
    const w = words.current[i]!;
    out[w.para] += w.word;
  }
  while (out.length > 0 && out[out.length - 1]!.trim() === "") out.pop();

  return { text: out, running: true, skip };
}
