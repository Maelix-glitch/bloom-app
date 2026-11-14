/**
 * MoodCard — Today's check-in card, rebuilt to the prototype's MoodCard.
 *
 * Bloom's mood model is not the prototype's five invented moods: it is
 * six real faces (Happy, Calm, Neutral, Sad, Anxious, Angry — the Mood
 * page's PageMood set), each a real quick check-in with its own preset
 * score/energy/stress and emotion tag, saved through the same path the
 * Mood page uses (`entryFromFace` + the mood record's save).
 *
 * The prototype's five tones (the --mood-tone-* tokens in styles.css)
 * are mapped across the six faces by each face's real preset mood
 * score, warmest for the highest score: Happy 8.5 → radiant, Calm 7.5
 * → good, Neutral 6 → steady, Anxious 4.5 → flat, Sad 3.5 → low,
 * Angry 3 → low (five tones, six faces: the two lowest-scoring faces
 * share the lowest tone). The tone drives the selected tile's border
 * and glow; the face itself stays Bloom's own MoodBlob, in its own
 * colours, and the selected label brightens.
 *
 * Selected = the face of today's entry (`faceForEntry`, the Mood page's
 * own rule), so a check-in made in the Composer or on the Mood page
 * lights the same tile here. Tapping a tile logs — or re-logs — today
 * through the caller's handler; the full Composer stays one tap away
 * for notes, emotions and detail.
 */

import { MOOD_LABELS, MoodBlob } from "@/components/mood/page/MoodBlob";
import { PAGE_MOODS, faceForEntry, type PageMood } from "@/lib/mood/page";
import type { MoodEntry } from "@/lib/mood/types";
import { cn } from "@/lib/utils";

/** The prototype's mood tones, mapped onto Bloom's faces (see header). */
export const MOOD_TONES: Record<PageMood, string> = {
  happy: "var(--mood-tone-radiant)",
  calm: "var(--mood-tone-good)",
  neutral: "var(--mood-tone-steady)",
  anxious: "var(--mood-tone-flat)",
  sad: "var(--mood-tone-low)",
  angry: "var(--mood-tone-low)",
};

export function MoodCard({
  entry,
  onPick,
  onOpenComposer,
}: {
  /** Today's mood entry, or null while nothing is logged today. */
  entry: MoodEntry | null;
  /** One-tap quick log of a face (the Mood page's own quick-log path). */
  onPick: (face: PageMood) => void;
  /** The full check-in — notes, emotion words, detail. */
  onOpenComposer: () => void;
}) {
  const selected: PageMood | null = entry ? faceForEntry(entry) : null;

  return (
    <section
      className="home-panel home-mood-card home-rise flex h-full flex-col p-5 sm:p-7"
      style={{ animationDelay: "150ms" }}
      aria-labelledby="home-mood-title"
      data-testid="home-mood-card"
    >
      <div>
        <p className="home-eyebrow">Check-in</p>
        <h2 id="home-mood-title" className="home-band-title mt-1">
          {selected ? `Feeling ${MOOD_LABELS[selected].toLowerCase()}.` : "How does today feel?"}
        </h2>
      </div>
      <p className="mt-3 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        {selected
          ? "Logged — thank you. Tap a face to change it, any time today."
          : "One tap. It takes five seconds, and it is what your week is read from."}
      </p>

      <div className="mt-auto grid grid-cols-6 gap-1.5 pt-6 sm:gap-2">
        {PAGE_MOODS.map((face) => {
          const tone = MOOD_TONES[face];
          const isSelected = selected === face;
          return (
            <button
              key={face}
              type="button"
              onClick={() => onPick(face)}
              aria-pressed={isSelected}
              data-testid={`home-mood-face-${face}`}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-2xl border px-1 py-3.5 transition-all duration-[var(--motion-standard)] hover:-translate-y-1 sm:py-4",
                isSelected
                  ? "bg-white/[0.07]"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]",
              )}
              style={
                isSelected
                  ? {
                      borderColor: `color-mix(in oklab, ${tone} 53%, transparent)`,
                      boxShadow: `0 12px 32px -14px ${tone}`,
                    }
                  : undefined
              }
            >
              <span
                className={cn(
                  "transition-transform duration-[var(--motion-standard)]",
                  isSelected && "scale-110",
                )}
              >
                <MoodBlob mood={face} size={30} active={isSelected} />
              </span>
              <span
                className={cn(
                  "text-[length:var(--text-micro)] transition-colors",
                  isSelected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {MOOD_LABELS[face]}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onOpenComposer}
        className="mt-4 self-start text-[length:var(--text-meta)] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        data-testid="home-mood-more"
      >
        {selected ? "Add words or detail" : "More than a face? Add words"}
      </button>
    </section>
  );
}
