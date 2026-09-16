/**
 * Bloom Rewards — persistence store.
 *
 * Device-first, exactly like the rest of Bloom: reads never wait for the
 * network; every mutation is written to the shared preferences document
 * (localStorage now, mirrored to the account's `user_prefs` row when a
 * database is configured), so ownership, favorites and the equipped profile
 * survive refresh, sign-out/in and — once synced — other devices.
 *
 * All mutations here are additive and idempotent; double-unlock protection is
 * enforced by the hook on top of this store (see useRewardsEcosystem).
 */

import { clearPref, getPref, PREFS_CHANGED, setPref } from "@/lib/prefs";
import { collectionsById, componentsById } from "./catalog";
import type {
  DailyHistoryEntry,
  EquippedProfile,
  LedgerEntry,
  OwnedEntry,
  RewardsStoreState,
} from "./types";

const KEYS = {
  owned: "rewards.owned.v1",
  favorites: "rewards.favorites.v1",
  spent: "rewards.spent.v1",
  equipped: "rewards.equipped.v1",
  daily: "rewards.daily.v1",
  featuredSeen: "rewards.featuredSeen.v1",
  seed: "rewards.seed.v1",
} as const;

/** Broadcast that reward state changed (equivalently to PREFS_CHANGED). */
export const REWARDS_CHANGED = "bloom:rewards-changed";

function emit(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REWARDS_CHANGED));
  // setPref dispatches PREFS_CHANGED on its own; callers that mutate through
  // the store below still announce themselves here.
}

export function subscribeRewards(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(REWARDS_CHANGED, listener);
  window.addEventListener(PREFS_CHANGED, listener);
  return () => {
    window.removeEventListener(REWARDS_CHANGED, listener);
    window.removeEventListener(PREFS_CHANGED, listener);
  };
}

/* ------------------------------ validation ------------------------------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

function parseOwned(raw: unknown): OwnedEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: OwnedEntry[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = entry["id"];
    if (typeof id !== "string" || !id) continue;
    const kind = entry["kind"] === "collection" || entry["kind"] === "seal" ? entry["kind"] : "component";
    const paid = typeof entry["paid"] === "number" ? Math.max(0, Math.round(entry["paid"])) : 0;
    const ownedAt = typeof entry["ownedAt"] === "string" ? entry["ownedAt"] : new Date().toISOString();
    const source =
      entry["source"] === "gift" ||
      entry["source"] === "collection" ||
      entry["source"] === "set-complete" ||
      entry["source"] === "legacy"
        ? entry["source"]
        : "unlock";
    out.push({ id, kind, paid, ownedAt, source });
  }
  // Keep first occurrence only (idempotent store).
  const seen = new Set<string>();
  return out.filter((e) => (seen.has(e["id"]) ? false : (seen.add(e["id"]), true)));
}

const parseStringArray = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];

function parseEquipped(raw: unknown): EquippedProfile {
  if (!isRecord(raw)) return { updatedAt: "" };
  const record: Record<string, unknown> = { updatedAt: "" };
  const keys = ["themeId", "paletteId", "wallpaperId", "profileFrameId", "effectId"] as const;
  for (const k of keys) {
    const value = raw[k];
    if (typeof value === "string") record[k] = value;
  }
  const updatedAt = raw["updatedAt"];
  record["updatedAt"] = typeof updatedAt === "string" ? updatedAt : "";
  return record as unknown as EquippedProfile;
}

function parseLedger(raw: unknown): LedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LedgerEntry[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const id = entry["id"];
    const offerId = entry["offerId"];
    const points = entry["points"];
    if (typeof id !== "string" || typeof offerId !== "string" || typeof points !== "number") continue;
    const offerTitle = entry["offerTitle"];
    const date = entry["date"];
    out.push({
      id,
      offerId,
      offerTitle: typeof offerTitle === "string" ? offerTitle : "",
      points: Math.max(0, Math.round(points)),
      date: typeof date === "string" ? date : new Date().toISOString(),
    });
  }
  return out;
}

function parseHistory(raw: unknown): DailyHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: DailyHistoryEntry[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const date = entry["date"];
    const offerId = entry["offerId"];
    if (typeof date !== "string" || typeof offerId !== "string") continue;
    out.push({
      date,
      offerId,
      seen: entry["seen"] !== false,
      gift: entry["gift"] === true,
    });
  }
  return out.slice(-30);
}

/* ---------------------------------- api ---------------------------------- */

export function loadRewardsStore(): RewardsStoreState {
  const owned = getPref(KEYS.owned, parseOwned, []);
  return {
    owned,
    favorites: getPref(KEYS.favorites, parseStringArray, []),
    spent: getPref(KEYS.spent, parseLedger, []),
    equipped: getPref(KEYS.equipped, parseEquipped, { updatedAt: "" }),
    dailyHistory: getPref(KEYS.daily, parseHistory, []),
    featuredSeen: getPref(KEYS.featuredSeen, parseFeaturedSeen, []),
  };
}

function parseFeaturedSeen(raw: unknown): { window: number; collectionId: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { window: number; collectionId: string }[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const window = entry["window"];
    const collectionId = entry["collectionId"];
    if (typeof window !== "number" || typeof collectionId !== "string") continue;
    out.push({ window, collectionId });
  }
  return out;
}

export function deviceSeed(): string {
  const existing = getPref(KEYS.seed, (raw) => (typeof raw === "string" && raw ? raw : null), "");
  if (existing) return existing;
  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  setPref(KEYS.seed, created);
  return created;
}

/** Current owned component/collection/seal ids. */
export function ownedIds(state: RewardsStoreState): Set<string> {
  return new Set(state.owned.map((e) => e.id));
}

export function isOwnedComponent(state: RewardsStoreState, componentId: string): boolean {
  return state.owned.some((e) => e.id === componentId && (e.kind === "component" || e.kind === "collection"));
}

export function isOwnedCollection(state: RewardsStoreState, collectionId: string): boolean {
  return state.owned.some((e) => e.id === collectionId && e.kind === "collection");
}

export function isOwnedId(state: RewardsStoreState, id: string): boolean {
  return ownedIds(state).has(id);
}

export function isFavorite(state: RewardsStoreState, offerId: string): boolean {
  return state.favorites.includes(offerId);
}

/** How much of a collection is already owned (0..1). */
export function collectionProgress(state: RewardsStoreState, componentIds: string[]): number {
  if (componentIds.length === 0) return 1;
  const owned = new Set(
    state.owned.filter((e) => e.kind === "component").map((e) => e.id),
  );
  return componentIds.filter((id) => owned.has(id)).length / componentIds.length;
}

/** Missing pieces of a collection, in catalog order. */
export function missingComponents(state: RewardsStoreState, componentIds: string[]): string[] {
  const owned = new Set(state.owned.filter((e) => e.kind === "component").map((e) => e.id));
  return componentIds.filter((id) => !owned.has(id));
}

/* ------------------------------- mutations ------------------------------- */

/** Record ownership of a component. Never downgrades existing entries. */
export function addOwnedComponent(
  entry: Omit<OwnedEntry, "kind"> & { kind?: OwnedEntry["kind"] },
): RewardsStoreState {
  const state = loadRewardsStore();
  const kind = entry.kind ?? "component";
  if (state.owned.some((e) => e.id === entry.id)) return state;
  const next: OwnedEntry[] = [
    ...state.owned,
    { id: entry.id, kind, paid: entry.paid, ownedAt: entry.ownedAt ?? new Date().toISOString(), source: entry.source },
  ];
  setPref(KEYS.owned, next);
  emit();
  return { ...state, owned: next };
}

/** Unlock a whole collection: the set itself + every piece not yet owned. */
export function unlockCollection(collectionId: string, paid: number): RewardsStoreState {
  const state = loadRewardsStore();
  const coll = collectionsById.get(collectionId);
  if (!coll) return state;
  const missing = missingComponents(state, coll.componentIds);
  if (missing.length === 0 && isOwnedCollection(state, collectionId)) return state;

  const now = new Date().toISOString();
  const next = [...state.owned];
  const push = (id: string, kind: OwnedEntry["kind"], cost: number, source: OwnedEntry["source"]) => {
    if (!next.some((e) => e.id === id)) next.push({ id, kind, paid: cost, ownedAt: now, source });
  };
  if (!isOwnedCollection(state, collectionId)) push(collectionId, "collection", paid, "collection");
  for (const cid of missing) push(cid, "component", 0, "collection");

  setPref(KEYS.owned, next);
  emit();
  return { ...state, owned: next };
}

/** Set-completion seals: one per completed collection, granted automatically. */
export function refreshSeals(): string[] {
  const state = loadRewardsStore();
  const ownedComps = new Set(state.owned.filter((e) => e.kind === "component").map((e) => e.id));
  const earned: string[] = [];
  const next = [...state.owned];
  const now = new Date().toISOString();
  for (const coll of collectionsById.values()) {
    const complete = coll.componentIds.every((id) => ownedComps.has(id));
    const sealId = `seal-${coll.id}`;
    const has = next.some((e) => e.id === sealId);
    if (complete && !has) {
      next.push({ id: sealId, kind: "seal", paid: 0, ownedAt: now, source: "set-complete" });
      earned.push(sealId);
    }
  }
  if (earned.length > 0) {
    setPref(KEYS.owned, next);
    emit();
  }
  return earned;
}

export function toggleFavorite(offerId: string): boolean {
  const state = loadRewardsStore();
  const has = state.favorites.includes(offerId);
  const next = has ? state.favorites.filter((id) => id !== offerId) : [...state.favorites, offerId];
  setPref(KEYS.favorites, next);
  emit();
  return !has;
}

/** Record a spend (called only after the balance check passes). */
export function recordSpend(entry: LedgerEntry): RewardsStoreState {
  const state = loadRewardsStore();
  const next: LedgerEntry[] = [...state.spent, entry];
  setPref(KEYS.spent, next);
  emit();
  return { ...state, spent: next };
}

/** Remember that today's reward was seen / collected. */
export function recordDaily(dateStr: string, offerId: string, gift: boolean, seen = true): void {
  const state = loadRewardsStore();
  const next = [...state.dailyHistory.filter((h) => h.date !== dateStr)];
  next.push({ date: dateStr, offerId, gift, seen });
  setPref(KEYS.daily, next.slice(-30));
  emit();
}

export function seenDailyFor(dateStr: string): DailyHistoryEntry | undefined {
  return loadRewardsStore().dailyHistory.find((h) => h.date === dateStr);
}

/** Remember which collection the current featured window shows. */
export function recordFeaturedSeen(window: number, collectionId: string): void {
  const state = loadRewardsStore();
  const next = [...state.featuredSeen.filter((f) => f.window !== window)];
  next.push({ window, collectionId });
  setPref(KEYS.featuredSeen, next.slice(-12));
  emit();
}

export function featuredSeenBefore(state: RewardsStoreState, collectionId: string, currentWindow: number): boolean {
  return state.featuredSeen.some((f) => f.collectionId === collectionId && f.window < currentWindow);
}

/* ------------------------------- equipped -------------------------------- */

/** Equip (or clear a slot of) the customization profile. */
export function setEquipped(update: Partial<EquippedProfile>): EquippedProfile {
  const state = loadRewardsStore();
  const next: EquippedProfile = { ...state.equipped };
  const record = next as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(update)) {
    if (value === null || value === undefined) {
      delete record[key];
    } else {
      record[key] = value;
    }
  }
  next.updatedAt = new Date().toISOString();
  setPref(KEYS.equipped, next);
  emit();
  return next;
}

/** Bloom Default — clear every equipped slot. */
export function resetEquipped(): EquippedProfile {
  setPref(KEYS.equipped, { updatedAt: new Date().toISOString() });
  emit();
  return { updatedAt: new Date().toISOString() };
}

export function clearKey(key: string): void {
  clearPref(key);
  emit();
}

export const REWARD_STORE_KEYS = KEYS;
