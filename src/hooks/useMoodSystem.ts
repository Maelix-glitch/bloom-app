import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import dayjs from "dayjs";

import { moodRecord } from "@/lib/mood/record";
import {
  aggregateDays,
  buildHeatmap,
  calculateAverageMood,
  calculateCorrelations,
  calculateDistribution,
  calculateEmotionDistribution,
  calculateMoodTrend,
  calculateVolatility,
  currentStreak,
  dayKey,
  depthTier,
  detectAnomalies,
  detectPatterns,
  generateInsights,
  mean,
  round,
} from "@/lib/mood/analytics";
import type { DateRange, EmotionKey, MoodEntry, RangeKey } from "@/lib/mood/types";

const RANGE_DAYS: Record<Exclude<RangeKey, "custom">, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

export function buildRange(key: RangeKey, custom?: { start: string; end: string }): DateRange {
  if (key === "custom" && custom) {
    const days = Math.max(1, dayjs(custom.end).diff(dayjs(custom.start), "day") + 1);

    return {
      key,
      start: custom.start,
      end: custom.end,
      days,
      label: `${custom.start} → ${custom.end}`,
    };
  }

  const days = RANGE_DAYS[(key === "custom" ? "30d" : key) as Exclude<RangeKey, "custom">];

  const end = dayjs().format("YYYY-MM-DD");
  const start = dayjs()
    .subtract(days - 1, "day")
    .format("YYYY-MM-DD");

  const labels: Record<string, string> = {
    today: "Today",
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "1y": "Last 12 months",
  };

  return {
    key,
    start,
    end,
    days,
    label: labels[key] ?? "Last 30 days",
  };
}

export function useMoodSystem() {
  // One shared, cached copy of the record for every screen (see lib/mood/record).
  const record = useSyncExternalStore(
    moodRecord.subscribe,
    moodRecord.getSnapshot,
    moodRecord.getServerSnapshot,
  );
  const { entries, loading, profileId, authError } = record;

  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");

  const [custom, setCustom] = useState({
    start: dayjs().subtract(45, "day").format("YYYY-MM-DD"),
    end: dayjs().format("YYYY-MM-DD"),
  });

  const [emotionFilter, setEmotionFilter] = useState<EmotionKey | null>(null);

  const range = useMemo(() => buildRange(rangeKey, custom), [rangeKey, custom]);

  const saveEntry = useCallback((entry: MoodEntry) => moodRecord.save(entry), []);
  const removeEntry = useCallback((id: string) => moodRecord.remove(id), []);
  const resetAll = useCallback(() => moodRecord.reset(), []);

  // Work that only depends on the record (not the range) is memoised on its
  // own, so switching 7D -> 30D -> 90D never re-runs the all-time passes.
  const filtered = useMemo(
    () =>
      emotionFilter ? entries.filter((entry) => entry.emotions.includes(emotionFilter)) : entries,
    [entries, emotionFilter],
  );

  const allTime = useMemo(() => {
    const allDays = aggregateDays(filtered);
    return {
      allDays,
      correlations: calculateCorrelations(allDays),
      patterns: detectPatterns(allDays),
      anomalies: detectAnomalies(allDays),
      streak: currentStreak(allDays),
    };
  }, [filtered]);

  const analytics = useMemo(() => {
    const inRange = (list: MoodEntry[], start: string, end: string) =>
      list.filter((entry) => {
        const date = dayKey(entry.timestamp);
        return date >= start && date <= end;
      });

    const periodEntries = inRange(filtered, range.start, range.end);

    const previousStart = dayjs(range.start).subtract(range.days, "day").format("YYYY-MM-DD");

    const previousEnd = dayjs(range.start).subtract(1, "day").format("YYYY-MM-DD");

    const previousEntries = inRange(filtered, previousStart, previousEnd);

    const days = aggregateDays(periodEntries);
    const previousDays = aggregateDays(previousEntries);
    const { allDays, correlations, patterns, anomalies, streak } = allTime;

    const average = calculateAverageMood(periodEntries);
    const previousAverage = calculateAverageMood(previousEntries);

    const changePct = previousAverage
      ? round(((average - previousAverage) / previousAverage) * 100, 1)
      : null;

    return {
      periodEntries,
      previousEntries,
      days,
      previousDays,
      allDays,

      avg: average,
      prevAvg: previousAverage,
      changePct,

      trend: calculateMoodTrend(days),
      volatility: calculateVolatility(days),

      emotions: calculateEmotionDistribution(periodEntries),
      correlations,
      heatmap: buildHeatmap(periodEntries),
      distribution: calculateDistribution(days, previousDays),
      patterns,
      anomalies,

      insights: generateInsights(days, previousDays, periodEntries, range.days),

      tier: depthTier(entries.length),

      bestDay: days.length ? [...days].sort((a, b) => b.mood - a.mood)[0] : null,

      worstDay: days.length ? [...days].sort((a, b) => a.mood - b.mood)[0] : null,

      consistency: Math.round((days.length / Math.max(1, range.days)) * 100),

      streak,

      avgEnergy: periodEntries.length
        ? round(mean(periodEntries.map((entry) => entry.energy)), 1)
        : 0,

      avgStress: periodEntries.length
        ? round(mean(periodEntries.map((entry) => entry.stress)), 1)
        : 0,

      prevLabel: `${previousStart} → ${previousEnd}`,
    };
  }, [entries.length, filtered, allTime, range]);

  return {
    loading,
    entries,
    profileId,
    authError,

    range,
    rangeKey,
    setRangeKey,

    custom,
    setCustom,

    emotionFilter,
    setEmotionFilter,

    analytics,

    saveEntry,
    removeEntry,
    resetAll,
  };
}

export type MoodSystem = ReturnType<typeof useMoodSystem>;
