/** Translate the blueprint's permission names/rules into Discord overwrites. */
import { OverwriteType, PermissionFlagsBits, type OverwriteResolvable } from "discord.js";
import { PROFILES, type ProfileKey, type Target } from "./world.ts";

export function bits(names: readonly string[]): bigint {
  let out = 0n;
  for (const n of names) {
    const b = (PermissionFlagsBits as Record<string, bigint>)[n];
    if (b === undefined) throw new Error(`Unknown Discord permission "${n}"`);
    out |= b;
  }
  return out;
}

export interface Ids {
  everyone: string;
  bloomer: string;
  beta: string;
  gardener: string;
  groundskeeper: string;
  bot: string;
}

function targetIds(t: Target, ids: Ids): { id: string; type: OverwriteType }[] {
  switch (t) {
    case "@everyone":
      return [{ id: ids.everyone, type: OverwriteType.Role }];
    case "bloomer":
      return [{ id: ids.bloomer, type: OverwriteType.Role }];
    case "beta":
      return [{ id: ids.beta, type: OverwriteType.Role }];
    case "team":
      return [
        { id: ids.gardener, type: OverwriteType.Role },
        { id: ids.groundskeeper, type: OverwriteType.Role },
      ];
    case "bot":
      return [{ id: ids.bot, type: OverwriteType.Member }];
  }
}

/** Voice-only permissions are rejected on text channels and vice versa, so strip what doesn't apply. */
const VOICE_ONLY = new Set(["Connect", "Speak", "Stream", "UseVAD", "MuteMembers", "MoveMembers"]);

export function overwrites(profile: ProfileKey, ids: Ids, kind: "text" | "voice" | "category"): OverwriteResolvable[] {
  const out = new Map<string, { id: string; type: OverwriteType; allow: bigint; deny: bigint }>();
  const keep = (n: string) => kind !== "text" || !VOICE_ONLY.has(n);
  for (const rule of PROFILES[profile]) {
    for (const t of targetIds(rule.target, ids)) {
      const cur = out.get(t.id) ?? { ...t, allow: 0n, deny: 0n };
      cur.allow |= bits((rule.allow ?? []).filter(keep));
      cur.deny |= bits((rule.deny ?? []).filter(keep));
      out.set(t.id, cur);
    }
  }
  return [...out.values()].map((o) => ({ id: o.id, type: o.type, allow: o.allow & ~o.deny, deny: o.deny }));
}
