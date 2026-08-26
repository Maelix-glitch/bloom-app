import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";

import { supabase } from "@/lib/supabase";
import { moodStorage } from "@/lib/mood/storage";
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
import type {
  DateRange,
  EmotionKey,
  MoodEntry,
  RangeKey,
} from "@/lib/mood/types";

const RANGE_DAYS: Record<Exclude<RangeKey, "custom">, number> = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

export function buildRange(
  key: RangeKey,
  custom?: { start: string; end: string },
): DateRange {
  if (key === "custom" && custom) {
    const days = Math.max(
      1,
      dayjs(custom.end).diff(dayjs(custom.start), "day") + 1,
    );

    return {
      key,
      start: custom.start,
      end: custom.end,
      days,
      label: `${custom.start} → ${custom.end}`,
    };
  }

  const days =
    RANGE_DAYS[
      (key === "custom" ? "30d" : key) as Exclude<RangeKey, "custom">
    ];

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
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");

  const [custom, setCustom] = useState({
    start: dayjs().subtract(45, "day").format("YYYY-MM-DD"),
    end: dayjs().format("YYYY-MM-DD"),
  });

  const [emotionFilter, setEmotionFilter] =
    useState<EmotionKey | null>(null);

  const loadEntries = useCallback(async (id: string) => {
    setLoading(true);
    setAuthError(null);

    try {
      const rows = await moodStorage.all(id);
      setEntries(rows);
    } catch (error) {
      console.error("Could not load mood entries:", error);

      setAuthError(
        error instanceof Error
          ? error.message
          : "Could not load your Mood record.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function start() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!alive) return;

      if (!session?.user) {
        setProfileId(null);
        setEntries([]);
        setLoading(false);

        setAuthError(
          "Please sign in to Bloom before opening Mood Intelligence.",
        );

        return;
      }

      setProfileId(session.user.id);
      await loadEntries(session.user.id);
    }

    void start();

    const authListener = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          setProfileId(null);
          setEntries([]);
          setLoading(false);

          setAuthError(
            "Please sign in to Bloom before opening Mood Intelligence.",
          );

          return;
        }

        setProfileId(session.user.id);
        void loadEntries(session.user.id);
      },
    );

    return () => {
      alive = false;
      authListener.data.subscription.unsubscribe();
    };
  }, [loadEntries]);

  const range = useMemo(
    () => buildRange(rangeKey, custom),
    [rangeKey, custom],
  );

  const saveEntry = useCallback(
    async (entry: MoodEntry) => {
      if (!profileId) {
        setAuthError("Please sign in before saving a Mood entry.");
        return;
      }

      try {
        const saved = await moodStorage.put(profileId, entry);

        setEntries((previous) =>
          [...previous.filter((item) => item.id !== saved.id), saved].sort(
            (a, b) => a.timestamp.localeCompare(b.timestamp),
          ),
        );
      } catch (error) {
        console.error("Could not save mood entry:", error);

        setAuthError(
          error instanceof Error
            ? error.message
            : "Could not save your Mood entry.",
        );
      }
    },
    [profileId],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (!profileId) return;

      try {
        await moodStorage.remove(profileId, id);

        setEntries((previous) =>
          previous.filter((entry) => entry.id !== id),
        );
      } catch (error) {
        console.error("Could not delete mood entry:", error);

        setAuthError(
          error instanceof Error
            ? error.message
            : "Could not delete your Mood entry.",
        );
      }
    },
    [profileId],
  );

  const resetAll = useCallback(async () => {
    if (!profileId) return;

    try {
      await Promise.all(
        entries.map((entry) => moodStorage.remove(profileId, entry.id)),
      );

      setEntries([]);
    } catch (error) {
      console.error("Could not reset mood entries:", error);

      setAuthError(
        error instanceof Error
          ? error.message
          : "Could not reset your Mood record.",
      );
    }
  }, [entries, profileId]);

  const analytics = useMemo(() => {
    const inRange = (
      list: MoodEntry[],
      start: string,
      end: string,
    ) =>
      list.filter((entry) => {
        const date = entry.timestamp.slice(0, 10);
        return date >= start && date <= end;
      });

    const filtered = emotionFilter
      ? entries.filter((entry) =>
          entry.emotions.includes(emotionFilter),
        )
      : entries;

    const periodEntries = inRange(filtered, range.start, range.end);

    const previousStart = dayjs(range.start)
      .subtract(range.days, "day")
      .format("YYYY-MM-DD");

    const previousEnd = dayjs(range.start)
      .subtract(1, "day")
      .format("YYYY-MM-DD");

    const previousEntries = inRange(
      filtered,
      previousStart,
      previousEnd,
    );

    const days = aggregateDays(periodEntries);
    const previousDays = aggregateDays(previousEntries);
    const allDays = aggregateDays(filtered);

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
      correlations: calculateCorrelations(allDays),
      heatmap: buildHeatmap(periodEntries),
      distribution: calculateDistribution(days, previousDays),
      patterns: detectPatterns(allDays),
      anomalies: detectAnomalies(allDays),

      insights: generateInsights(
        days,
        previousDays,
        periodEntries,
        range.days,
      ),

      tier: depthTier(entries.length),

      bestDay: days.length
        ? [...days].sort((a, b) => b.mood - a.mood)[0]
        : null,

      worstDay: days.length
        ? [...days].sort((a, b) => a.mood - b.mood)[0]
        : null,

      consistency: Math.round(
        (days.length / Math.max(1, range.days)) * 100,
      ),

      streak: currentStreak(allDays),

      avgEnergy: periodEntries.length
        ? round(mean(periodEntries.map((entry) => entry.energy)), 1)
        : 0,

      avgStress: periodEntries.length
        ? round(mean(periodEntries.map((entry) => entry.stress)), 1)
        : 0,

      prevLabel: `${previousStart} → ${previousEnd}`,
    };
  }, [entries, range, emotionFilter]);

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