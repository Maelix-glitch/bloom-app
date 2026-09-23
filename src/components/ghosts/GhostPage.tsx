import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useGhosts } from "@/hooks/useGhosts";
import { useSession } from "@/hooks/useSession";
import { GardenBed } from "@/components/garden/GardenBed";

export function GhostPage() {
  const { code } = useParams({ from: "/duel/$code" as any });
  const { getGhost, joinGhost } = useGhosts();
  const { userId } = useSession();
  const session = userId ? { user: { id: userId } } : null;
  const [ghost, setGhost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const g = await getGhost(code as string);
        if (!alive) return;
        setGhost(g);
        if (!g) setErr("Ghost not found");
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load ghost");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [code, getGhost]);

  const onJoin = async () => {
    if (!session) {
      window.location.href = `/`;
      return;
    }
    setJoining(true);
    setErr(null);
    try {
      const g = await joinGhost(code as string);
      setGhost(g);
    } catch (e: any) {
      setErr(e?.message ?? "Join failed");
    } finally {
      setJoining(false);
    }
  };

  if (loading) return <div className="mx-auto max-w-[720px] p-6 text-sm text-muted-foreground">Loading ghost…</div>;
  if (err) return <div className="mx-auto max-w-[720px] p-6"><div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{err}</div><Link to="/" className="mt-4 inline-block text-sm underline">Go home</Link></div>;
  if (!ghost) return null;

  const participants = ghost.participants ?? [];
  const isParticipant = session && participants.some((p: any) => p.profile_id === session.user.id);

  return (
    <div className="app-shell min-h-screen bg-background">
      <div className="mx-auto max-w-[720px] p-4 md:p-6">
        <div className="rounded-[18px] border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium tracking-wide text-primary">GHOST • {ghost.code}</div>
            <div className="text-[11px] text-muted-foreground">{ghost.kind} • {ghost.target} target</div>
          </div>
          <h1 className="mt-3 text-[22px] font-semibold tracking-tight text-foreground">{ghost.title}</h1>
          <p className="mt-1 text-[13px] leading-5 text-muted-foreground">{ghost.detail}</p>
          <div className="mt-3 text-[11px] tracking-wide text-muted-foreground">
            {ghost.period_start} → {ghost.period_end} • expires {new Date(ghost.expires_at).toLocaleDateString()}
          </div>

          <div className="mt-4 grid gap-2">
            <div className="rounded-xl bg-muted p-3">
              <div className="text-[11px] tracking-wide text-muted-foreground">GHOST SNAPSHOT</div>
              <pre className="mt-1 max-h-32 overflow-auto text-[11px] leading-4">{JSON.stringify(ghost.ghost_snapshot, null, 2)}</pre>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <div className="text-[11px] tracking-wide text-muted-foreground">PARTICIPANTS ({participants.length})</div>
              <div className="mt-2 space-y-1">
                {participants.map((p: any) => (
                  <div key={p.profile_id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-[13px]">
                    <span className="font-mono text-[12px]">{p.profile_id.slice(0, 8)}…</span>
                    <span className="text-muted-foreground">{p.progress} / {ghost.target}</span>
                  </div>
                ))}
                {participants.length === 0 && <div className="text-[13px] text-muted-foreground">No one joined yet — be first.</div>}
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            {!isParticipant ? (
              <button onClick={onJoin} disabled={joining} className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {joining ? "Joining…" : session ? "Join this Ghost" : "Sign in to join"}
              </button>
            ) : (
              <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">You’re in — race on!</div>
            )}
            <Link to={"/ghosts" as any} className="inline-flex items-center justify-center rounded-full border border-input bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent">
              My Ghosts
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <GardenBed />
        </div>
      </div>
    </div>
  );
}
