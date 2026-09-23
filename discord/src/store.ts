/**
 * A tiny JSON-file store. The Discord server is small enough that one file,
 * written atomically, is honest and sufficient — no database to provision.
 *
 * Only what the garden itself observed is stored: which days a member checked
 * in, which feeling they tapped, and counts of joins/entries/leaves. Notes
 * typed in a check-in are posted to the channel, never stored here.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface MemberRecord {
  days: string[];
  /** Highest rank key already announced, so a rank-up is only posted once. */
  rank?: string;
  /** Highest streak milestone already announced for the current run. */
  milestone?: number;
}

export interface DayRecord {
  checkins: number;
  entered: number;
  joined: number;
  left: number;
  feelings: Record<string, number>;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  /** Day key (inclusive). */
  ends: string;
  channelId: string;
  messageId: string;
  participants: string[];
}

export interface StoreData {
  members: Record<string, MemberRecord>;
  days: Record<string, DayRecord>;
  /** World-message id → where setup posted it. */
  posted: Record<string, { channelId: string; messageId: string }>;
  challenges: Record<string, Challenge>;
  /** World channel name → Discord id, and role key → Discord id (written by setup). */
  channels: Record<string, string>;
  roles: Record<string, string>;
  /** Last midnight-bloom state the bot applied, and the digest day already sent. */
  midnightOpen?: boolean;
  lastDigest?: string;
}

const empty = (): StoreData => ({ members: {}, days: {}, posted: {}, challenges: {}, channels: {}, roles: {} });

export class Store {
  readonly data: StoreData;
  private readonly path: string;
  constructor(path: string) {
    this.path = path;
    try {
      this.data = { ...empty(), ...(JSON.parse(readFileSync(path, "utf8")) as Partial<StoreData>) };
    } catch {
      this.data = empty();
    }
  }

  save(): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const tmp = `${this.path}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    renameSync(tmp, this.path);
  }

  member(id: string): MemberRecord {
    return (this.data.members[id] ??= { days: [] });
  }

  day(key: string): DayRecord {
    return (this.data.days[key] ??= { checkins: 0, entered: 0, joined: 0, left: 0, feelings: {} });
  }

  /** Records a check-in. Returns false if the member already checked in that day. */
  checkIn(userId: string, day: string, feelingKey: string): boolean {
    const m = this.member(userId);
    if (m.days.includes(day)) return false;
    m.days.push(day);
    const d = this.day(day);
    d.checkins += 1;
    d.feelings[feelingKey] = (d.feelings[feelingKey] ?? 0) + 1;
    this.save();
    return true;
  }

  bump(day: string, field: "entered" | "joined" | "left"): void {
    this.day(day)[field] += 1;
    this.save();
  }

  /** Total check-ins across a set of day keys. */
  checkinsOn(days: readonly string[]): number {
    return days.reduce((n, d) => n + (this.data.days[d]?.checkins ?? 0), 0);
  }

  /** Distinct members who checked in on any of `days`. */
  gardenersOn(days: readonly string[]): number {
    const set = new Set(days);
    return Object.values(this.data.members).filter((m) => m.days.some((d) => set.has(d))).length;
  }
}
