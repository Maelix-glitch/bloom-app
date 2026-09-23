import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { useSession } from "./useSession";

export type GhostKind = "self" | "pair" | "link";

export interface DuelGhost {
  id: string;
  code: string;
  owner: string;
  kind: GhostKind;
  spec: any;
  target: number;
  title: string;
  detail: string;
  period_start: string;
  period_end: string;
  ghost_snapshot: any;
  created_at: string;
  expires_at: string;
  participants?: { ghost_id: string; profile_id: string; progress: number; joined_at: string }[];
}

export function useGhosts() {
  const { userId } = useSession();
  const uid = userId ?? null;
  const [ghosts, setGhosts] = useState<DuelGhost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listMyGhosts = useCallback(async () => {
    if (!hasSupabaseConfig || !uid) return [];
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("duel_ghosts")
        .select("*, duel_participants(*)")
        .eq("owner", uid)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (err) throw err;
      const list = (data ?? []) as any as DuelGhost[];
      setGhosts(list);
      return list;
    } catch (e: any) {
      setError(e?.message ?? "Failed to load ghosts");
      return [];
    } finally {
      setLoading(false);
    }
  }, [uid]);

  const createGhost = useCallback(
    async (input: { kind: GhostKind; spec: any; target: number; title: string; detail: string; period_start: string; period_end: string; snapshot: any }) => {
      if (!hasSupabaseConfig || !uid) throw new Error("Not signed in");
      const { data, error: err } = await supabase.rpc("create_ghost", {
        p_kind: input.kind,
        p_spec: input.spec,
        p_target: input.target,
        p_title: input.title,
        p_detail: input.detail,
        p_period_start: input.period_start,
        p_period_end: input.period_end,
        p_snapshot: input.snapshot,
      });
      if (err) throw err;
      await listMyGhosts();
      return data as DuelGhost;
    },
    [uid, listMyGhosts],
  );

  const joinGhost = useCallback(
    async (code: string) => {
      if (!hasSupabaseConfig || !uid) throw new Error("Not signed in");
      const { data, error: err } = await supabase.rpc("join_ghost", { p_code: code });
      if (err) throw err;
      await listMyGhosts();
      return data as any;
    },
    [uid, listMyGhosts],
  );

  const getGhost = useCallback(async (code: string) => {
    if (!hasSupabaseConfig) return null;
    const { data, error: err } = await supabase.rpc("get_ghost", { p_code: code });
    if (err) throw err;
    return data as DuelGhost | null;
  }, []);

  // realtime
  useEffect(() => {
    if (!hasSupabaseConfig || !uid) return;
    listMyGhosts();
    const ch = supabase
      .channel("ghosts")
      .on("postgres_changes", { event: "*", schema: "public", table: "duel_participants" }, () => listMyGhosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "duel_ghosts" }, () => listMyGhosts())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid, listMyGhosts]);

  const activeCount = useMemo(() => ghosts.length, [ghosts]);

  return { ghosts, loading, error, activeCount, listMyGhosts, createGhost, joinGhost, getGhost };
}
