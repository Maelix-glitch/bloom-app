import { cn } from "@/lib/utils";

/**
 * Skeleton (UI update U2, plan §2.2): the calm pulse on --surface-2 at
 * control radius — the same holding state the loading work settled on,
 * never a gold tint.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-control bg-surface-2", className)} {...props} />;
}

export { Skeleton };
