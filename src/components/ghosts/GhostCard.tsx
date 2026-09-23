import { Link } from "@tanstack/react-router";
import type { DuelGhost } from "@/hooks/useGhosts";

export function GhostCard({ ghost }: { ghost: DuelGhost }) {
  const participants = ghost.participants ?? [];
  const isExpired = new Date(ghost.expires_at).getTime() < Date.now();
  const daysLeft = Math.max(0, Math.ceil((new Date(ghost.expires_at).getTime() - Date.now()) / 86400000));

  return (
    <Link
      to={"/duel/$code" as any}
      params={{ code: ghost.code } as any}
      className="group flex flex-col rounded-[16px] border border-border bg-card p-4 transition hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium tracking-wide text-primary">GHOST • {ghost.code}</div>
        <div className={`text-[11px] ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>{isExpired ? "expired" : `${daysLeft}d left`}</div>
      </div>
      <div className="mt-3 text-[16px] font-semibold leading-tight text-foreground group-hover:underline">{ghost.title}</div>
      <div className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{ghost.detail}</div>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-1">{ghost.kind}</span>
        <span>
          {participants.length} joined • {ghost.target} target
        </span>
      </div>
      <div className="mt-2 text-[11px] tracking-wide text-muted-foreground">
        {new Date(ghost.period_start).toLocaleDateString()} → {new Date(ghost.period_end).toLocaleDateString()}
      </div>
    </Link>
  );
}
