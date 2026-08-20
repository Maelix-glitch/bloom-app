export type EmotionKey =
  | "happy"
  | "calm"
  | "excited"
  | "focused"
  | "motivated"
  | "confident"
  | "grateful"
  | "neutral"
  | "tired"
  | "anxious"
  | "sad"
  | "angry"
  | "frustrated"
  | "overwhelmed"
  | "lonely";

export type Valence = "positive" | "neutral" | "negative";

export interface EmotionMeta {
  key: EmotionKey;
  label: string;
  valence: Valence;
  /** Accent token used for visualisation. */
  accent: "violet" | "sky" | "amber" | "sage" | "rose";
}

export const EMOTIONS: EmotionMeta[] = [
  { key: "happy", label: "Happy", valence: "positive", accent: "amber" },
  { key: "calm", label: "Calm", valence: "positive", accent: "sage" },
  { key: "excited", label: "Excited", valence: "positive", accent: "rose" },
  { key: "focused", label: "Focused", valence: "positive", accent: "sky" },
  { key: "motivated", label: "Motivated", valence: "positive", accent: "violet" },
  { key: "confident", label: "Confident", valence: "positive", accent: "amber" },
  { key: "grateful", label: "Grateful", valence: "positive", accent: "sage" },
  { key: "neutral", label: "Neutral", valence: "neutral", accent: "sky" },
  { key: "tired", label: "Tired", valence: "negative", accent: "violet" },
  { key: "anxious", label: "Anxious", valence: "negative", accent: "rose" },
  { key: "sad", label: "Sad", valence: "negative", accent: "sky" },
  { key: "angry", label: "Angry", valence: "negative", accent: "rose" },
  { key: "frustrated", label: "Frustrated", valence: "negative", accent: "amber" },
  { key: "overwhelmed", label: "Overwhelmed", valence: "negative", accent: "violet" },
  { key: "lonely", label: "Lonely", valence: "negative", accent: "sky" },
];

export const EMOTION_MAP: Record<EmotionKey, EmotionMeta> = EMOTIONS.reduce(
  (acc, e) => {
    acc[e.key] = e;
    return acc;
  },
  {} as Record<EmotionKey, EmotionMeta>,
);

export type Weather = "clear" | "cloudy" | "rain" | "storm" | "snow" | "fog";

/** Raw, user-authored record. Never mutated by the analytics layer. */
export interface MoodEntry {
  id: string;
  /** ISO timestamp */
  timestamp: string;
  mood: number; // 1-10
  energy: number; // 1-10
  stress: number; // 1-10
  emotions: EmotionKey[];
  tags: string[];
  note?: string;
  /** Contextual signals — all optional, correlations respect missing values. */
  sleep?: number; // hours
  sleepQuality?: number; // 1-10
  exercise?: number; // minutes
  steps?: number;
  productivity?: number; // 1-10
  study?: number; // minutes
  screenTime?: number; // hours
  social?: number; // 1-10
  weather?: Weather;
  workload?: number; // 1-10
}

export type RangeKey = "today" | "7d" | "30d" | "90d" | "1y" | "custom";

export interface DateRange {
  key: RangeKey;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  days: number;
  label: string;
}

/** One aggregated calendar day. */
export interface DayAggregate {
  date: string; // YYYY-MM-DD
  mood: number;
  energy: number;
  stress: number;
  entries: MoodEntry[];
  emotions: EmotionKey[];
  sleep?: number;
  exercise?: number;
  screenTime?: number;
  productivity?: number;
  steps?: number;
  social?: number;
  study?: number;
}

export type Evidence = "insufficient" | "low" | "moderate" | "strong";

export interface Correlation {
  key: string;
  label: string;
  unit: string;
  r: number;
  n: number;
  evidence: Evidence;
  direction: "positive" | "negative";
  statement: string;
}

export interface DetectedPattern {
  id: string;
  title: string;
  statement: string;
  n: number;
  evidence: Evidence;
  metrics: { label: string; value: string }[];
  delta?: string;
  accent: "violet" | "sky" | "amber" | "sage" | "rose";
}

export interface Anomaly {
  date: string;
  mood: number;
  baseline: number;
  deviation: number;
  kind: "high" | "low";
  context: { label: string; value: string }[];
}

export interface Insight {
  id: string;
  text: string;
  kind: "trend" | "consistency" | "emotion" | "correlation" | "timing" | "stability";
}
