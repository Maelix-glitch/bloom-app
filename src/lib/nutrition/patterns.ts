/**
 * Nutrition — food-and-mood patterns (N-UI, the PatternLab).
 *
 * The comparisons are fixed and few, stated in advance rather than
 * mined: days that hit the protein pace, days with a real breakfast
 * protein, and days that reach the fibre reference — each set against
 * the days that did not, over the person's own mood check-ins. A
 * comparison is shown only when BOTH sides have at least two days
 * behind them; the counts travel with the numbers, and the confidence
 * word grows only with the total days compared. These are patterns in
 * one person's data — correlations on small numbers, never proof of
 * cause, and the surface says so in those words.
 *
 * Mood arrives as the day's mean check-in on Bloom's 1–10 scale (the
 * mood module's own aggregation), so a delta is in mood points on that
 * scale. Days without a mood check-in, or without any food logged,
 * take part in nothing.
 */

export interface PatternDayInput {
  day: string;
  /** The day's mean mood (1–10), or null when there was no check-in. */
  mood: number | null;
  /** Whether anything was logged that day. */
  hasFood: boolean;
  /** The day's protein total (grams). */
  proteinG: number;
  /** The day's fibre total, or null when no logged food reported it —
   *  such a day cannot stand on either side of the fibre comparison. */
  fibreG: number | null;
  /** Protein logged at breakfast (grams). */
  breakfastProteinG: number;
}

export interface MoodPattern {
  id: string;
  title: string;
  withLabel: string;
  withoutLabel: string;
  /** Mean mood on the "with" days (1 dp). */
  withAvg: number;
  /** Mean mood on the "without" days (1 dp). */
  withoutAvg: number;
  withN: number;
  withoutN: number;
  /** withAvg − withoutAvg, in mood points (1 dp). */
  delta: number;
  /** "emerging" once 14+ days stand behind the comparison, else
   *  "tentative" — the word grows only with the evidence. */
  confidence: "tentative" | "emerging";
}

const MIN_GROUP = 2;
const EMERGING_DAYS = 14;
const BREAKFAST_PROTEIN_G = 25;

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

interface Comparison {
  id: string;
  title: string;
  withLabel: string;
  withoutLabel: string;
  /** Which side a day stands on; null when the day cannot be judged. */
  side: (day: PatternDayInput) => boolean | null;
}

export function moodPatterns(
  days: readonly PatternDayInput[],
  guides: { proteinTargetG: number | null; fibreReferenceG: number },
): MoodPattern[] {
  const usable = days.filter((d) => d.mood !== null && d.hasFood);
  const comparisons: Comparison[] = [
    ...(guides.proteinTargetG !== null && guides.proteinTargetG > 0
      ? [
          {
            id: "protein-pace",
            title: "Protein pace",
            withLabel: "Days you hit your protein pace",
            withoutLabel: "Days you didn't",
            side: (d: PatternDayInput) => d.proteinG >= 0.9 * guides.proteinTargetG!,
          } as Comparison,
        ]
      : []),
    {
      id: "breakfast-protein",
      title: "Breakfast protein",
      withLabel: `Breakfasts with ${BREAKFAST_PROTEIN_G} g+ protein`,
      withoutLabel: "Lighter breakfasts",
      side: (d) => d.breakfastProteinG >= BREAKFAST_PROTEIN_G,
    },
    {
      id: "fibre",
      title: "Fibre",
      withLabel: "Days you reached the fibre guide",
      withoutLabel: "Days you fell short",
      side: (d) => (d.fibreG === null ? null : d.fibreG >= 0.9 * guides.fibreReferenceG),
    },
  ];

  const out: MoodPattern[] = [];
  for (const comparison of comparisons) {
    const withMoods: number[] = [];
    const withoutMoods: number[] = [];
    for (const day of usable) {
      const side = comparison.side(day);
      if (side === null) continue;
      (side ? withMoods : withoutMoods).push(day.mood!);
    }
    if (withMoods.length < MIN_GROUP || withoutMoods.length < MIN_GROUP) continue;
    const withAvg = round1(mean(withMoods));
    const withoutAvg = round1(mean(withoutMoods));
    const delta = round1(withAvg - withoutAvg);
    if (delta === 0) continue;
    out.push({
      id: comparison.id,
      title: comparison.title,
      withLabel: comparison.withLabel,
      withoutLabel: comparison.withoutLabel,
      withAvg,
      withoutAvg,
      withN: withMoods.length,
      withoutN: withoutMoods.length,
      delta,
      confidence:
        withMoods.length + withoutMoods.length >= EMERGING_DAYS ? "emerging" : "tentative",
    });
  }
  return out;
}
