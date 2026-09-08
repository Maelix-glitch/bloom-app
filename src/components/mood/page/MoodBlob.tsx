/**
 * MoodBlob — the six mood faces from the harmonious-dashboard model: one
 * organic blob shape, one stroke language, only the expression changes.
 * Ported as-is; colours read the `.mood-page` tokens in src/styles.css.
 */

export type MoodKey = "happy" | "calm" | "neutral" | "sad" | "anxious" | "angry";

const BLOB =
  "M50 4c14 0 26 5.5 34 15.5 8 10 12 21 10 33.5-2 12.5-9 22.5-20 29.5-11 7-23 9.5-35 7C27 87 16 79 10 67 4 55 4.5 41 11.5 28.5 18.5 16 32 4 50 4Z";

const FILL: Record<MoodKey, string> = {
  happy: "var(--mp-happy)",
  calm: "var(--mp-calm)",
  neutral: "var(--mp-neutral)",
  sad: "var(--mp-sad)",
  anxious: "var(--mp-anxious)",
  angry: "var(--mp-angry)",
};

export const MOOD_LABELS: Record<MoodKey, string> = {
  happy: "Happy",
  calm: "Calm",
  neutral: "Neutral",
  sad: "Sad",
  anxious: "Anxious",
  angry: "Angry",
};

/** One shape, one stroke language — only the face expression changes. */
function Face({ mood }: { mood: MoodKey }) {
  const stroke = "oklch(0.19 0.02 150)";
  const common = {
    stroke,
    strokeWidth: 4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
    opacity: 0.85,
  };

  const eyesOpen = (
    <>
      <circle cx="38" cy="45" r="3.4" fill={stroke} opacity={0.85} />
      <circle cx="62" cy="45" r="3.4" fill={stroke} opacity={0.85} />
    </>
  );

  const eyesClosed = (
    <>
      <path d="M32 45c3 4 9 4 12 0" {...common} />
      <path d="M56 45c3 4 9 4 12 0" {...common} />
    </>
  );

  const eyesAngry = (
    <>
      <path d="M32 40l11 5" {...common} />
      <path d="M68 40l-11 5" {...common} />
      <circle cx="40" cy="50" r="3" fill={stroke} opacity={0.85} />
      <circle cx="60" cy="50" r="3" fill={stroke} opacity={0.85} />
    </>
  );

  switch (mood) {
    case "happy":
      return (
        <>
          {eyesOpen}
          <path d="M38 60c4 6 20 6 24 0" {...common} />
        </>
      );
    case "calm":
      return (
        <>
          {eyesClosed}
          <path d="M40 60c3.5 5 17 5 20 0" {...common} />
        </>
      );
    case "neutral":
      return (
        <>
          {eyesOpen}
          <path d="M39 60h22" {...common} />
        </>
      );
    case "sad":
      return (
        <>
          {eyesOpen}
          <path d="M38 64c4-6 20-6 24 0" {...common} />
        </>
      );
    case "anxious":
      return (
        <>
          {eyesOpen}
          <path d="M37 61c3-4 5 4 8 0s5 4 8 0 5 4 8 0" {...common} />
        </>
      );
    case "angry":
      return (
        <>
          {eyesAngry}
          <path d="M38 65c4-6 20-6 24 0" {...common} />
        </>
      );
  }
}

export function MoodBlob({
  mood,
  size = 88,
  active = false,
}: {
  mood: MoodKey;
  size?: number;
  active?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="shrink-0 transition-transform duration-500 ease-out group-hover:-translate-y-1"
      style={{ filter: active ? "drop-shadow(0 0 22px oklch(0.86 0.1 85 / 0.45))" : undefined }}
      aria-hidden="true"
    >
      <path d={BLOB} fill={FILL[mood]} opacity={active ? 1 : 0.42} />
      <path d={BLOB} fill="none" stroke="oklch(1 0 0 / 0.14)" strokeWidth={1.5} />
      <g opacity={active ? 1 : 0.72}>
        <Face mood={mood} />
      </g>
    </svg>
  );
}
