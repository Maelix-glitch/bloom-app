import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, PenLine, RotateCcw, Sparkles } from "lucide-react";

import { useMoodSystem } from "@/hooks/useMoodSystem";
import type { MoodEntry } from "@/lib/mood/types";
import { Atmosphere } from "@/components/mood/Atmosphere";
import { Hero } from "@/components/mood/Hero";
import { MoodChart } from "@/components/mood/MoodChart";
import { Heatmap } from "@/components/mood/Heatmap";
import { Emotions } from "@/components/mood/Emotions";
import { Calendar } from "@/components/mood/Calendar";
import { Timeline } from "@/components/mood/Timeline";
import { Correlations } from "@/components/mood/Correlations";
import { Patterns, Anomalies } from "@/components/mood/Patterns";
import { Distribution } from "@/components/mood/Distribution";
import { Insights } from "@/components/mood/Insights";
import { History } from "@/components/mood/History";
import { Composer } from "@/components/mood/Composer";
import { Reveal } from "@/components/mood/primitives";
import { BloomHeader } from "@/components/BloomHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bloom — Mood Intelligence" },
      {
        name: "description",
        content:
          "A private analytics command center for your emotional life — trends, rhythms, correlations, anomalies and insights computed entirely from what you log.",
      },
    ],
  }),
  component: MoodIntelligencePage,
});

function EmptyState({ onCompose }: { onCompose: () => void }) {
  return (
    <Reveal delay={120} className="mx-auto max-w-[680px] pt-10 text-center">
      <p className="eyebrow mb-4 flex items-center justify-center gap-2">
        <Sparkles className="size-3.5 text-violet" /> Begin the record
      </p>

      <h2 className="display text-[30px] leading-tight sm:text-[40px]">
        The intelligence arrives
        <br />
        <span className="bg-gradient-to-r from-violet via-sky to-amber bg-clip-text text-transparent">
          once you do.
        </span>
      </h2>

      <p className="mx-auto mt-4 max-w-[52ch] text-[14px] leading-relaxed text-muted-foreground">
        Every chart, correlation and insight on this page is computed only from
        your own check-ins. Log your first entry to begin your private Mood
        Intelligence record.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onCompose}
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13px] font-medium text-background transition-transform duration-500 hover:scale-[1.03]"
          style={{
            background: "var(--grad-violet)",
            boxShadow: "var(--glow-violet)",
          }}
        >
          <PenLine className="size-4" /> Log your first entry
        </button>
      </div>
    </Reveal>
  );
}

function MoodIntelligencePage() {
  const navigate = useNavigate();
  const system = useMoodSystem();
  const {
    loading,
    entries,
    analytics: a,
    emotionFilter,
    setEmotionFilter,
    authError,
  } = system;

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<MoodEntry | null>(null);

  const openNew = () => {
    setEditing(null);
    setComposerOpen(true);
  };

  const openEdit = (entry: MoodEntry) => {
    setEditing(entry);
    setComposerOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <BloomHeader />
      <Atmosphere />

      <main className="relative mx-auto w-full max-w-[1200px] px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
        <Reveal>
          <Hero system={system} onCompose={openNew} />
        </Reveal>

        {authError ? (
          <div className="panel mx-auto mt-12 max-w-[680px] p-7 text-center">
            <p className="eyebrow mb-3">Mood Intelligence</p>
            <h2 className="display text-[28px]">Your private record is waiting.</h2>
            <p className="mt-3 text-[14px] text-muted-foreground">
              {authError}
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-3 py-32 text-faint">
            <Loader2 className="size-4 animate-spin" />
            <span className="mono text-[11px] uppercase tracking-[0.08em]">
              Reading your record…
            </span>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState onCompose={openNew} />
        ) : (
          <div className="mt-14 flex flex-col gap-6">
            <Reveal delay={80}>
              <MoodChart days={a.days} />
            </Reveal>

            <div className="grid gap-6 lg:grid-cols-2">
              <Reveal delay={120}>
                <Emotions
                  stats={a.emotions}
                  filter={emotionFilter}
                  onFilter={setEmotionFilter}
                />
              </Reveal>

              <Reveal delay={160}>
                <Heatmap cells={a.heatmap} />
              </Reveal>
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <Reveal delay={120} className="lg:col-span-3">
                <Calendar days={a.allDays} />
              </Reveal>

              <Reveal delay={160} className="lg:col-span-2">
                <Timeline days={a.days} />
              </Reveal>
            </div>

            <Reveal delay={100}>
              <Correlations correlations={a.correlations} />
            </Reveal>

            <div className="grid gap-6 lg:grid-cols-2">
              <Reveal delay={120}>
                <Patterns patterns={a.patterns} />
              </Reveal>

              <Reveal delay={160}>
                <Anomalies anomalies={a.anomalies} />
              </Reveal>
            </div>

            <Reveal delay={100}>
              <Distribution
                buckets={a.distribution}
                volatility={a.volatility}
              />
            </Reveal>

            <Reveal delay={120}>
              <Insights insights={a.insights} tier={a.tier} />
            </Reveal>

            <Reveal delay={140}>
              <History
                entries={entries}
                onEdit={openEdit}
                onDelete={system.removeEntry}
                onShareStory={(e) =>
                  navigate({
                    to: "/profile",
                    search: { story: `${e.note?.trim() ? "reflection" : "mood"}:${e.id}` },
                  })
                }
              />
            </Reveal>

            <footer className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <p className="mono text-[10px] uppercase tracking-[0.08em] text-faint">
                Bloom · your data is saved securely to your private account
              </p>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Erase every recorded Mood entry? This cannot be undone.",
                    )
                  ) {
                    void system.resetAll();
                  }
                }}
                className="mono inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[10px] uppercase tracking-[0.08em] text-faint transition-colors hover:border-rose/50 hover:text-rose"
              >
                <RotateCcw className="size-3" /> Reset all data
              </button>
            </footer>
          </div>
        )}
      </main>

      <Composer
        open={composerOpen}
        initial={editing}
        onClose={() => setComposerOpen(false)}
        onSave={(entry) => void system.saveEntry(entry)}
      />
    </div>
  );
}