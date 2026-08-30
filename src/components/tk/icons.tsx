/**
 * One mark per tracker — the kind you'd recognise on a sign, not a UI library
 * icon set. Most come from lucide like the rest of the app; sleep and water are
 * drawn here because lucide has no bed-with-a-z and no water bottle.
 */

import {
  BookOpen,
  Footprints,
  MonitorSmartphone,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { TrackerId } from "@/lib/trackers/core";

const BASE = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** A bed with a z drifting off it. */
function SleepIcon(props: { size?: number }) {
  return (
    <svg {...BASE} width={props.size ?? 24} height={props.size ?? 24}>
      <path d="M3 6v14" />
      <path d="M3 12h13a4 4 0 0 1 4 4v4" />
      <path d="M3 20h18" />
      <path d="M7 12v-2.5A1.5 1.5 0 0 1 8.5 8H13" />
      <path d="M17 3h3.5L17 7.5h3.5" />
    </svg>
  );
}

/** A bottle with water in it. */
function WaterIcon(props: { size?: number }) {
  return (
    <svg {...BASE} width={props.size ?? 24} height={props.size ?? 24}>
      <rect x="9.5" y="2" width="5" height="2.8" rx="1" />
      <path d="M10 4.8v2.4" />
      <path d="M8 7.2h8a2.2 2.2 0 0 1 2.2 2.2v9.4A2.2 2.2 0 0 1 16 21H8a2.2 2.2 0 0 1-2.2-2.2V9.4A2.2 2.2 0 0 1 8 7.2Z" />
      <path d="M5.8 13.5h12.4" />
    </svg>
  );
}

const LUCIDE: Partial<Record<TrackerId, LucideIcon>> = {
  study: BookOpen,
  movement: Footprints,
  energy: Zap,
  screen: MonitorSmartphone,
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
  className,
}: {
  id: TrackerId;
  size?: number;
  className?: string;
}) {
  if (id === "sleep") return <SleepIcon size={size} />;
  if (id === "water") return <WaterIcon size={size} />;
  const Icon = LUCIDE[id];
  if (!Icon) return null;
  return <Icon size={size} className={className} aria-hidden="true" />;
}

/** The same mark on a tinted tile, coloured by the tracker's accent. */
export function TrackerTile({ id, size = 15 }: { id: TrackerId; size?: number }) {
  return (
    <span
      className="tk-head__tile"
      style={{ ["--tk-accent" as string]: TRACKER_ACCENT[id] }}
    >
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
