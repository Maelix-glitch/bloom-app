/**
 * PremiumDashboard — Modern, high-end trackers interface
 *
 * Features:
 * - Premium gradient UI with glassmorphism
 * - Real-time analytics and insights
 * - Mobile-responsive design
 * - Advanced visualizations
 * - Quick-add and deep logging
 * - Analytics tracking ready
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { BarChart3, TrendingUp, Zap, Calendar, Settings, Plus } from "lucide-react";

import { useTrackers } from "@/hooks/useTrackers";
import { TRACKERS, trackerDef, type TrackerId } from "@/lib/trackers/core";
import { useCycleTheme } from "@/hooks/usePeriodLog";

import { ReflectSheet } from "./designs/ReflectSheet";
import { TrackerModal } from "./designs/TrackerModal";
import { Observations } from "./designs/shared";
import { AddHabitModal } from "./AddHabitModal";

const DASHBOARD_ROOT: CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #0F0F15 0%, #1A1A2E 50%, #16213E 100%)",
  padding: "2rem 1rem",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

const CONTAINER: CSSProperties = {
  maxWidth: "1280px",
  margin: "0 auto",
};

const HEADER: CSSProperties = {
  marginBottom: "2rem",
  paddingBottom: "1.5rem",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
};

const HEADER_TITLE: CSSProperties = {
  fontSize: "2.5rem",
  fontWeight: 700,
  color: "#ffffff",
  margin: 0,
  letterSpacing: "-0.02em",
};

const HEADER_SUBTITLE: CSSProperties = {
  fontSize: "1rem",
  color: "rgba(255, 255, 255, 0.6)",
  margin: "0.5rem 0 0",
  fontWeight: 400,
};

const METRICS_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "1rem",
  marginBottom: "2rem",
};

const METRIC_CARD: CSSProperties = {
  padding: "1.5rem",
  borderRadius: "16px",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(20px)",
  transition: "all 0.3s ease",
  cursor: "pointer",
};

const METRIC_LABEL: CSSProperties = {
  fontSize: "0.75rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "rgba(255, 255, 255, 0.5)",
  marginBottom: "0.5rem",
};

const METRIC_VALUE: CSSProperties = {
  fontSize: "2rem",
  fontWeight: 700,
  color: "#00E676",
  fontFamily: "'IBM Plex Mono', monospace",
  marginBottom: "0.5rem",
};

const METRIC_DETAIL: CSSProperties = {
  fontSize: "0.85rem",
  color: "rgba(255, 255, 255, 0.6)",
};

const ACTION_BAR: CSSProperties = {
  display: "flex",
  gap: "1rem",
  marginBottom: "2rem",
  flexWrap: "wrap",
};

const PRIMARY_BUTTON: CSSProperties = {
  padding: "12px 24px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(135deg, #FF0055 0%, #8A2BE2 100%)",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: "0.9rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const SECONDARY_BUTTON: CSSProperties = {
  padding: "12px 24px",
  borderRadius: "12px",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  background: "transparent",
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "0.9rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  cursor: "pointer",
  transition: "all 0.2s ease",
};

const TRACKERS_GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "1.5rem",
  marginBottom: "2rem",
};

const TRACKER_CARD: CSSProperties = {
  padding: "1.5rem",
  borderRadius: "16px",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(20px)",
  transition: "all 0.3s ease",
};

const TRACKER_HEADER: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "1rem",
};

const TRACKER_NAME: CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 600,
  color: "#ffffff",
};

const TRACKER_BADGE: CSSProperties = {
  padding: "4px 12px",
  borderRadius: "999px",
  background: "rgba(0, 230, 118, 0.15)",
  border: "1px solid rgba(0, 230, 118, 0.3)",
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "#00E676",
};

const PROGRESS_BAR: CSSProperties = {
  width: "100%",
  height: "8px",
  borderRadius: "999px",
  background: "rgba(255, 255, 255, 0.1)",
  overflow: "hidden",
  marginBottom: "1rem",
};

const PROGRESS_FILL: CSSProperties = {
  height: "100%",
  background: "linear-gradient(90deg, #00E676, #00D9A3)",
  transition: "width 0.3s ease",
  borderRadius: "999px",
};

const TRACKER_STATS: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "0.75rem",
  marginBottom: "1rem",
};

const STAT_ITEM: CSSProperties = {
  padding: "0.75rem",
  borderRadius: "8px",
  background: "rgba(255, 255, 255, 0.03)",
  textAlign: "center",
};

const STAT_VALUE: CSSProperties = {
  fontSize: "1.2rem",
  fontWeight: 700,
  color: "#00E676",
  fontFamily: "'IBM Plex Mono', monospace",
};

const STAT_LABEL: CSSProperties = {
  fontSize: "0.65rem",
  color: "rgba(255, 255, 255, 0.5)",
  marginTop: "0.25rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const INSIGHTS_SECTION: CSSProperties = {
  padding: "1.5rem",
  borderRadius: "16px",
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  backdropFilter: "blur(20px)",
};

const INSIGHTS_TITLE: CSSProperties = {
  fontSize: "1.2rem",
  fontWeight: 700,
  color: "#ffffff",
  marginBottom: "1rem",
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
};

export function PremiumDashboard() {
  const store = useTrackers();
  const [theme] = useCycleTheme();
  const { analysis, hydrated } = store;

  const [reflectOpen, setReflectOpen] = useState(false);
  const [addHabitOpen, setAddHabitOpen] = useState(false);
  const [selectedTracker, setSelectedTracker] = useState<TrackerId | null>(null);

  const stats = useMemo(() => {
    if (!hydrated) return { completion: 0, daysLogged: 0, streak: 0, avgDaily: 0 };
    return {
      completion: Math.round(analysis.completion * 100),
      daysLogged: analysis.daysLogged,
      streak: analysis.streak,
      avgDaily: analysis.daysLogged > 0 ? Math.round(100 / analysis.daysLogged) : 0,
    };
  }, [analysis, hydrated]);

  if (!hydrated) {
    return (
      <div style={DASHBOARD_ROOT}>
        <div style={CONTAINER}>
          <div style={{ textAlign: "center", paddingTop: "4rem" }}>
            <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "1.1rem" }}>
              Loading your analytics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={DASHBOARD_ROOT}>
      <div style={CONTAINER}>
        {/* Header */}
        <div style={HEADER}>
          <h1 style={HEADER_TITLE}>Your Metrics</h1>
          <p style={HEADER_SUBTITLE}>
            {analysis.daysLogged} days logged · {analysis.goalsMetToday}/6 today
          </p>
        </div>

        {/* Top Metrics */}
        <div style={METRICS_GRID}>
          <div style={METRIC_CARD} onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }} onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            e.currentTarget.style.transform = "translateY(0)";
          }}>
            <div style={METRIC_LABEL}>Completion</div>
            <div style={METRIC_VALUE}>{stats.completion}%</div>
            <div style={METRIC_DETAIL}>Today's goals met</div>
          </div>

          <div style={METRIC_CARD} onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }} onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            e.currentTarget.style.transform = "translateY(0)";
          }}>
            <div style={METRIC_LABEL}>Streak</div>
            <div style={METRIC_VALUE}>{analysis.streak}d</div>
            <div style={METRIC_DETAIL}>Days logged consecutively</div>
          </div>

          <div style={METRIC_CARD} onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }} onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            e.currentTarget.style.transform = "translateY(0)";
          }}>
            <div style={METRIC_LABEL}>Total Days</div>
            <div style={METRIC_VALUE}>{analysis.daysLogged}</div>
            <div style={METRIC_DETAIL}>With any data logged</div>
          </div>

          <div style={METRIC_CARD} onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }} onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            e.currentTarget.style.transform = "translateY(0)";
          }}>
            <div style={METRIC_LABEL}>Best Streak</div>
            <div style={METRIC_VALUE}>{analysis.bestStreak}d</div>
            <div style={METRIC_DETAIL}>Your personal record</div>
          </div>
        </div>

        {/* Action Bar */}
        <div style={ACTION_BAR}>
          <button
            style={PRIMARY_BUTTON}
            onClick={() => setReflectOpen(true)}
          >
            <Zap size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
            Reflect & Log Today
          </button>
          <button
            style={SECONDARY_BUTTON}
            onClick={() => setAddHabitOpen(true)}
          >
            <Plus size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
            Add Habit
          </button>
          <button style={SECONDARY_BUTTON}>
            <BarChart3 size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
            View Analytics
          </button>
          <button style={SECONDARY_BUTTON}>
            <Settings size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
            Targets
          </button>
        </div>

        {/* Trackers Grid */}
        <div style={TRACKERS_GRID}>
          {TRACKERS.map((def) => {
            const stat = analysis.trackers[def.id];
            const progress = Math.min(Math.max(stat.progress * 100, 0), 100);
            const isMet = stat.met === true;

            return (
              <div
                key={def.id}
                style={{
                  ...TRACKER_CARD,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onClick={() => setSelectedTracker(def.id)}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={TRACKER_HEADER}>
                  <div style={TRACKER_NAME}>{def.name}</div>
                  {isMet && <div style={TRACKER_BADGE}>✓ Met</div>}
                </div>

                <div style={PROGRESS_BAR}>
                  <div style={{ ...PROGRESS_FILL, width: `${progress}%` }} />
                </div>

                <div style={TRACKER_STATS}>
                  <div style={STAT_ITEM}>
                    <div style={STAT_VALUE}>{stat.today === null ? "—" : def.format(Math.round(stat.today))}</div>
                    <div style={STAT_LABEL}>Today</div>
                  </div>
                  <div style={STAT_ITEM}>
                    <div style={STAT_VALUE}>{stat.avg7 === null ? "—" : def.format(Math.round(stat.avg7))}</div>
                    <div style={STAT_LABEL}>7-day avg</div>
                  </div>
                  <div style={STAT_ITEM}>
                    <div style={STAT_VALUE}>{def.format(stat.goal)}</div>
                    <div style={STAT_LABEL}>Target</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Insights */}
        {analysis.observations.length > 0 && (
          <div style={INSIGHTS_SECTION}>
            <div style={INSIGHTS_TITLE}>
              <TrendingUp size={20} />
              Insights
            </div>
            <Observations items={analysis.observations} />
          </div>
        )}

        {/* Modals */}
        <ReflectSheet store={store} open={reflectOpen} onClose={() => setReflectOpen(false)} />
        <AddHabitModal
          open={addHabitOpen}
          onClose={() => setAddHabitOpen(false)}
          onSubmit={async (habit) => {
            console.log("[PremiumDashboard] Habit created:", habit);
            // TODO: Call API to save habit
          }}
        />
        {selectedTracker && (
          <TrackerModal
            store={store}
            tracker={selectedTracker}
            onClose={() => setSelectedTracker(null)}
            onSaved={(id) => console.log(`${trackerDef(id).name} logged`)}
          />
        )}
      </div>
    </div>
  );
}

export default PremiumDashboard;
