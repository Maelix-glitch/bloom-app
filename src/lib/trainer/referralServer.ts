/**
 * The server side of trainer referral (migration 20261121, M-171).
 *
 * Trainer status is admin-granted in the database and nowhere else:
 * this module can only READ what the server decided. Three honest
 * states, mirroring lib/billing/entitlement:
 *
 *   · "trainer" — the server returned this person's own trainer row,
 *     so they have a code, and the client list the RPC gave back.
 *   · "not-trainer" — the server answered and there is no row. The
 *     Profile section is simply never rendered.
 *   · "unavailable" — no project configured, signed out, offline, or
 *     the migration not applied yet. Surfaces render NOTHING rather
 *     than inventing a code — the same fail-closed read the old
 *     locally-derived code never needed and this one always does.
 *
 * Linking is the `link_trainer_code` RPC and nothing else: the client
 * holds no write grant on trainer_links, so the first-link rule is
 * the server's, not a promise this file makes.
 */

import { supabase, trySupabase } from "@/lib/supabase";
import { normalizeReferralCode } from "@/lib/trainer/referral";

export interface TrainerClient {
  name: string;
  /** ISO timestamp of the moment the link was created. */
  joinedAt: string;
}

export type MyTrainerState =
  | { kind: "trainer"; code: string; clients: TrainerClient[] }
  | { kind: "not-trainer" }
  | { kind: "unavailable" };

export type LinkTrainerCodeResult =
  | { kind: "linked" }
  | { kind: "already-linked" }
  | { kind: "unknown-code" }
  | { kind: "own-code" }
  | { kind: "malformed" }
  | { kind: "unavailable" };

/** Parse the my_trainer_clients() rows. Anything unexpected is dropped,
 *  never repaired into a plausible-looking client. */
export function parseTrainerClients(rows: unknown): TrainerClient[] {
  if (!Array.isArray(rows)) return [];
  const out: TrainerClient[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const name = typeof r["display_name"] === "string" ? r["display_name"].trim() : "";
    const joinedAt = typeof r["joined_at"] === "string" ? r["joined_at"] : "";
    if (!name || !joinedAt) continue;
    out.push({ name, joinedAt });
  }
  return out;
}

/**
 * Read the caller's trainer standing: their own trainer_profiles row
 * (RLS lets a person read exactly that one row), then the clients RPC.
 */
export async function fetchMyTrainer(): Promise<MyTrainerState> {
  const result = await trySupabase(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { kind: "not-trainer" } as const;

    const { data: row, error } = await supabase
      .from("trainer_profiles")
      .select("code")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { kind: "not-trainer" } as const;

    const code = (row as { code?: unknown }).code;
    if (typeof code !== "string" || code.length === 0) return { kind: "not-trainer" } as const;

    const { data: clientRows, error: clientsError } = await supabase.rpc("my_trainer_clients");
    if (clientsError) throw clientsError;
    return { kind: "trainer", code, clients: parseTrainerClients(clientRows) } as const;
  });
  return result.ok ? result.value : { kind: "unavailable" };
}

/**
 * Attempt to link the signed-in caller to the trainer behind a typed
 * code. Expected refusals come back as named results, not exceptions:
 * the Welcome flow turns "unknown-code" into one gentle line and
 * carries on either way — this call can never block onboarding.
 */
export async function linkTrainerCode(rawCode: string): Promise<LinkTrainerCodeResult> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return { kind: "malformed" };

  const result = await trySupabase(async () => {
    const { data, error } = await supabase.rpc("link_trainer_code", { p_code: code });
    if (error) {
      const err = error as { code?: unknown; message?: unknown };
      const pgCode = typeof err.code === "string" ? err.code : "";
      const message = typeof err.message === "string" ? err.message : "";
      if (pgCode === "P0002" || /not recognised/i.test(message)) {
        return { kind: "unknown-code" } as const;
      }
      if (pgCode === "22023" || /your own trainer code/i.test(message)) {
        return { kind: "own-code" } as const;
      }
      /* 42501 (signed out) and everything unexpected: the link simply
         didn't happen, and onboarding must not care. */
      return { kind: "unavailable" } as const;
    }
    return data === "already_linked"
      ? ({ kind: "already-linked" } as const)
      : ({ kind: "linked" } as const);
  });
  return result.ok ? result.value : { kind: "unavailable" };
}
