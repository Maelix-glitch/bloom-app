/**
 * The Atelier — the secondary layer.
 *
 * Customization is no longer bought; it opens with the journey. Every look is
 * gated by the rank it belongs to (and anything already owned from the earlier
 * reward system stays owned, exactly as it was — nothing is taken away).
 *
 * Equipping remains real: it republishes the shared skin attributes, so the
 * equipped theme, palette, wallpaper, frame and effect apply across Bloom.
 */

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Lock, RotateCcw } from "lucide-react";

import { AppNav } from "@/components/home/HomeSidebar";
import { useProgression } from "@/hooks/useProgression";
import { CATALOG, componentsById } from "@/lib/rewards/catalog";
import { ComponentKind } from "@/lib/rewards/types";
import { COMPONENT_KIND_LABELS } from "@/lib/rewards/types";
import {
  loadRewardsStore,
  ownedIds,
  resetEquipped,
  setEquipped,
  subscribeRewards,
} from "@/lib/rewards/store";
import { sanitizeProfile, type ActiveSkin } from "@/lib/rewards/customization";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Emblem } from "@/components/progression/Emblem";
import { formatPoints } from "@/lib/progression/format";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

/** The rank each kind of look opens at — a real milestone, not a price. */
export const RANK_GATE: Record<ComponentKind, number> = {
  effect: 2,
  palette: 3,
  profileFrame: 4,
  theme: 5,
  wallpaper: 6,
};

const SLOTS: { slot: keyof ActiveSkin; kind: ComponentKind }[] = [
  { slot: "themeId", kind: "theme" },
  { slot: "paletteId", kind: "palette" },
  { slot: "wallpaperId", kind: "wallpaper" },
  { slot: "profileFrameId", kind: "profileFrame" },
  { slot: "effectId", kind: "effect" },
];

export function AtelierPage() {
  const progress = useProgression();
  const [store, setStore] = useState(() => loadRewardsStore());
  const [kind, setKind] = useState<ComponentKind>("theme");

  useEffect(() => subscribeRewards(() => setStore(loadRewardsStore())), []);

  const equipped = useMemo(() => sanitizeProfile(store.equipped), [store.equipped]);
  const owned = useMemo(() => ownedIds(store), [store]);
  const tier = progress.rank.rank.tier;
  const wallpaper = equipped.wallpaperId ? componentsById.get(equipped.wallpaperId) : null;

  const looks = useMemo(
    () => CATALOG.components.filter((c) => c.kind === kind),
    [kind],
  );

  const equippedName = (slot: keyof ActiveSkin) => {
    const id = equipped[slot];
    const comp = id ? componentsById.get(id) : null;
    return comp?.title ?? "Bloom default";
  };

  const nothingEquipped = SLOTS.every((s) => !equipped[s.slot]);

  return (
    <div className="pg-page app-shell relative min-h-screen bg-background text-foreground">
      <AppNav />
      <div className="pg-sky" aria-hidden>
        <span className="pg-sky-wall" />
        <span className="pg-sky-orb pg-sky-orb-a" />
        <span className="pg-sky-orb pg-sky-orb-b" />
        <span className="pg-sky-orb pg-sky-orb-c" />
      </div>

      <main className="pg-main">
        <div className="pg-atelier-hero">
          <div className="pg-hero-copy">
            <Link to="/rewards" className="pg-link" style={{ marginBottom: "0.6rem" }}>
              <ArrowLeft width={13} height={13} aria-hidden /> Back to your journey
            </Link>
            <p className="pg-eyebrow">
              <span className="pg-eyebrow-rule" aria-hidden />
              Your Bloom Atelier
            </p>
            <h1 className="pg-title" style={{ fontSize: "clamp(30px, 4.4vw, 44px)" }}>
              {progress.rank.rank.name}
            </h1>
            <p className="pg-hero-note">
              Looks open with ranks — you are rank {tier}, and every look you already owned stays
              yours. This is the quiet second layer of the journey, not the point of it.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <span className="pg-to-next" style={{ padding: "0.6rem 1rem" }}>
              <Emblem id={progress.rank.rank.emblem} size={16} strokeWidth={1.6} />
              {formatPoints(progress.points)} points
            </span>
            <button
              type="button"
              className="pg-btn pg-btn-quiet"
              onClick={() => {
                resetEquipped();
                setStore(loadRewardsStore());
              }}
            >
              <RotateCcw width={13} height={13} aria-hidden /> Bloom default
            </button>
          </div>
        </div>

        <div className="pg-studio">
          <div className="pg-stage">
            <span
              className="pg-stage-wall"
              style={wallpaper?.art ? { backgroundImage: `url("${wallpaper.art}")` } : undefined}
              aria-hidden
            />
            <ProfileAvatar
              name="You"
              avatarPath={null}
              size={86}
              overrideFrame={equipped.profileFrameId ?? null}
            />
            <p className="pg-look-meta">{nothingEquipped ? "Bloom default" : "Currently equipped"}</p>
            <div className="pg-slot-list">
              {SLOTS.map(({ slot, kind: slotKind }) => {
                const id = equipped[slot];
                const comp = id ? componentsById.get(id) : null;
                const locked = tier < RANK_GATE[slotKind] && !(id && owned.has(id));
                return (
                  <div key={slot} className="pg-slot" data-locked={locked ? "true" : "false"}>
                    <span className="pg-slot-kind">{COMPONENT_KIND_LABELS[slotKind]}</span>
                    <span className="pg-slot-value">{comp ? comp.title : equippedName(slot)}</span>
                    {locked ? (
                      <span className="pg-lock-note">
                        <Lock width={11} height={11} aria-hidden /> Rank {RANK_GATE[slotKind]}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="pg-btn pg-btn-quiet"
                        style={{ padding: "0.35rem 0.8rem" }}
                        onClick={() => setKind(slotKind)}
                      >
                        {comp ? "Change" : "Choose"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="pg-chip-row" role="group" aria-label="Choose what to change">
              {SLOTS.map(({ kind: slotKind }) => (
                <button
                  key={slotKind}
                  type="button"
                  className={cn("pg-chip", kind === slotKind && "is-on")}
                  aria-pressed={kind === slotKind}
                  onClick={() => setKind(slotKind)}
                >
                  {COMPONENT_KIND_LABELS[slotKind]}
                  <span className="pg-chip-count">{tier >= RANK_GATE[slotKind] ? "open" : `rank ${RANK_GATE[slotKind]}`}</span>
                </button>
              ))}
            </div>

            <div className="pg-shelf-grid">
              {looks.map((comp) => {
                const isOwned = owned.has(comp.id);
                const unlocked = isOwned || tier >= RANK_GATE[comp.kind];
                const slot = SLOTS.find((s) => s.kind === comp.kind)?.slot;
                const isEquipped = slot ? equipped[slot] === comp.id : false;
                return (
                  <div key={comp.id} className="pg-look" data-locked={unlocked ? "false" : "true"}>
                    <span className="pg-look-art">
                      {comp.art ? <img src={comp.art} alt="" loading="lazy" /> : null}
                      <span
                        className="pg-look-tone"
                        style={{ background: comp.tone, opacity: comp.art ? 0.22 : 0.5 }}
                        aria-hidden
                      />
                    </span>
                    <span className="pg-look-title">{comp.title}</span>
                    <span className="pg-look-meta">{comp.intent}</span>
                    {unlocked ? (
                      isEquipped ? (
                        <span className="pg-complete-row">
                          <Check width={12} height={12} aria-hidden /> Equipped
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="pg-btn pg-btn-quiet"
                          onClick={() => {
                            if (!slot) return;
                            setEquipped({ [slot]: comp.id });
                            setStore(loadRewardsStore());
                          }}
                        >
                          Use this look
                        </button>
                      )
                    ) : (
                      <span className="pg-lock-note">
                        <Lock width={11} height={11} aria-hidden /> Opens at rank{" "}
                        {RANK_GATE[comp.kind]} — {formatPoints(RANK_GATE[comp.kind] * 500)} points
                        onward
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="pg-goal-note" style={{ marginTop: "1.2rem" }}>
              Effects and palettes open first because they change the least; themes and wallpapers
              come later. None of them are required to use Bloom.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
