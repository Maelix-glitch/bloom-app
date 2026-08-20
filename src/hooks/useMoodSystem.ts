import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { moodStorage } from "@/lib/mood/storage";
import { generateDemoEntries } from "@/lib/mood/seed";
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
    return { key, start: custom.start, end: custom.end, days, label: `${custom.start} → ${custom.end}` };
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
  return { key, start, end, days, label: labels[key] ?? "Last 30 days" };
}

export function useMoodSystem() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [custom, setCustom] = useState<{ start: string; end: string }>({
    start: dayjs().subtract(45, "day").format("YYYY-MM-DD"),
    end: dayjs().format("YYYY-MM-DD"),
  });
  const [emotionFilter, setEmotionFilter] = useState<EmotionKey | null>(null);

  useEffect(() => {
    let alive = true;
    moodStorage.all().then((rows) => {
      if (!alive) return;
      setEntries(rows);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const range = useMemo(() => buildRange(rangeKey, custom), [rangeKey, custom]);

  const saveEntry = useCallback(async (entry: MoodEntry) => {
    await moodStorage.put(entry);
    setEntries((prev) => [...prev.filter((e) => e.id !== entry.id), entry].sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    await moodStorage.remove(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const loadDemo = useCallback(async () => {
    const demo = generateDemoEntries();
    await moodStorage.putMany(demo);
    setEntries((prev) => [...prev, ...demo].sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
  }, []);

  const resetAll = useCallback(async () => {
    await moodStorage.clear();
    setEntries([]);
  }, []);

  /** Derived analytics — recomputed only when data, range, or filter change. */
  const analytics = useMemo(() => {
    const inRange = (list: MoodEntry[], start: string, end: string) =>
      list.filter((e) => {
        const k = e.timestamp.slice(0, 10);
        return k >= start && k <= end;
      });

    const filtered = emotionFilter ? entries.filter((e) => e.emotions.includes(emotionFilter)) : entries;

    const periodEntries = inRange(filtered, range.start, range.end);
    const prevStart = dayjs(range.start).subtract(range.days, "day").format("YYYY-MM-DD");
    const prevEnd = dayjs(range.start).subtract(1, "day").format("YYYY-MM-DD");
    const prevEntries = inRange(filtered, prevStart, prevEnd);

    const days = aggregateDays(periodEntries);
    const prevDays = aggregateDays(prevEntries);
    const allDays = aggregateDays(filtered);

    const avg = calculateAverageMood(periodEntries);
    const prevAvg = calculateAverageMood(prevEntries);
    const changePct = prevAvg ? round(((avg - prevAvg) / prevAvg) * 100, 1) : null;

    const trend = calculateMoodTrend(days);
    const volatility = calculateVolatility(days);
    const emotions = calculateEmotionDistribution(periodEntries);
    const correlations = calculateCorrelations(allDays);
    const heatmap = buildHeatmap(periodEntries);
    const distribution = calculateDistribution(days, prevDays);
    const patterns = detectPatterns(allDays);
    const anomalies = detectAnomalies(allDays);
    const insights = generateInsights(days, prevDays, periodEntries, range.days);
    const tier = depthTier(entries.length);

    const bestDay = days.length ? [...days].sort((a, b) => b.mood - a.mood)[0]! : null;
    const worstDay = days.length ? [...days].sort((a, b) => a.mood - b.mood)[0]! : null;
    const consistency = Math.round((days.length / Math.max(1, range.days)) * 100);

    return {
      periodEntries,
      prevEntries,
      days,
      prevDays,
      allDays,
      avg,
      prevAvg,
      changePct,
      trend,
      volatility,
      emotions,
      correlations,
      heatmap,
      distribution,
      patterns,
      anomalies,
      insights,
      tier,
      bestDay,
      worstDay,
      consistency,
      streak: currentStreak(allDays),
      avgEnergy: periodEntries.length ? round(mean(periodEntries.map((e) => e.energy)), 1) : 0,
      avgStress: periodEntries.length ? round(mean(periodEntries.map((e) => e.stress)), 1) : 0,
      prevLabel: `${prevStart} → ${prevEnd}`,
    };
  }, [entries, range, emotionFilter]);

  return {
    loading,
    entries,
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
    loadDemo,
    resetAll,
  };
}

export type MoodSystem = ReturnType<typeof useMoodSystem>;
