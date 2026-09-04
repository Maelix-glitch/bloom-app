import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, Zap, Plus, Calendar, Target, Award } from "lucide-react";

import { BloomHeader } from "@/components/BloomHeader";
import { useTrackers } from "@/hooks/useTrackers";
import { useCycleTheme } from "@/hooks/usePeriodLog";
import { AddHabitModal } from "@/components/tk/AddHabitModal";
import { TRACKERS } from "@/lib/trackers/core";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Bloom — Dashboard" },
      {
        name: "description",
        content:
          "Your personal wellness dashboard. Track habits, sleep, energy, study, movement, and more. Premium analytics and insights powered by your data.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const store = useTrackers();
  const [theme] = useCycleTheme();
  const { analysis, hydrated } = store;
  const [addHabitOpen, setAddHabitOpen] = useState(false);

  if (!hydrated) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F0F15 0%, #1A1A2E 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.1rem" }}>Loading your dashboard...</p>
      </div>
    );
  }

  const completion = Math.round(analysis.completion * 100);
  const stats = [
    { label: "Completion", value: `${completion}%`, icon: "📊", color: "#00E676" },
    { label: "Streak", value: `${analysis.streak}d`, icon: "🔥", color: "#FF0055" },
    { label: "Days Logged", value: `${analysis.daysLogged}`, icon: "📅", color: "#7FA0C9" },
    { label: "Best Streak", value: `${analysis.bestStreak}d`, icon: "🏆", color: "#E8B75E" },
  ];

  return (
    <>
      <BloomHeader />
      <main style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F0F15 0%, #1A1A2E 50%, #16213E 100%)" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1rem" }}>
          {/* Hero Section */}
          <div style={{ marginBottom: "3rem", textAlign: "center" }}>
            <h1 style={{ fontSize: "3.5rem", fontWeight: 700, color: "#ffffff", margin: 0, letterSpacing: "-0.02em" }}>
              Welcome back
            </h1>
            <p style={{ fontSize: "1.2rem", color: "rgba(255,255,255,0.6)", margin: "0.5rem 0 0", fontWeight: 400 }}>
              {completion}% of your goals met today
            </p>
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {stats.map((stat) => (
              <div
                key={stat.label}
                style={{
                  padding: "1.5rem",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", marginBottom: "0.5rem" }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: stat.color, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "3rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => setAddHabitOpen(true)}
              style={{
                padding: "14px 32px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #FF0055 0%, #8A2BE2 100%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "1rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 26px -12px rgba(255,0,85,0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Plus size={18} />
              Add New Habit
            </button>
            <a
              href="/trackers-premium"
              style={{
                padding: "14px 32px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "1rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                textDecoration: "none",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              }}
            >
              <TrendingUp size={18} />
              View Full Dashboard
            </a>
          </div>

          {/* Trackers Showcase Grid */}
          <div style={{ marginBottom: "3rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#ffffff", marginBottom: "1.5rem" }}>Your Trackers</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
              {TRACKERS.map((def) => {
                const stat = analysis.trackers[def.id];
                const progress = Math.min(Math.max(stat.progress * 100, 0), 100);
                const isMet = stat.met === true;

                return (
                  <div
                    key={def.id}
                    style={{
                      padding: "1.5rem",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      backdropFilter: "blur(20px)",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#ffffff" }}>{def.name}</h3>
                      {isMet && (
                        <div style={{ padding: "4px 12px", borderRadius: "999px", background: "rgba(0,230,118,0.15)", border: "1px solid rgba(0,230,118,0.3)", fontSize: "0.75rem", fontWeight: 600, color: "#00E676" }}>
                          ✓ Met
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: "100%", height: "8px", borderRadius: "999px", background: "rgba(255,255,255,0.1)", overflow: "hidden", marginBottom: "1rem" }}>
                      <div
                        style={{
                          height: "100%",
                          background: "linear-gradient(90deg, #00E676, #00D9A3)",
                          width: `${progress}%`,
                          transition: "width 0.3s ease",
                          borderRadius: "999px",
                        }}
                      />
                    </div>

                    {/* Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                      <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#00E676", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {stat.today === null ? "—" : def.format(Math.round(stat.today))}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Today
                        </div>
                      </div>
                      <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#00E676", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {stat.avg7 === null ? "—" : def.format(Math.round(stat.avg7))}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          7-day avg
                        </div>
                      </div>
                      <div style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", textAlign: "center" }}>
                        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#00E676", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {def.format(stat.goal)}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Target
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insights */}
          {analysis.observations.length > 0 && (
            <div
              style={{
                padding: "1.5rem",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px)",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 1rem 0" }}>
                <TrendingUp size={20} />
                Insights
              </h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {analysis.observations.slice(0, 3).map((obs, i) => (
                  <li
                    key={i}
                    style={{
                      padding: "0.75rem 0",
                      fontSize: "0.95rem",
                      color: "rgba(255,255,255,0.7)",
                      borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none",
                      paddingBottom: i < 2 ? "0.75rem" : "0",
                    }}
                  >
                    {obs}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Add Habit Modal */}
      <AddHabitModal
        open={addHabitOpen}
        onClose={() => setAddHabitOpen(false)}
        onSubmit={async (habit) => {
          console.log("[Dashboard] Habit created:", habit);
          // TODO: Call API to save habit
        }}
      />
    </>
  );
}
