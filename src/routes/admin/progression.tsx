/**
 * /admin/progression — read-only point audit.
 *
 * Every point award a person received, straight from `point_transactions`.
 * Read-only by design: awards are made by the server-verified
 * `award_progress()` function, never by a button here, so an admin cannot
 * invent points and a mistake cannot be hidden. Authorization is the existing
 * `is_rewards_admin()` check, evaluated server-side inside the RPC.
 *
 * This route is separate from /admin/rewards so the working reward-delivery
 * admin flow is untouched.
 */

import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCcw, ShieldCheck } from "lucide-react";

import { AppNav } from "@/components/home/HomeSidebar";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/progression")({
  head: () => ({
    meta: [
      { title: "Bloom — Point Audit" },
      { name: "description", content: "Read-only audit of Bloom Point awards." },
    ],
  }),
  component: PointAuditPage,
});

interface AuditRow {
  profile_id: string;
  profile_name: string | null;
  kind: string;
  ref_id: string;
  title: string;
  points: number;
  created_at: string;
}

function PointAuditPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hasSupabaseConfig) {
      setAllowed(false);
      setError("No database connection is configured for this build.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: admin } = await supabase.rpc("is_rewards_admin");
      if (admin !== true) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      const { data, error: rpcError } = await supabase.rpc("admin_point_audit", { p_limit: 200 });
      if (rpcError) throw rpcError;
      setRows((data ?? []) as AuditRow[]);
      setError(null);
    } catch (cause) {
      console.error("Point audit failed:", cause);
      setError("The audit could not load right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="mx-auto w-full max-w-[1100px] px-5 pb-24 pt-10 sm:px-8">
        <Link
          to="/admin/rewards"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Reward admin
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Admin
            </p>
            <h1 className="mt-2 font-display text-3xl">Point audit</h1>
            <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-muted-foreground">
              Read-only. Every row is a real award written by the server-verified{" "}
              <code className="font-mono text-[12px]">award_progress()</code> function — the same
              transaction that verified the goal against the person&rsquo;s own logs.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:text-foreground"
            >
              <RefreshCcw className="size-3.5" /> Reload
            </button>
          </div>
        </div>

        {allowed === false ? (
          <p className="rounded-2xl border border-border bg-surface-2/40 p-5 text-sm text-muted-foreground">
            <ShieldCheck className="mr-2 inline size-4" />
            Rewards administrator access required.
          </p>
        ) : null}

        {error && allowed !== false ? (
          <p className="mb-4 rounded-2xl border border-border bg-surface-2/40 p-4 text-[13px] text-muted-foreground">
            {error}
          </p>
        ) : null}

        {loading && allowed !== false ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-2/40" />
            ))}
          </div>
        ) : null}

        {allowed && !loading && rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-[13px] text-muted-foreground">
            No points have been awarded yet.
          </p>
        ) : null}

        {allowed && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[620px] border-collapse text-left text-[13px]">
              <thead className="bg-surface-2/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-normal">When</th>
                  <th className="px-4 py-2.5 font-normal">Person</th>
                  <th className="px-4 py-2.5 font-normal">Award</th>
                  <th className="px-4 py-2.5 font-normal">Kind</th>
                  <th className="px-4 py-2.5 text-right font-normal">Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.profile_id}-${row.ref_id}-${index}`} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.profile_name ?? "Bloom user"}
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {row.profile_id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {row.title}
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        {row.ref_id}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.kind}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {row.points > 0 ? `+${row.points.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </div>
  );
}
