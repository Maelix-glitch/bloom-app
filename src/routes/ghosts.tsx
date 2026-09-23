import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGhosts } from "@/hooks/useGhosts";
import { GhostCard } from "@/components/ghosts/GhostCard";
import { GardenBed } from "@/components/garden/GardenBed";

// @ts-ignore - file route generated at build
export const Route = createFileRoute("/ghosts" as any)({
  component: GhostsPage,
});

function GhostsPage() {
  const { ghosts, loading, createGhost } = useGhosts();
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onCreateSelf = async () => {
    setCreating(true);
    setErr(null);
    try {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      await createGhost({
        kind: "self",
        spec: { on: "habitDays", window: 7, target: 5 },
        target: 5,
        title: "7-Day Ghost • vs Last Week You",
        detail: "Race your past self — same 7 days, same habits. Garden blooms for both.",
        period_start: start.toISOString().slice(0, 10),
        period_end: now.toISOString().slice(0, 10),
        snapshot: { created: new Date().toISOString(), note: "Ghost of past week" },
      });
    } catch (e: any) {
      setErr(e?.message ?? "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const onCreateLink = async () => {
    setCreating(true);
    setErr(null);
    try {
      const now = new Date();
      const end = new Date(now);
      end.setDate(now.getDate() + 7);
      await createGhost({
        kind: "link",
        spec: { on: "habitDays", window: 7, target: 5 },
        target: 5,
        title: "Duel Link • 7 Days",
        detail: "Share this link — friend joins without pairing. Race together, bloom together.",
        period_start: now.toISOString().slice(0, 10),
        period_end: end.toISOString().slice(0, 10),
        snapshot: { created: new Date().toISOString(), note: "Link duel" },
      });
    } catch (e: any) {
      setErr(e?.message ?? "Create failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="app-shell min-h-screen bg-background">
      <div className="mx-auto max-w-[880px] p-4 md:p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Ghosts & Garden</h1>
          <Link to="/" className="text-sm underline text-muted-foreground">← Today</Link>
        </div>

        <div className="mt-4">
          <GardenBed />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={onCreateSelf} disabled={creating} className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {creating ? "Creating…" : "Create Self Ghost"}
          </button>
          <button onClick={onCreateLink} disabled={creating} className="rounded-full border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50">
            Create Duel Link
          </button>
        </div>
        {err && <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{err}</div>}

        <div className="mt-6">
          <div className="text-[11px] tracking-[0.18em] text-muted-foreground">ACTIVE GHOSTS</div>
          {loading ? (
            <div className="mt-3 text-sm text-muted-foreground">Loading…</div>
          ) : ghosts.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No ghosts yet — create one above. Your garden will grow as you log.</div>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {ghosts.map((g) => (
                <GhostCard key={g.id} ghost={g as any} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
