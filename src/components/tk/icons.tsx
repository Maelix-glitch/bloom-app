/**
 * One mark per tracker — the kind you'd recognise on a sign, not a UI library
 * icon set. Sleep and water were originally drawn here because lucide has no
 * bed-with-a-z and no water bottle; since U4 all six marks live in the
 * bespoke registry (`src/components/icons/`), drawn to the same spec this
 * file set: 24-grid, stroke 1.6, round caps. This module keeps the
 * tracker-specific surface — accent colours and the tinted tile.
 */

import type { LucideIcon } from "lucide-react";

import { BloomIcon, type BloomIconName } from "@/components/icons/BloomIcon";
import type { TrackerId } from "@/lib/trackers/core";

/** Every TrackerId is a registry glyph of the same name. */
const GLYPH: Record<TrackerId, BloomIconName> = {
  sleep: "sleep",
  water: "water",
  study: "study",
  movement: "movement",
  energy: "energy",
  screen: "screen",
};

export const TRACKER_ACCENT: Record<TrackerId, string> = {
  sleep: "var(--tk-sleep)",
  water: "var(--tk-water)",
  study: "var(--tk-study)",
  movement: "var(--tk-movement)",
  energy: "var(--tk-energy)",
  screen: "var(--tk-screen)",
};

export function TrackerIcon({
  id,
  size = 15,
}: {
  id: TrackerId;
  size?: number;
  className?: string;
}) {
  return <BloomIcon name={GLYPH[id]} size={size} />;
}

/** The same mark on a tinted tile, coloured by the tracker's accent. */
export function TrackerTile({ id, size = 15 }: { id: TrackerId; size?: number }) {
  return (
    <span className="tk-head__tile" style={{ ["--tk-accent" as string]: TRACKER_ACCENT[id] }}>
      <TrackerIcon id={id} size={size} />
    </span>
  );
}

export default TrackerIcon;

/** A tile for the heads that aren't one of the six — observations, links, history. */
export function Tile({
  icon: Icon,
  accent,
  size = 15,
}: {
  icon: LucideIcon;
  accent: string;
  size?: number;
}) {
  return (
    <span className="tk-head__tile" style={{ ["--tk-accent" as string]: accent }}>
      <Icon size={size} aria-hidden="true" />
    </span>
  );
}
