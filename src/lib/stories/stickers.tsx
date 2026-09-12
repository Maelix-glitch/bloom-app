/**
 * Instagram-exact sticker library — emoji + text based, no ugly Bloom SVGs.
 * Clean, minimal, Instagram aesthetic.
 */

import { useEffect, useState } from "react";

export type StickerCategory =
  | "trending"
  | "love"
  | "happy"
  | "mood"
  | "celebrate"
  | "chill"
  | "cute"
  | "aesthetic";

export const STICKER_CATEGORIES: { id: StickerCategory; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "love", label: "Love" },
  { id: "happy", label: "Happy" },
  { id: "mood", label: "Mood" },
  { id: "celebrate", label: "Celebrate" },
  { id: "chill", label: "Chill" },
  { id: "cute", label: "Cute" },
  { id: "aesthetic", label: "Aesthetic" },
];

export interface StickerDef {
  id: string;
  name: string;
  category: StickerCategory;
  tags: string[];
  animated?: boolean | undefined;
  art: React.ReactNode;
}

function Emoji({ children, size = 36 }: { children: string; size?: number }) {
  return (
    <span
      style={{ fontSize: size, lineHeight: 1 }}
      className="select-none"
      role="img"
      aria-hidden
    >
      {children}
    </span>
  );
}

const ART: Record<string, React.ReactNode> = {
  // trending
  "ig.heart": <Emoji>❤️</Emoji>,
  "ig.fire": <Emoji>🔥</Emoji>,
  "ig.sparkle": <Emoji>✨</Emoji>,
  "ig.star": <Emoji>⭐</Emoji>,
  "ig.100": <Emoji>💯</Emoji>,
  "ig.clap": <Emoji>👏</Emoji>,
  "ig.eyes": <Emoji>👀</Emoji>,
  "ig.love-eyes": <Emoji>😍</Emoji>,
  "ig.laugh": <Emoji>😂</Emoji>,
  "ig.wow": <Emoji>😮</Emoji>,
  "ig.cry": <Emoji>😢</Emoji>,
  "ig.party": <Emoji>🎉</Emoji>,
  // love
  "ig.heart2": <Emoji>💖</Emoji>,
  "ig.heart3": <Emoji>💗</Emoji>,
  "ig.heart4": <Emoji>💓</Emoji>,
  "ig.kiss": <Emoji>💋</Emoji>,
  "ig.rose": <Emoji>🌹</Emoji>,
  "ig.tulip": <Emoji>🌷</Emoji>,
  "ig.butterfly": <Emoji>🦋</Emoji>,
  "ig.dove": <Emoji>🕊️</Emoji>,
  "ig.cupid": <Emoji>💘</Emoji>,
  "ig.hug": <Emoji>🫂</Emoji>,
  // happy
  "ig.smile": <Emoji>😊</Emoji>,
  "ig.happy": <Emoji>🥰</Emoji>,
  "ig.sun": <Emoji>☀️</Emoji>,
  "ig.rainbow": <Emoji>🌈</Emoji>,
  "ig.sunflower": <Emoji>🌻</Emoji>,
  "ig.cherry": <Emoji>🍒</Emoji>,
  "ig.peach": <Emoji>🍑</Emoji>,
  "ig.honey": <Emoji>🍯</Emoji>,
  // mood
  "ig.moon": <Emoji>🌙</Emoji>,
  "ig.cloud": <Emoji>☁️</Emoji>,
  "ig.thinking": <Emoji>🤔</Emoji>,
  "ig.sleep": <Emoji>😴</Emoji>,
  "ig.tired": <Emoji>🥱</Emoji>,
  "ig.angel": <Emoji>😇</Emoji>,
  "ig.devil": <Emoji>😈</Emoji>,
  "ig.ghost": <Emoji>👻</Emoji>,
  // celebrate
  "ig.balloons": <Emoji>🎈</Emoji>,
  "ig.confetti": <Emoji>🎊</Emoji>,
  "ig.cake": <Emoji>🎂</Emoji>,
  "ig.champagne": <Emoji>🍾</Emoji>,
  "ig.gift": <Emoji>🎁</Emoji>,
  "ig.trophy": <Emoji>🏆</Emoji>,
  "ig.medal": <Emoji>🥇</Emoji>,
  "ig.crown": <Emoji>👑</Emoji>,
  // chill
  "ig.palm": <Emoji>🌴</Emoji>,
  "ig.beach": <Emoji>🏖️</Emoji>,
  "ig.wave": <Emoji>🌊</Emoji>,
  "ig.coffee": <Emoji>☕</Emoji>,
  "ig.music": <Emoji>🎧</Emoji>,
  "ig.headphone": <Emoji>🎶</Emoji>,
  "ig.book": <Emoji>📚</Emoji>,
  "ig.plant": <Emoji>🌿</Emoji>,
  // cute
  "ig.bear": <Emoji>🧸</Emoji>,
  "ig.cat": <Emoji>🐱</Emoji>,
  "ig.dog": <Emoji>🐶</Emoji>,
  "ig.bunny": <Emoji>🐰</Emoji>,
  "ig.panda": <Emoji>🐼</Emoji>,
  "ig.unicorn": <Emoji>🦄</Emoji>,
  "ig.chick": <Emoji>🐣</Emoji>,
  "ig.cookie": <Emoji>🍪</Emoji>,
  // aesthetic
  "ig.crystal": <Emoji>🔮</Emoji>,
  "ig.diamond": <Emoji>💎</Emoji>,
  "ig.pearl": <Emoji>🫧</Emoji>,
  "ig.leaf": <Emoji>🍃</Emoji>,
  "ig.mushroom": <Emoji>🍄</Emoji>,
  "ig.cactus": <Emoji>🌵</Emoji>,
  "ig.flower": <Emoji>🌸</Emoji>,
  "ig.bloom": <Emoji>🌺</Emoji>,
};

interface StickerMeta {
  name: string;
  category: StickerCategory;
  tags: string[];
  animated?: boolean | undefined;
}

const META: Record<string, StickerMeta> = {
  "ig.heart": { name: "Heart", category: "trending", tags: ["heart", "love"] },
  "ig.fire": { name: "Fire", category: "trending", tags: ["fire", "hot", "lit"] },
  "ig.sparkle": { name: "Sparkle", category: "trending", tags: ["sparkle", "shine", "magic"] },
  "ig.star": { name: "Star", category: "trending", tags: ["star", "fav"] },
  "ig.100": { name: "100", category: "trending", tags: ["100", "perfect", "score"] },
  "ig.clap": { name: "Clap", category: "trending", tags: ["clap", "bravo"] },
  "ig.eyes": { name: "Eyes", category: "trending", tags: ["eyes", "look"] },
  "ig.love-eyes": { name: "Love eyes", category: "trending", tags: ["love", "eyes", "crush"] },
  "ig.laugh": { name: "Laugh", category: "trending", tags: ["laugh", "funny", "lol"] },
  "ig.wow": { name: "Wow", category: "trending", tags: ["wow", "omg", "shock"] },
  "ig.cry": { name: "Cry", category: "trending", tags: ["cry", "sad", "tear"] },
  "ig.party": { name: "Party", category: "trending", tags: ["party", "celebrate"] },

  "ig.heart2": { name: "Pink heart", category: "love", tags: ["heart", "love", "pink"] },
  "ig.heart3": { name: "Growing heart", category: "love", tags: ["heart", "love", "grow"] },
  "ig.heart4": { name: "Beating heart", category: "love", tags: ["heart", "love", "beat"] },
  "ig.kiss": { name: "Kiss", category: "love", tags: ["kiss", "love", "lips"] },
  "ig.rose": { name: "Rose", category: "love", tags: ["rose", "flower", "love"] },
  "ig.tulip": { name: "Tulip", category: "love", tags: ["tulip", "flower", "spring"] },
  "ig.butterfly": { name: "Butterfly", category: "love", tags: ["butterfly", "flutter", "pretty"] },
  "ig.dove": { name: "Dove", category: "love", tags: ["dove", "peace", "bird"] },
  "ig.cupid": { name: "Cupid", category: "love", tags: ["cupid", "love", "arrow"] },
  "ig.hug": { name: "Hug", category: "love", tags: ["hug", "embrace", "love"] },

  "ig.smile": { name: "Smile", category: "happy", tags: ["smile", "happy", "joy"] },
  "ig.happy": { name: "Happy", category: "happy", tags: ["happy", "love", "blush"] },
  "ig.sun": { name: "Sun", category: "happy", tags: ["sun", "sunny", "bright"] },
  "ig.rainbow": { name: "Rainbow", category: "happy", tags: ["rainbow", "color", "pride"] },
  "ig.sunflower": { name: "Sunflower", category: "happy", tags: ["sunflower", "flower", "yellow"] },
  "ig.cherry": { name: "Cherry", category: "happy", tags: ["cherry", "fruit", "cute"] },
  "ig.peach": { name: "Peach", category: "happy", tags: ["peach", "fruit", "cute"] },
  "ig.honey": { name: "Honey", category: "happy", tags: ["honey", "sweet", "pot"] },

  "ig.moon": { name: "Moon", category: "mood", tags: ["moon", "night", "sleep"] },
  "ig.cloud": { name: "Cloud", category: "mood", tags: ["cloud", "sky", "soft"] },
  "ig.thinking": { name: "Thinking", category: "mood", tags: ["thinking", "hmm"] },
  "ig.sleep": { name: "Sleep", category: "mood", tags: ["sleep", "zzz", "tired"] },
  "ig.tired": { name: "Tired", category: "mood", tags: ["tired", "yawn"] },
  "ig.angel": { name: "Angel", category: "mood", tags: ["angel", "halo", "good"] },
  "ig.devil": { name: "Devil", category: "mood", tags: ["devil", "evil", "naughty"] },
  "ig.ghost": { name: "Ghost", category: "mood", tags: ["ghost", "spooky"] },

  "ig.balloons": { name: "Balloons", category: "celebrate", tags: ["balloon", "party"] },
  "ig.confetti": { name: "Confetti", category: "celebrate", tags: ["confetti", "party"] },
  "ig.cake": { name: "Cake", category: "celebrate", tags: ["cake", "birthday"] },
  "ig.champagne": { name: "Champagne", category: "celebrate", tags: ["champagne", "cheers"] },
  "ig.gift": { name: "Gift", category: "celebrate", tags: ["gift", "present"] },
  "ig.trophy": { name: "Trophy", category: "celebrate", tags: ["trophy", "win"] },
  "ig.medal": { name: "Medal", category: "celebrate", tags: ["medal", "gold"] },
  "ig.crown": { name: "Crown", category: "celebrate", tags: ["crown", "queen", "king"] },

  "ig.palm": { name: "Palm", category: "chill", tags: ["palm", "beach", "tropical"] },
  "ig.beach": { name: "Beach", category: "chill", tags: ["beach", "vacation"] },
  "ig.wave": { name: "Wave", category: "chill", tags: ["wave", "ocean", "sea"] },
  "ig.coffee": { name: "Coffee", category: "chill", tags: ["coffee", "cafe", "morning"] },
  "ig.music": { name: "Music", category: "chill", tags: ["music", "headphone"] },
  "ig.headphone": { name: "Notes", category: "chill", tags: ["music", "notes", "song"] },
  "ig.book": { name: "Book", category: "chill", tags: ["book", "read", "study"] },
  "ig.plant": { name: "Plant", category: "chill", tags: ["plant", "leaf", "green"] },

  "ig.bear": { name: "Bear", category: "cute", tags: ["bear", "teddy", "cute"] },
  "ig.cat": { name: "Cat", category: "cute", tags: ["cat", "kitty", "meow"] },
  "ig.dog": { name: "Dog", category: "cute", tags: ["dog", "puppy", "woof"] },
  "ig.bunny": { name: "Bunny", category: "cute", tags: ["bunny", "rabbit", "cute"] },
  "ig.panda": { name: "Panda", category: "cute", tags: ["panda", "bear", "cute"] },
  "ig.unicorn": { name: "Unicorn", category: "cute", tags: ["unicorn", "magic", "cute"] },
  "ig.chick": { name: "Chick", category: "cute", tags: ["chick", "baby", "cute"] },
  "ig.cookie": { name: "Cookie", category: "cute", tags: ["cookie", "sweet", "yum"] },

  "ig.crystal": { name: "Crystal", category: "aesthetic", tags: ["crystal", "ball", "magic"] },
  "ig.diamond": { name: "Diamond", category: "aesthetic", tags: ["diamond", "gem", "rich"] },
  "ig.pearl": { name: "Bubbles", category: "aesthetic", tags: ["bubble", "pearl", "aesthetic"] },
  "ig.leaf": { name: "Leaf", category: "aesthetic", tags: ["leaf", "nature", "green"] },
  "ig.mushroom": { name: "Mushroom", category: "aesthetic", tags: ["mushroom", "fungi", "cottage"] },
  "ig.cactus": { name: "Cactus", category: "aesthetic", tags: ["cactus", "desert", "plant"] },
  "ig.flower": { name: "Flower", category: "aesthetic", tags: ["flower", "blossom", "pink"] },
  "ig.bloom": { name: "Bloom", category: "aesthetic", tags: ["bloom", "flower", "hibiscus"] },
};

export const STICKER_LIST: StickerDef[] = Object.keys(ART).map((id) => ({
  id,
  name: META[id]?.name ?? id,
  category: META[id]?.category ?? "trending",
  tags: META[id]?.tags ?? [],
  animated: META[id]?.animated,
  art: ART[id],
}));

const BY_ID = new Map(STICKER_LIST.map((s) => [s.id, s]));

export function stickerById(id: string | null | undefined): StickerDef | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function searchStickers(query: string, limit = 24): StickerDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const scored: { def: StickerDef; score: number }[] = [];
  for (const def of STICKER_LIST) {
    let score = 0;
    const hay = `${def.name} ${def.tags.join(" ")}`.toLowerCase();
    for (const t of terms) {
      if (def.name.toLowerCase().startsWith(t)) score += 3;
      else if (def.tags.some((tag) => tag.startsWith(t))) score += 2;
      else if (hay.includes(t)) score += 1;
      else {
        score = 0;
        break;
      }
    }
    if (score > 0) scored.push({ def, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.def);
}

export function stickersByCategory(category: StickerCategory): StickerDef[] {
  return STICKER_LIST.filter((s) => s.category === category);
}

/* recents + favorites */

const RECENTS_KEY = "bloom.stickers.recents.v2";
const FAVORITES_KEY = "bloom.stickers.favorites.v2";
const MAX_RECENTS = 12;

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === "string" && BY_ID.has(v)) : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(ids.slice(0, 48)));
  } catch {}
}

export function recordStickerUse(id: string): void {
  if (!BY_ID.has(id)) return;
  const next = [id, ...readIds(RECENTS_KEY).filter((x) => x !== id)].slice(0, MAX_RECENTS);
  writeIds(RECENTS_KEY, next);
  window.dispatchEvent(new CustomEvent("bloom:stickers-changed"));
}

export function toggleStickerFavorite(id: string): boolean {
  const favs = readIds(FAVORITES_KEY);
  const next = favs.includes(id) ? favs.filter((x) => x !== id) : [id, ...favs];
  writeIds(FAVORITES_KEY, next);
  window.dispatchEvent(new CustomEvent("bloom:stickers-changed"));
  return next.includes(id);
}

export function useStickerMemory(): { recents: StickerDef[]; favorites: Set<string> } {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("bloom:stickers-changed", onChange);
    return () => window.removeEventListener("bloom:stickers-changed", onChange);
  }, []);
  void tick;
  const recents = readIds(RECENTS_KEY)
    .map((id) => BY_ID.get(id))
    .filter((s): s is StickerDef => Boolean(s));
  return { recents, favorites: new Set(readIds(FAVORITES_KEY)) };
}

export function StickerArt({
  id,
  size = 36,
  className,
  style,
}: {
  id: string;
  size?: number;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}) {
  const def = stickerById(id);
  if (!def) return null;
  return (
    <span
      className={className}
      data-sticker-animated={def.animated ? "true" : undefined}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        fontSize: size,
        lineHeight: 1,
        ...style,
      }}
    >
      {def.art}
    </span>
  );
}
