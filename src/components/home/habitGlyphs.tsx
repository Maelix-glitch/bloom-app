import {
  Apple,
  Bike,
  BookOpen,
  Brain,
  Coffee,
  CupSoda,
  Droplets,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  Heart,
  Leaf,
  MoonStar,
  Music,
  NotebookPen,
  Palette,
  Pill,
  Salad,
  Sparkles,
  Star,
  Sun,
  Target,
  Timer,
  Waves,
  type LucideIcon,
} from "lucide-react";

/**
 * Bloom's own habit glyphs.
 *
 * Habits store an emoji as their icon (and users may pick their own). The
 * application's *defaults* used emoji as interface iconography, which read as
 * decorative rather than meaningful — a star for stress relief, a calendar for
 * water. This maps the emoji Bloom ships (and the obvious synonyms people pick
 * from the picker) onto one line-icon family, so the interface is consistent
 * while genuinely user-chosen emoji still render as themselves.
 *
 * Stroke width and optical size are applied where the glyph is rendered.
 */
const GLYPHS: Record<string, LucideIcon> = {
  // hydration
  "💧": Droplets,
  "🚰": Droplets,
  "🥤": CupSoda,
  "☕": Coffee,
  // mind / stress
  "🧠": Brain,
  "🧘": Waves,
  "🌊": Waves,
  "🌿": Leaf,
  "🍃": Leaf,
  "🌸": Flower2,
  // reading / study / journaling
  "📖": BookOpen,
  "📚": BookOpen,
  "📕": BookOpen,
  "📝": NotebookPen,
  "✍️": NotebookPen,
  "📓": NotebookPen,
  // movement
  "🏃": Dumbbell,
  "🏋️": Dumbbell,
  "💪": Dumbbell,
  "🚶": Footprints,
  "👟": Footprints,
  "🚴": Bike,
  // rest / light
  "🌙": MoonStar,
  "😴": MoonStar,
  "🌞": Sun,
  "☀️": Sun,
  // nutrition / health
  "🥗": Salad,
  "🍎": Apple,
  "💊": Pill,
  // practice / goals
  "🎯": Target,
  "⏱️": Timer,
  "🎵": Music,
  "🎨": Palette,
  "❤️": Heart,
  "🔥": Flame,
  "⭐": Star,
  "✨": Sparkles,
};

/** The line-icon for a habit emoji, or null when it is the user's own glyph. */
export function semanticHabitIcon(icon: string): LucideIcon | null {
  return GLYPHS[icon] ?? null;
}
