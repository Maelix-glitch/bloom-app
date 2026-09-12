/**
 * EffectsTray — Instagram-exact Effects (AR face filters).
 * Dark #121212, handle, search, pills, 3-col grid with girl preview image + effect.
 * 200+ effects, 12 diverse girl faces, like IG: effects have creator name, try button, save.
 */

import { useMemo, useState } from "react";
import { Search, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EffectItem {
  id: string;
  name: string;
  creator: string;
  category: "trending" | "appearance" | "aesthetic" | "fun" | "world";
  preview: string;
  color: string;
  css: string;
  overlay?: string;
}

const PREVIEW_IMAGES = [
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1512310604669-443f26c35f52?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face"

];

function getPreviewImage(id: string): string {
  const hash = id.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return PREVIEW_IMAGES[Math.abs(hash) % PREVIEW_IMAGES.length]!;
}

const EFFECTS: EffectItem[] = [
  { id: "rose-glare-100", name: "Rose Glare", creator: "evelyn", category: "trending", preview: "🌊", color: "#feda75", css: "contrast(0.96) saturate(1.51) brightness(1.1) sepia(0.31) hue-rotate(-20deg)", overlay: "none" },
  { id: "sunset-flash-101", name: "Sunset Flash", creator: "leah", category: "appearance", preview: "🎭", color: "#feca57", css: "contrast(0.86) saturate(0.92) brightness(1.09) sepia(0.19) hue-rotate(-11deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "muted-glow-102", name: "Muted Glow", creator: "lily", category: "appearance", preview: "🍑", color: "#feca57", css: "contrast(0.99) saturate(0.94) brightness(1.13) blur(0.5px)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "pastel-forest-103", name: "Pastel Forest", creator: "savannah", category: "fun", preview: "🦋", color: "#ff9ff3", css: "contrast(1.34) saturate(1.12) brightness(1.07) sepia(0.29) hue-rotate(14deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "prism-clay-104", name: "Prism Clay", creator: "zara", category: "trending", preview: "🍃", color: "#ffffff", css: "contrast(0.96) saturate(1.02) brightness(0.92) sepia(0.08) hue-rotate(-19deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "cool-kiss-105", name: "Cool Kiss", creator: "grace", category: "appearance", preview: "🍒", color: "#ff3040", css: "contrast(0.95) saturate(0.99) brightness(1.18) sepia(0.23) hue-rotate(13deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "moon-dream-106", name: "Moon Dream", creator: "chloe", category: "fun", preview: "❄️", color: "#48dbfb", css: "contrast(1.34) saturate(1.4) brightness(1.07) sepia(0.24) hue-rotate(24deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "neon-bulb-107", name: "Neon Bulb", creator: "riley", category: "aesthetic", preview: "❄️", color: "#ffffff", css: "contrast(0.88) saturate(1.7) brightness(1.07) sepia(0.25) hue-rotate(-12deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "satin-fog-108", name: "Satin Fog", creator: "kendall", category: "aesthetic", preview: "🌊", color: "#d62976", css: "contrast(1.22) saturate(1.29) brightness(1.12) sepia(0.15) hue-rotate(12deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "electric-sunset-109", name: "Electric Sunset", creator: "maya", category: "trending", preview: "🧡", color: "#a8edea", css: "contrast(0.9) saturate(1.39) brightness(1.14) sepia(0.15) hue-rotate(-21deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "sun-glass-110", name: "Sun Glass", creator: "naomi", category: "trending", preview: "🖤", color: "#feda75", css: "contrast(0.91) saturate(1.67) brightness(1.13) sepia(0.27) hue-rotate(-4deg) blur(0.3px)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "glitter-wood-111", name: "Glitter Wood", creator: "leah", category: "aesthetic", preview: "🤎", color: "#d62976", css: "contrast(0.94) saturate(1.7) brightness(1.16) sepia(0.1) hue-rotate(15deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "dawn-city-112", name: "Dawn City", creator: "audrey", category: "appearance", preview: "🧡", color: "#8e8e8e", css: "contrast(1.31) saturate(1.71) brightness(1.08) sepia(0.17) hue-rotate(-18deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "glossy-tint-113", name: "Glossy Tint", creator: "bella", category: "world", preview: "😍", color: "#d62976", css: "contrast(1.22) saturate(1.6) brightness(1.19) sepia(0.19) hue-rotate(-17deg) blur(0.3px)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "cloud-pearl-114", name: "Cloud Pearl", creator: "lily", category: "world", preview: "🌸", color: "#f5c6a0", css: "contrast(1.31) saturate(1.53) brightness(1.11) sepia(0.25)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "cosmic-sun-115", name: "Cosmic Sun", creator: "valentina", category: "trending", preview: "🚀", color: "#fa7e1e", css: "contrast(0.88) saturate(0.72) brightness(1.07) sepia(0.21) hue-rotate(-25deg) blur(0.4px)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "neon-effect-116", name: "Neon Effect", creator: "hazel", category: "trending", preview: "🌊", color: "#feca57", css: "contrast(0.99) saturate(1.23) brightness(1.06) sepia(0.25) hue-rotate(11deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "clay-bulb-117", name: "Clay Bulb", creator: "addison", category: "fun", preview: "✿", color: "#feda75", css: "contrast(0.9) saturate(1.17) brightness(1.03) sepia(0.16) hue-rotate(21deg) blur(0.4px)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "candy-forest-118", name: "Candy Forest", creator: "mia", category: "aesthetic", preview: "🌊", color: "#f5c6a0", css: "contrast(0.95) saturate(1.29) brightness(0.94) sepia(0.06) hue-rotate(4deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "bright-glass-119", name: "Bright Glass", creator: "maya", category: "trending", preview: "🌷", color: "#f5c6a0", css: "contrast(1.35) saturate(1.62) brightness(1.19) sepia(0.32) hue-rotate(-10deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "blur-chill-120", name: "Blur Chill", creator: "billie", category: "trending", preview: "🦄", color: "#ffffff", css: "contrast(0.85) saturate(1.13) brightness(1.18) sepia(0.27) hue-rotate(-7deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "mirror-sunrise-121", name: "Mirror Sunrise", creator: "addison", category: "appearance", preview: "💖", color: "#48dbfb", css: "contrast(0.96) saturate(0.76) brightness(1.12) hue-rotate(-5deg) blur(0.4px)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "galactic-dream-122", name: "Galactic Dream", creator: "hazel", category: "trending", preview: "😍", color: "#ff9ff3", css: "contrast(1.28) saturate(0.78) brightness(0.92) sepia(0.3) blur(0.5px)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "moss-blur-123", name: "Moss Blur", creator: "bella", category: "world", preview: "🍭", color: "#ed4956", css: "contrast(1.18) saturate(1.32) brightness(0.99) sepia(0.09) hue-rotate(17deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "night-haze-124", name: "Night Haze", creator: "addison", category: "aesthetic", preview: "💎", color: "#a8edea", css: "contrast(1.31) saturate(1.73) brightness(0.9) sepia(0.22) hue-rotate(11deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "blur-dawn-125", name: "Blur Dawn", creator: "gigi", category: "aesthetic", preview: "🍒", color: "#feda75", css: "contrast(1.29) saturate(1.67) brightness(1.01) sepia(0.06) hue-rotate(9deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "paper-candle-126", name: "Paper Candle", creator: "elizabeth", category: "world", preview: "🍃", color: "#ed4956", css: "contrast(0.9) saturate(1.67) brightness(0.98) sepia(0.31) hue-rotate(22deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "sage-spark-127", name: "Sage Spark", creator: "dixie", category: "aesthetic", preview: "🪐", color: "#feda75", css: "contrast(1.17) saturate(0.99) brightness(1.05) sepia(0.32) hue-rotate(-22deg) blur(0.3px)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "soft-effect-128", name: "Soft Effect", creator: "emilia", category: "appearance", preview: "🔥", color: "#a8edea", css: "contrast(0.93) saturate(1.19) brightness(1.11) sepia(0.2) hue-rotate(-18deg) blur(0.5px)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "neon-beacon-129", name: "Neon Beacon", creator: "lucy", category: "aesthetic", preview: "🍓", color: "#0095f6", css: "contrast(0.92) saturate(0.84) brightness(0.99) sepia(0.31) hue-rotate(25deg)", overlay: "none" },
  { id: "glow-glitter-130", name: "Glow Glitter", creator: "willow", category: "appearance", preview: "✿", color: "#48dbfb", css: "contrast(1.03) saturate(1.32) brightness(1.16) sepia(0.34) hue-rotate(22deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "lofi-torch-131", name: "Lofi Torch", creator: "zoey", category: "appearance", preview: "🌅", color: "#ed4956", css: "contrast(0.94) saturate(1.72) brightness(1.13) sepia(0.14) hue-rotate(17deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "lofi-sign-132", name: "Lofi Sign", creator: "chloe", category: "trending", preview: "🧡", color: "#8e8e8e", css: "contrast(0.87) saturate(1.22) brightness(0.96) sepia(0.32)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "retro-chrome-133", name: "Retro Chrome", creator: "riley", category: "appearance", preview: "🍑", color: "#0095f6", css: "contrast(0.99) saturate(0.78) brightness(1.13) sepia(0.12) hue-rotate(7deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "retro-glare-134", name: "Retro Glare", creator: "olivia", category: "aesthetic", preview: "🎨", color: "#ff9ff3", css: "contrast(1.33) saturate(0.99) brightness(0.93) sepia(0.15) hue-rotate(21deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "electric-glare-135", name: "Electric Glare", creator: "skylar", category: "fun", preview: "👓", color: "#0095f6", css: "contrast(0.98) saturate(1.48) brightness(0.9) sepia(0.32) hue-rotate(9deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "berry-shadow-136", name: "Berry Shadow", creator: "nova", category: "aesthetic", preview: "💎", color: "#ff3040", css: "contrast(1.18) saturate(0.84) brightness(1.17) sepia(0.18) hue-rotate(17deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "caramel-glass-137", name: "Caramel Glass", creator: "addison", category: "appearance", preview: "🍭", color: "#48dbfb", css: "contrast(1.18) saturate(1.12) brightness(1.12) sepia(0.06) hue-rotate(11deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "soft-capture-138", name: "Soft Capture", creator: "dixie", category: "aesthetic", preview: "🎀", color: "#feca57", css: "contrast(1.24) saturate(1.37) brightness(1.0) sepia(0.15) hue-rotate(18deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "light-ocean-139", name: "Light Ocean", creator: "maya", category: "appearance", preview: "😍", color: "#8e8e8e", css: "contrast(0.99) saturate(1.43) brightness(1.09) hue-rotate(23deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "bright-flare-140", name: "Bright Flare", creator: "emma", category: "appearance", preview: "🌙", color: "#ff3040", css: "contrast(0.97) saturate(1.22) brightness(1.15)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "leather-flush-141", name: "Leather Flush", creator: "riley", category: "fun", preview: "🌊", color: "#d62976", css: "contrast(0.92) saturate(1.46) brightness(1.17) sepia(0.3) hue-rotate(-19deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "deep-sand-142", name: "Deep Sand", creator: "aubrey", category: "world", preview: "💫", color: "#ff9ff3", css: "contrast(1.13) saturate(1.71) brightness(0.94) hue-rotate(4deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "forest-mountain-143", name: "Forest Mountain", creator: "caroline", category: "fun", preview: "💚", color: "#f5c6a0", css: "contrast(1.21) saturate(1.26) brightness(1.15) sepia(0.19) hue-rotate(-15deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "cloud-mountain-144", name: "Cloud Mountain", creator: "emilia", category: "appearance", preview: "❄️", color: "#ed4956", css: "contrast(1.23) saturate(1.27) brightness(1.09) sepia(0.1) hue-rotate(-21deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "desert-feel-145", name: "Desert Feel", creator: "bella", category: "world", preview: "🌈", color: "#f5c6a0", css: "contrast(0.93) saturate(1.12) brightness(0.95) sepia(0.07)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "cherry-light-146", name: "Cherry Light", creator: "nora", category: "appearance", preview: "🦄", color: "#feda75", css: "contrast(1.3) saturate(1.34) brightness(1.11) sepia(0.3) hue-rotate(23deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "smoke-capture-147", name: "Smoke Capture", creator: "nora", category: "fun", preview: "💧", color: "#feda75", css: "contrast(1.22) saturate(1.3) brightness(1.08) sepia(0.08) hue-rotate(-11deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "noon-magic-148", name: "Noon Magic", creator: "billie", category: "fun", preview: "💛", color: "#fa7e1e", css: "contrast(1.08) saturate(0.84) brightness(1.09)", overlay: "none" },
  { id: "blush-storm-149", name: "Blush Storm", creator: "aubrey", category: "appearance", preview: "👑", color: "#feca57", css: "contrast(0.88) saturate(1.12) brightness(0.96) sepia(0.11) hue-rotate(23deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "cool-tide-150", name: "Cool Tide", creator: "bella", category: "aesthetic", preview: "☁️", color: "#feca57", css: "contrast(0.86) saturate(1.29) brightness(1.2) sepia(0.12) hue-rotate(16deg) blur(0.6px)", overlay: "none" },
  { id: "retro-tone-151", name: "Retro Tone", creator: "ari", category: "appearance", preview: "🪞", color: "#feca57", css: "contrast(0.93) saturate(0.84) brightness(1.1) sepia(0.2) hue-rotate(-12deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "dawn-memory-152", name: "Dawn Memory", creator: "anna", category: "world", preview: "🤍", color: "#4f5bd5", css: "contrast(1.21) saturate(1.56) brightness(0.95) sepia(0.11) hue-rotate(12deg) blur(0.3px)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "mirror-flare-153", name: "Mirror Flare", creator: "paisley", category: "trending", preview: "🌸", color: "#feca57", css: "contrast(1.27) saturate(0.97) brightness(1.11) sepia(0.11) hue-rotate(18deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "amber-sign-154", name: "Amber Sign", creator: "victoria", category: "trending", preview: "💧", color: "#4f5bd5", css: "contrast(1.06) saturate(1.11) brightness(1.05) sepia(0.12)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "mist-paint-155", name: "Mist Paint", creator: "hailey", category: "fun", preview: "🎀", color: "#4f5bd5", css: "contrast(0.94) saturate(1.27) brightness(1.1) sepia(0.22) hue-rotate(9deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "warm-forest-156", name: "Warm Forest", creator: "harper", category: "world", preview: "💎", color: "#0095f6", css: "contrast(1.28) saturate(1.61) brightness(0.93) sepia(0.31) hue-rotate(-10deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "retro-sunset-157", name: "Retro Sunset", creator: "charli", category: "aesthetic", preview: "🌞", color: "#feda75", css: "contrast(0.96) saturate(1.58) brightness(1.0) sepia(0.31) hue-rotate(19deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "cosmic-leak-158", name: "Cosmic Leak", creator: "sofia", category: "trending", preview: "🖤", color: "#fa7e1e", css: "contrast(1.05) saturate(1.31) brightness(0.97) sepia(0.17) hue-rotate(20deg)", overlay: "none" },
  { id: "caramel-gleam-159", name: "Caramel Gleam", creator: "valentina", category: "fun", preview: "🌟", color: "#ff3040", css: "contrast(1.18) saturate(1.11) brightness(1.07) sepia(0.12) hue-rotate(22deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "satin-fade-160", name: "Satin Fade", creator: "camila", category: "aesthetic", preview: "🚀", color: "#8e8e8e", css: "contrast(0.91) saturate(0.91) brightness(0.94) sepia(0.19) hue-rotate(23deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "metal-sky-161", name: "Metal Sky", creator: "paisley", category: "aesthetic", preview: "🤎", color: "#feda75", css: "contrast(1.11) saturate(1.01) brightness(0.93) sepia(0.07) hue-rotate(-11deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "glass-diamond-162", name: "Glass Diamond", creator: "evelyn", category: "appearance", preview: "🌙", color: "#ff9ff3", css: "contrast(1.34) saturate(1.31) brightness(1.11) hue-rotate(23deg)", overlay: "none" },
  { id: "honey-cloud-163", name: "Honey Cloud", creator: "hannah", category: "fun", preview: "🍑", color: "#ff9ff3", css: "contrast(0.94) saturate(0.76) brightness(1.18) sepia(0.17) hue-rotate(-21deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "lilac-glitter-164", name: "Lilac Glitter", creator: "hailey", category: "trending", preview: "👼", color: "#feca57", css: "contrast(1.26) saturate(1.74) brightness(0.93) sepia(0.09) hue-rotate(10deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "cosmic-blush-165", name: "Cosmic Blush", creator: "hannah", category: "fun", preview: "🌟", color: "#feca57", css: "contrast(1.28) saturate(1.79) brightness(0.99) sepia(0.22) hue-rotate(14deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "glow-ink-166", name: "Glow Ink", creator: "amelia", category: "appearance", preview: "🍃", color: "#ed4956", css: "contrast(0.89) saturate(0.96) brightness(1.07)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "neon-sheen-167", name: "Neon Sheen", creator: "abigail", category: "aesthetic", preview: "🌸", color: "#4f5bd5", css: "contrast(1.28) saturate(0.78) brightness(0.97) sepia(0.09) hue-rotate(25deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "bloom-crystal-168", name: "Bloom Crystal", creator: "kennedy", category: "appearance", preview: "👼", color: "#f5c6a0", css: "contrast(1.3) saturate(1.61) brightness(0.92) sepia(0.06) hue-rotate(-6deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "luxe-star-169", name: "Luxe Star", creator: "riley", category: "aesthetic", preview: "❄️", color: "#feda75", css: "contrast(1.1) saturate(1.24) brightness(0.92)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "sunset-sheen-170", name: "Sunset Sheen", creator: "paisley", category: "world", preview: "🌅", color: "#ffffff", css: "contrast(1.35) saturate(1.44) brightness(0.98) hue-rotate(23deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "cocoa-film-171", name: "Cocoa Film", creator: "lucy", category: "appearance", preview: "🎀", color: "#48dbfb", css: "contrast(1.17) saturate(1.24) brightness(0.93) sepia(0.12) hue-rotate(-4deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "lofi-effect-172", name: "Lofi Effect", creator: "zoe", category: "fun", preview: "💖", color: "#fa7e1e", css: "contrast(1.18) saturate(1.14) brightness(1.13) hue-rotate(-20deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "classic-chill-173", name: "Classic Chill", creator: "instagram", category: "world", preview: "🍃", color: "#feca57", css: "contrast(1.28) saturate(1.21) brightness(0.92) sepia(0.18) hue-rotate(14deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "moody-spark-174", name: "Moody Spark", creator: "brooklyn", category: "aesthetic", preview: "🌈", color: "#ff3040", css: "contrast(1.31) saturate(1.18) brightness(1.11) hue-rotate(15deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "lofi-look-175", name: "Lofi Look", creator: "bloom", category: "world", preview: "🍓", color: "#f5c6a0", css: "contrast(1.05) saturate(0.95) brightness(1.15) hue-rotate(-18deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "mirror-shot-176", name: "Mirror Shot", creator: "harper", category: "world", preview: "🍭", color: "#ff3040", css: "contrast(1.27) saturate(1.78) brightness(0.97) sepia(0.19)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "bold-mist-177", name: "Bold Mist", creator: "evelyn", category: "trending", preview: "🧡", color: "#48dbfb", css: "contrast(1.25) saturate(1.16) brightness(1.18) sepia(0.18) hue-rotate(-25deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "coral-satin-178", name: "Coral Satin", creator: "hailey", category: "fun", preview: "💅", color: "#ff3040", css: "contrast(1.12) saturate(1.08) brightness(1.07) sepia(0.19) hue-rotate(4deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "star-velvet-179", name: "Star Velvet", creator: "paris", category: "fun", preview: "❤️", color: "#f5c6a0", css: "contrast(1.24) saturate(0.75) brightness(1.12) sepia(0.25)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "neon-haze-180", name: "Neon Haze", creator: "paisley", category: "world", preview: "🍑", color: "#fa7e1e", css: "contrast(1.28) saturate(1.66) brightness(1.03) sepia(0.18) hue-rotate(4deg) blur(0.2px)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "clay-sign-181", name: "Clay Sign", creator: "scarlett", category: "aesthetic", preview: "🪞", color: "#ffffff", css: "contrast(1.2) saturate(1.41) brightness(1.16) sepia(0.3) hue-rotate(9deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "mirror-city-182", name: "Mirror City", creator: "audrey", category: "fun", preview: "🌙", color: "#fa7e1e", css: "contrast(1.16) saturate(0.96) brightness(1.11) sepia(0.1) hue-rotate(-11deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "modern-paint-183", name: "Modern Paint", creator: "hannah", category: "trending", preview: "😈", color: "#d62976", css: "contrast(1.2) saturate(1.69) brightness(0.91) sepia(0.28) hue-rotate(-7deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "moon-pearl-184", name: "Moon Pearl", creator: "claire", category: "fun", preview: "🪐", color: "#ff9ff3", css: "contrast(1.25) saturate(0.89) brightness(0.92) sepia(0.3) hue-rotate(14deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "grainy-sheen-185", name: "Grainy Sheen", creator: "emilia", category: "fun", preview: "🔥", color: "#fa7e1e", css: "contrast(1.08) saturate(1.43) brightness(1.17) sepia(0.16) hue-rotate(-7deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "cocoa-charm-186", name: "Cocoa Charm", creator: "elizabeth", category: "world", preview: "🫧", color: "#8e8e8e", css: "contrast(1.33) saturate(1.46) brightness(1.04) sepia(0.11)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "dusk-velvet-187", name: "Dusk Velvet", creator: "skylar", category: "aesthetic", preview: "💖", color: "#ff9ff3", css: "contrast(1.35) saturate(1.02) brightness(1.19) sepia(0.23) hue-rotate(-8deg) blur(0.5px)", overlay: "none" },
  { id: "plastic-sunset-188", name: "Plastic Sunset", creator: "paris", category: "aesthetic", preview: "🎭", color: "#ffffff", css: "contrast(1.25) saturate(0.94) brightness(0.96) sepia(0.09) hue-rotate(23deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "midnight-ink-189", name: "Midnight Ink", creator: "mila", category: "trending", preview: "💜", color: "#d62976", css: "contrast(1.07) saturate(1.34) brightness(1.12) hue-rotate(-7deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "aura-haze-190", name: "Aura Haze", creator: "luna", category: "world", preview: "⚡", color: "#ff3040", css: "contrast(1.1) saturate(1.0) brightness(0.95) sepia(0.32) hue-rotate(5deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "muted-magic-191", name: "Muted Magic", creator: "aubrey", category: "trending", preview: "📼", color: "#0095f6", css: "contrast(0.92) saturate(1.76) brightness(1.16) sepia(0.25)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "sunset-light-192", name: "Sunset Light", creator: "bloom", category: "fun", preview: "🔥", color: "#fa7e1e", css: "contrast(1.12) saturate(1.2) brightness(1.1) sepia(0.24) hue-rotate(12deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "cotton-sheen-193", name: "Cotton Sheen", creator: "emma", category: "fun", preview: "🪞", color: "#ff3040", css: "contrast(1.29) saturate(1.32) brightness(1.17) sepia(0.08) hue-rotate(-21deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "latte-neon-194", name: "Latte Neon", creator: "ava", category: "fun", preview: "🌈", color: "#4f5bd5", css: "contrast(0.87) saturate(0.74) brightness(1.2) hue-rotate(-10deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "satin-touch-195", name: "Satin Touch", creator: "nora", category: "world", preview: "🎨", color: "#feda75", css: "contrast(1.22) saturate(0.87) brightness(1.02) hue-rotate(6deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "denim-touch-196", name: "Denim Touch", creator: "hannah", category: "appearance", preview: "💅", color: "#feda75", css: "contrast(1.33) saturate(1.64) brightness(0.93) sepia(0.24) hue-rotate(9deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "night-film-197", name: "Night Film", creator: "lily", category: "appearance", preview: "❤️", color: "#feca57", css: "contrast(1.26) saturate(0.8) brightness(0.96) sepia(0.22) hue-rotate(-24deg) blur(0.3px)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "amber-spark-198", name: "Amber Spark", creator: "brooklyn", category: "trending", preview: "🌸", color: "#ed4956", css: "contrast(1.14) saturate(1.59) brightness(0.97) sepia(0.27) hue-rotate(25deg)", overlay: "none" },
  { id: "faded-fog-199", name: "Faded Fog", creator: "audrey", category: "appearance", preview: "🔥", color: "#ff9ff3", css: "contrast(1.25) saturate(0.82) brightness(1.16)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "ocean-vibe-200", name: "Ocean Vibe", creator: "amelia", category: "appearance", preview: "💫", color: "#ff9ff3", css: "contrast(0.91) saturate(1.16) brightness(0.93)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "aurora-sun-201", name: "Aurora Sun", creator: "beck", category: "world", preview: "🪞", color: "#feda75", css: "contrast(0.87) saturate(1.56) brightness(1.16) sepia(0.18) hue-rotate(4deg)", overlay: "none" },
  { id: "stone-chill-202", name: "Stone Chill", creator: "naomi", category: "fun", preview: "✿", color: "#ff3040", css: "contrast(1.1) saturate(1.7) brightness(0.92) hue-rotate(13deg) blur(0.2px)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "ocean-blush-203", name: "Ocean Blush", creator: "aurora", category: "world", preview: "💖", color: "#ff3040", css: "contrast(1.08) saturate(1.37) brightness(0.93) sepia(0.25) hue-rotate(16deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "vivid-flash-204", name: "Vivid Flash", creator: "lillian", category: "fun", preview: "🩷", color: "#ffffff", css: "contrast(0.96) saturate(1.07) brightness(1.04) sepia(0.15) hue-rotate(-19deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "sun-touch-205", name: "Sun Touch", creator: "naomi", category: "appearance", preview: "☁️", color: "#a8edea", css: "contrast(0.88) saturate(1.61) brightness(0.93) hue-rotate(22deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "glossy-lace-206", name: "Glossy Lace", creator: "bella", category: "world", preview: "🍑", color: "#ed4956", css: "contrast(1.19) saturate(1.15) brightness(1.16) sepia(0.33)", overlay: "none" },
  { id: "moss-look-207", name: "Moss Look", creator: "mia", category: "aesthetic", preview: "🧚", color: "#fa7e1e", css: "contrast(1.1) saturate(0.87) brightness(1.04) sepia(0.3)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "modern-film-208", name: "Modern Film", creator: "beck", category: "world", preview: "💙", color: "#ff9ff3", css: "contrast(1.06) saturate(1.32) brightness(1.13) sepia(0.22) hue-rotate(18deg)", overlay: "none" },
  { id: "ink-beacon-209", name: "Ink Beacon", creator: "emma", category: "aesthetic", preview: "👑", color: "#fa7e1e", css: "contrast(0.99) saturate(1.54) brightness(1.18) sepia(0.12) hue-rotate(-14deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "grainy-ocean-210", name: "Grainy Ocean", creator: "chloe", category: "trending", preview: "🤍", color: "#feda75", css: "contrast(1.12) saturate(1.11) brightness(1.04) sepia(0.06) hue-rotate(-6deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "matte-dream-211", name: "Matte Dream", creator: "maya", category: "world", preview: "🪐", color: "#fa7e1e", css: "contrast(0.89) saturate(1.19) brightness(1.03) sepia(0.21)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "fire-rain-212", name: "Fire Rain", creator: "abigail", category: "trending", preview: "🪐", color: "#feda75", css: "contrast(1.19) saturate(1.24) brightness(1.1)", overlay: "none" },
  { id: "glow-capture-213", name: "Glow Capture", creator: "kendall", category: "appearance", preview: "🤎", color: "#a8edea", css: "contrast(0.98) saturate(1.06) brightness(0.9) sepia(0.26) hue-rotate(-14deg) blur(0.4px)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "bronze-beacon-214", name: "Bronze Beacon", creator: "skye", category: "aesthetic", preview: "🐚", color: "#ff3040", css: "contrast(1.28) saturate(0.75) brightness(0.91) sepia(0.32) hue-rotate(-5deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "rose-tide-215", name: "Rose Tide", creator: "ava", category: "aesthetic", preview: "🐚", color: "#4f5bd5", css: "contrast(0.86) saturate(1.06) brightness(1.14) sepia(0.22) hue-rotate(19deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "clean-shimmer-216", name: "Clean Shimmer", creator: "eleanor", category: "appearance", preview: "🎨", color: "#fa7e1e", css: "contrast(1.05) saturate(0.79) brightness(1.16) sepia(0.26) hue-rotate(-11deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "electric-paint-217", name: "Electric Paint", creator: "aurora", category: "trending", preview: "🌚", color: "#fa7e1e", css: "contrast(0.95) saturate(1.55) brightness(1.01) sepia(0.34) hue-rotate(16deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "grainy-hue-218", name: "Grainy Hue", creator: "olivia", category: "appearance", preview: "🎭", color: "#ffffff", css: "contrast(0.93) saturate(1.54) brightness(0.92) sepia(0.33) hue-rotate(15deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "bold-silk-219", name: "Bold Silk", creator: "avery", category: "world", preview: "🧡", color: "#ff9ff3", css: "contrast(1.34) saturate(1.05) brightness(1.03) sepia(0.16) hue-rotate(15deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "glossy-whisper-220", name: "Glossy Whisper", creator: "skye", category: "world", preview: "🌟", color: "#ff9ff3", css: "contrast(1.08) saturate(0.74) brightness(1.01) sepia(0.1) hue-rotate(16deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "moss-dawn-221", name: "Moss Dawn", creator: "aubrey", category: "fun", preview: "🎨", color: "#ff9ff3", css: "contrast(1.13) saturate(1.57) brightness(1.17) sepia(0.16) hue-rotate(11deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "clay-dawn-222", name: "Clay Dawn", creator: "nova", category: "appearance", preview: "💅", color: "#8e8e8e", css: "contrast(0.9) saturate(1.69) brightness(1.0) sepia(0.25) hue-rotate(7deg)", overlay: "none" },
  { id: "glass-snow-223", name: "Glass Snow", creator: "aurora", category: "fun", preview: "⚡", color: "#feca57", css: "contrast(1.15) saturate(1.1) brightness(1.18) sepia(0.14) hue-rotate(24deg)", overlay: "none" },
  { id: "lilac-pastel-224", name: "Lilac Pastel", creator: "ivy", category: "aesthetic", preview: "🍑", color: "#0095f6", css: "contrast(0.9) saturate(1.45) brightness(0.99) sepia(0.25) hue-rotate(17deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "hazy-satin-225", name: "Hazy Satin", creator: "victoria", category: "appearance", preview: "🌟", color: "#ffffff", css: "contrast(1.33) saturate(1.47) brightness(1.02) sepia(0.21) hue-rotate(-20deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "light-effect-226", name: "Light Effect", creator: "willow", category: "appearance", preview: "🌸", color: "#0095f6", css: "contrast(1.26) saturate(1.51) brightness(1.11) sepia(0.18) hue-rotate(16deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "dreamy-kiss-227", name: "Dreamy Kiss", creator: "charli", category: "aesthetic", preview: "🌸", color: "#a8edea", css: "contrast(1.02) saturate(1.54) brightness(0.96) sepia(0.35) hue-rotate(-16deg) blur(0.5px)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "classic-crystal-228", name: "Classic Crystal", creator: "luna", category: "world", preview: "🍃", color: "#ff3040", css: "contrast(1.02) saturate(1.54) brightness(0.94) sepia(0.13) hue-rotate(-15deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "cocoa-blur-229", name: "Cocoa Blur", creator: "luna", category: "fun", preview: "🪐", color: "#8e8e8e", css: "contrast(1.21) saturate(1.77) brightness(1.08) sepia(0.26) hue-rotate(25deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "olive-bulb-230", name: "Olive Bulb", creator: "addison", category: "fun", preview: "🌹", color: "#4f5bd5", css: "contrast(1.19) saturate(1.33) brightness(1.03) sepia(0.27) hue-rotate(24deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "lofi-candle-231", name: "Lofi Candle", creator: "anna", category: "appearance", preview: "🌈", color: "#48dbfb", css: "contrast(1.29) saturate(0.76) brightness(1.04) sepia(0.13) hue-rotate(-19deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "luxe-frame-232", name: "Luxe Frame", creator: "zendaya", category: "trending", preview: "❄️", color: "#feda75", css: "contrast(1.07) saturate(1.26) brightness(1.15) hue-rotate(-11deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "cherry-grain-233", name: "Cherry Grain", creator: "leah", category: "fun", preview: "🌹", color: "#feca57", css: "contrast(0.97) saturate(1.79) brightness(1.01) hue-rotate(-19deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "grainy-mist-234", name: "Grainy Mist", creator: "abigail", category: "trending", preview: "💛", color: "#8e8e8e", css: "contrast(1.09) saturate(1.61) brightness(1.13) sepia(0.16) hue-rotate(14deg) blur(0.1px)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "cool-smoke-235", name: "Cool Smoke", creator: "anna", category: "world", preview: "⚡", color: "#fa7e1e", css: "contrast(1.06) saturate(1.55) brightness(0.97) hue-rotate(-10deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "bloom-signal-236", name: "Bloom Signal", creator: "everly", category: "fun", preview: "💧", color: "#d62976", css: "contrast(0.86) saturate(1.27) brightness(0.97) blur(0.3px)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "paper-metal-237", name: "Paper Metal", creator: "aurora", category: "trending", preview: "🌹", color: "#ffffff", css: "contrast(0.88) saturate(1.28) brightness(1.05) sepia(0.35) hue-rotate(10deg) blur(0.5px)", overlay: "none" },
  { id: "noon-touch-238", name: "Noon Touch", creator: "ari", category: "aesthetic", preview: "🍒", color: "#d62976", css: "contrast(1.24) saturate(1.08) brightness(1.12) sepia(0.22) hue-rotate(24deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "pastel-whisper-239", name: "Pastel Whisper", creator: "scarlett", category: "world", preview: "💚", color: "#fa7e1e", css: "contrast(1.17) saturate(1.61) brightness(1.11) sepia(0.34) hue-rotate(5deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "mirror-neon-240", name: "Mirror Neon", creator: "luna", category: "fun", preview: "💖", color: "#f5c6a0", css: "contrast(0.95) saturate(1.57) brightness(1.17) sepia(0.11) hue-rotate(-6deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "sun-pop-241", name: "Sun Pop", creator: "abigail", category: "appearance", preview: "🍒", color: "#ff3040", css: "contrast(1.28) saturate(0.75) brightness(1.1) sepia(0.1)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "cocoa-flush-242", name: "Cocoa Flush", creator: "charli", category: "aesthetic", preview: "🌞", color: "#4f5bd5", css: "contrast(1.2) saturate(1.1) brightness(1.14) sepia(0.09) hue-rotate(-20deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "sage-lamp-243", name: "Sage Lamp", creator: "audrey", category: "appearance", preview: "💖", color: "#ff3040", css: "contrast(1.01) saturate(0.79) brightness(1.1) sepia(0.11) hue-rotate(13deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "cocoa-charm-244", name: "Cocoa Charm", creator: "zara", category: "fun", preview: "🖤", color: "#ffffff", css: "contrast(1.29) saturate(1.09) brightness(1.2) sepia(0.1) hue-rotate(25deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "rose-chill-245", name: "Rose Chill", creator: "hazel", category: "aesthetic", preview: "💙", color: "#d62976", css: "contrast(1.22) saturate(0.88) brightness(0.91) sepia(0.3) hue-rotate(18deg)", overlay: "none" },
  { id: "velvet-tint-246", name: "Velvet Tint", creator: "luna", category: "aesthetic", preview: "🦄", color: "#ff9ff3", css: "contrast(1.32) saturate(0.74) brightness(0.95) sepia(0.16)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "pop-pearl-247", name: "Pop Pearl", creator: "layla", category: "aesthetic", preview: "💎", color: "#fa7e1e", css: "contrast(1.17) saturate(0.97) brightness(0.93) sepia(0.26) hue-rotate(6deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "cloud-neon-248", name: "Cloud Neon", creator: "lillian", category: "aesthetic", preview: "🌸", color: "#ff3040", css: "contrast(1.35) saturate(1.01) brightness(1.17) sepia(0.17) hue-rotate(-18deg) blur(0.1px)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "cocoa-lens-249", name: "Cocoa Lens", creator: "willow", category: "aesthetic", preview: "🍒", color: "#feca57", css: "contrast(1.2) saturate(1.3) brightness(0.99) sepia(0.1) hue-rotate(-15deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "mist-dusk-250", name: "Mist Dusk", creator: "lily", category: "appearance", preview: "👓", color: "#d62976", css: "contrast(1.25) saturate(0.96) brightness(1.05) sepia(0.13) hue-rotate(11deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "mint-lens-251", name: "Mint Lens", creator: "mila", category: "trending", preview: "🐚", color: "#f5c6a0", css: "contrast(1.35) saturate(1.49) brightness(1.06) sepia(0.27) hue-rotate(11deg) blur(0.6px)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "silk-glitter-252", name: "Silk Glitter", creator: "victoria", category: "world", preview: "🌈", color: "#48dbfb", css: "contrast(1.29) saturate(1.56) brightness(1.09) sepia(0.06) hue-rotate(-17deg)", overlay: "none" },
  { id: "luxe-gold-253", name: "Luxe Gold", creator: "elizabeth", category: "appearance", preview: "😈", color: "#ed4956", css: "contrast(0.93) saturate(1.73) brightness(0.97) sepia(0.33) hue-rotate(8deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "aura-paint-254", name: "Aura Paint", creator: "evelyn", category: "world", preview: "🌈", color: "#d62976", css: "contrast(1.16) saturate(1.38) brightness(0.93) sepia(0.22) hue-rotate(12deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "ink-paper-255", name: "Ink Paper", creator: "scarlett", category: "world", preview: "💛", color: "#ffffff", css: "contrast(1.31) saturate(0.75) brightness(1.16) hue-rotate(16deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "glow-street-256", name: "Glow Street", creator: "nora", category: "world", preview: "🪞", color: "#ed4956", css: "contrast(1.17) saturate(1.25) brightness(1.09) sepia(0.1) hue-rotate(-6deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "satin-highlight-257", name: "Satin Highlight", creator: "zendaya", category: "trending", preview: "💅", color: "#4f5bd5", css: "contrast(1.06) saturate(1.21) brightness(1.0) hue-rotate(20deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "chic-city-258", name: "Chic City", creator: "hazel", category: "aesthetic", preview: "🍓", color: "#48dbfb", css: "contrast(0.9) saturate(0.97) brightness(0.94) sepia(0.16) hue-rotate(-16deg) blur(0.2px)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "mint-tide-259", name: "Mint Tide", creator: "zendaya", category: "appearance", preview: "💚", color: "#f5c6a0", css: "contrast(1.01) saturate(1.34) brightness(0.99) sepia(0.27) hue-rotate(6deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "bold-look-260", name: "Bold Look", creator: "ari", category: "fun", preview: "😍", color: "#ed4956", css: "contrast(1.32) saturate(1.26) brightness(1.19) sepia(0.08) blur(0.2px)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "pixel-filter-261", name: "Pixel Filter", creator: "eleanor", category: "trending", preview: "🌈", color: "#a8edea", css: "contrast(1.29) saturate(1.5) brightness(1.13) sepia(0.13) blur(0.4px)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "honey-highlight-262", name: "Honey Highlight", creator: "leah", category: "fun", preview: "💅", color: "#feca57", css: "contrast(1.23) saturate(1.01) brightness(1.2) sepia(0.24) hue-rotate(-18deg) blur(0.1px)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "ice-mirror-263", name: "Ice Mirror", creator: "kylie", category: "aesthetic", preview: "👓", color: "#a8edea", css: "contrast(1.15) saturate(1.14) brightness(0.91) hue-rotate(20deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "satin-smoke-264", name: "Satin Smoke", creator: "hazel", category: "world", preview: "🌈", color: "#a8edea", css: "contrast(1.01) saturate(1.37) brightness(0.95) sepia(0.35) hue-rotate(22deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "cool-dusk-265", name: "Cool Dusk", creator: "natalie", category: "world", preview: "💋", color: "#feca57", css: "contrast(1.13) saturate(1.22) brightness(0.9) sepia(0.12) hue-rotate(-18deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "glitter-dust-266", name: "Glitter Dust", creator: "everly", category: "trending", preview: "☁️", color: "#d62976", css: "contrast(0.98) saturate(1.42) brightness(1.19) sepia(0.2) hue-rotate(-11deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "galactic-ink-267", name: "Galactic Ink", creator: "chloe", category: "world", preview: "👼", color: "#4f5bd5", css: "contrast(1.26) saturate(0.97) brightness(1.07) sepia(0.25) hue-rotate(-13deg) blur(0.3px)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "denim-spark-268", name: "Denim Spark", creator: "leah", category: "fun", preview: "🧡", color: "#ffffff", css: "contrast(1.16) saturate(1.22) brightness(1.15) sepia(0.25) hue-rotate(20deg) blur(0.2px)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "stone-pearl-269", name: "Stone Pearl", creator: "ella", category: "fun", preview: "👑", color: "#ff9ff3", css: "contrast(1.08) saturate(1.29) brightness(1.06) sepia(0.24) hue-rotate(21deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "stone-leak-270", name: "Stone Leak", creator: "evelyn", category: "appearance", preview: "🍓", color: "#0095f6", css: "contrast(1.0) saturate(1.74) brightness(1.19) sepia(0.27) hue-rotate(20deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "stone-charm-271", name: "Stone Charm", creator: "evelyn", category: "world", preview: "💖", color: "#ed4956", css: "contrast(0.91) saturate(1.44) brightness(1.01) sepia(0.34)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "pastel-frame-272", name: "Pastel Frame", creator: "victoria", category: "trending", preview: "💅", color: "#d62976", css: "contrast(1.18) saturate(1.52) brightness(0.96) sepia(0.29) hue-rotate(-8deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "aurora-leather-273", name: "Aurora Leather", creator: "sofia", category: "world", preview: "🌊", color: "#fa7e1e", css: "contrast(0.88) saturate(1.7) brightness(0.97) sepia(0.08) hue-rotate(-19deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "linen-street-274", name: "Linen Street", creator: "instagram", category: "appearance", preview: "🍓", color: "#feca57", css: "contrast(1.34) saturate(0.87) brightness(1.1) sepia(0.31) hue-rotate(5deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "honey-style-275", name: "Honey Style", creator: "kennedy", category: "aesthetic", preview: "💫", color: "#d62976", css: "contrast(1.3) saturate(0.8) brightness(1.07) sepia(0.19) hue-rotate(21deg)", overlay: "none" },
  { id: "cherry-signal-276", name: "Cherry Signal", creator: "luna", category: "appearance", preview: "💛", color: "#ed4956", css: "contrast(1.05) saturate(1.24) brightness(1.18) sepia(0.34) hue-rotate(-7deg)", overlay: "none" },
  { id: "amber-denim-277", name: "Amber Denim", creator: "sofia", category: "trending", preview: "💖", color: "#ed4956", css: "contrast(1.08) saturate(1.41) brightness(1.06) sepia(0.31) hue-rotate(-17deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "prism-bulb-278", name: "Prism Bulb", creator: "sofia", category: "trending", preview: "😈", color: "#d62976", css: "contrast(1.22) saturate(1.41) brightness(1.12) hue-rotate(-4deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "mint-paint-279", name: "Mint Paint", creator: "lily", category: "fun", preview: "🌚", color: "#feda75", css: "contrast(1.01) saturate(1.14) brightness(0.93) sepia(0.34) hue-rotate(5deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "cloud-flush-280", name: "Cloud Flush", creator: "lillian", category: "appearance", preview: "🤎", color: "#feda75", css: "contrast(0.98) saturate(1.06) brightness(1.07) sepia(0.2) hue-rotate(-9deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "paper-frost-281", name: "Paper Frost", creator: "mila", category: "fun", preview: "😈", color: "#0095f6", css: "contrast(1.05) saturate(1.25) brightness(1.17) sepia(0.25) hue-rotate(-6deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "mint-gleam-282", name: "Mint Gleam", creator: "kendall", category: "appearance", preview: "☁️", color: "#feca57", css: "contrast(0.93) saturate(1.52) brightness(1.08) sepia(0.15) hue-rotate(10deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "paper-lamp-283", name: "Paper Lamp", creator: "valentina", category: "appearance", preview: "🪐", color: "#feda75", css: "contrast(1.23) saturate(1.66) brightness(0.92) sepia(0.16) hue-rotate(20deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "cool-glass-284", name: "Cool Glass", creator: "loren", category: "world", preview: "🧚", color: "#fa7e1e", css: "contrast(1.12) saturate(0.88) brightness(1.16) sepia(0.15) hue-rotate(18deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "electric-sun-285", name: "Electric Sun", creator: "addison", category: "trending", preview: "🌈", color: "#ed4956", css: "contrast(1.11) saturate(1.2) brightness(0.92) sepia(0.16) hue-rotate(-6deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "dark-glow-286", name: "Dark Glow", creator: "lucy", category: "appearance", preview: "📼", color: "#feda75", css: "contrast(0.87) saturate(1.08) brightness(0.92) sepia(0.35) hue-rotate(-21deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "honey-wave-287", name: "Honey Wave", creator: "kendall", category: "appearance", preview: "🧡", color: "#4f5bd5", css: "contrast(1.17) saturate(1.5) brightness(1.19) sepia(0.13)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "hazy-glitter-288", name: "Hazy Glitter", creator: "kendall", category: "world", preview: "🌷", color: "#48dbfb", css: "contrast(1.28) saturate(0.83) brightness(1.2) sepia(0.14) hue-rotate(-17deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "soft-mountain-289", name: "Soft Mountain", creator: "elizabeth", category: "trending", preview: "🌺", color: "#ed4956", css: "contrast(1.19) saturate(1.3) brightness(1.06) sepia(0.29) hue-rotate(-10deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "prism-wood-290", name: "Prism Wood", creator: "luna", category: "trending", preview: "💙", color: "#ff9ff3", css: "contrast(1.18) saturate(1.38) brightness(1.18) sepia(0.31) hue-rotate(-10deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "neon-sun-291", name: "Neon Sun", creator: "kinsley", category: "world", preview: "💋", color: "#d62976", css: "contrast(1.29) saturate(0.97) brightness(0.91) sepia(0.15) hue-rotate(9deg)", overlay: "none" },
  { id: "rusty-shot-292", name: "Rusty Shot", creator: "skylar", category: "appearance", preview: "💎", color: "#8e8e8e", css: "contrast(1.14) saturate(1.55) brightness(1.15) sepia(0.08) hue-rotate(-16deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "sugar-capture-293", name: "Sugar Capture", creator: "nova", category: "aesthetic", preview: "🍓", color: "#0095f6", css: "contrast(1.32) saturate(1.67) brightness(1.17) sepia(0.22)", overlay: "none" },
  { id: "blush-metal-294", name: "Blush Metal", creator: "aurora", category: "fun", preview: "💎", color: "#ed4956", css: "contrast(1.2) saturate(1.15) brightness(0.99) sepia(0.06) hue-rotate(9deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "faded-clay-295", name: "Faded Clay", creator: "aubrey", category: "appearance", preview: "💫", color: "#ffffff", css: "contrast(1.13) saturate(1.76) brightness(1.07) hue-rotate(-10deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "hazy-sun-296", name: "Hazy Sun", creator: "chloe", category: "aesthetic", preview: "💧", color: "#8e8e8e", css: "contrast(1.21) saturate(0.91) brightness(0.98) sepia(0.24) hue-rotate(13deg) blur(0.1px)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "stone-spark-297", name: "Stone Spark", creator: "elizabeth", category: "aesthetic", preview: "✨", color: "#ff3040", css: "contrast(0.96) saturate(0.91) brightness(1.12) sepia(0.26) hue-rotate(23deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "sage-clay-298", name: "Sage Clay", creator: "layla", category: "appearance", preview: "🌊", color: "#a8edea", css: "contrast(1.13) saturate(1.55) brightness(1.01) sepia(0.19)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "bold-sunset-299", name: "Bold Sunset", creator: "sophie", category: "fun", preview: "💙", color: "#ff9ff3", css: "contrast(1.34) saturate(1.22) brightness(1.15) sepia(0.32)", overlay: "none" },
  { id: "vivid-gleam-300", name: "Vivid Gleam", creator: "ari", category: "appearance", preview: "🔥", color: "#ff9ff3", css: "contrast(1.13) saturate(1.34) brightness(1.12) sepia(0.1) hue-rotate(-13deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "cool-tone-301", name: "Cool Tone", creator: "brooklyn", category: "fun", preview: "🌷", color: "#f5c6a0", css: "contrast(1.32) saturate(1.07) brightness(1.13) sepia(0.17) hue-rotate(21deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "vhs-forest-302", name: "VHS Forest", creator: "billie", category: "aesthetic", preview: "🌈", color: "#feda75", css: "contrast(1.21) saturate(1.24) brightness(1.18) sepia(0.19) hue-rotate(16deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "dirty-highlight-303", name: "Dirty Highlight", creator: "instagram", category: "trending", preview: "🍭", color: "#feda75", css: "contrast(0.92) saturate(1.39) brightness(0.92) hue-rotate(-12deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "lavender-paint-304", name: "Lavender Paint", creator: "stella", category: "world", preview: "🍃", color: "#ed4956", css: "contrast(1.09) saturate(0.71) brightness(1.07) hue-rotate(8deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "dreamy-dawn-305", name: "Dreamy Dawn", creator: "olivia", category: "fun", preview: "✿", color: "#feca57", css: "contrast(1.31) saturate(1.28) brightness(0.97) sepia(0.22) hue-rotate(-9deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "night-bloom-306", name: "Night Bloom", creator: "riley", category: "aesthetic", preview: "🌺", color: "#fa7e1e", css: "contrast(1.13) saturate(1.79) brightness(0.97) sepia(0.24) hue-rotate(-20deg)", overlay: "none" },
  { id: "candy-blush-307", name: "Candy Blush", creator: "brooklyn", category: "fun", preview: "☁️", color: "#ff9ff3", css: "contrast(0.88) saturate(0.71) brightness(0.95) sepia(0.17)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "faded-focus-308", name: "Faded Focus", creator: "zara", category: "world", preview: "🚀", color: "#a8edea", css: "contrast(0.96) saturate(1.65) brightness(1.17) sepia(0.17) hue-rotate(-23deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "amber-chrome-309", name: "Amber Chrome", creator: "olivia", category: "trending", preview: "❤️", color: "#ed4956", css: "contrast(1.01) saturate(1.76) brightness(1.08) sepia(0.26) hue-rotate(20deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "lofi-silk-310", name: "Lofi Silk", creator: "claire", category: "appearance", preview: "💛", color: "#a8edea", css: "contrast(1.27) saturate(1.44) brightness(1.06) sepia(0.13) hue-rotate(22deg) blur(0.6px)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "plastic-charm-311", name: "Plastic Charm", creator: "sophie", category: "trending", preview: "🎀", color: "#feda75", css: "contrast(0.97) saturate(0.78) brightness(1.08) sepia(0.21) hue-rotate(13deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
  { id: "rose-fade-312", name: "Rose Fade", creator: "natalie", category: "fun", preview: "🚀", color: "#feca57", css: "contrast(1.03) saturate(1.74) brightness(1.03) sepia(0.24) hue-rotate(17deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "moon-stone-313", name: "Moon Stone", creator: "bella", category: "trending", preview: "❄️", color: "#feda75", css: "contrast(0.93) saturate(1.48) brightness(1.09) sepia(0.26) hue-rotate(-5deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "olive-snow-314", name: "Olive Snow", creator: "harper", category: "aesthetic", preview: "✿", color: "#fa7e1e", css: "contrast(0.92) saturate(0.91) brightness(1.03) sepia(0.19) blur(0.1px)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "moss-cotton-315", name: "Moss Cotton", creator: "penelope", category: "aesthetic", preview: "✨", color: "#ffffff", css: "contrast(1.0) saturate(1.13) brightness(0.93) sepia(0.32) hue-rotate(-10deg)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "dusk-memory-316", name: "Dusk Memory", creator: "harper", category: "appearance", preview: "🌟", color: "#0095f6", css: "contrast(0.98) saturate(0.86) brightness(0.95) sepia(0.1) hue-rotate(-6deg)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "sun-tone-317", name: "Sun Tone", creator: "everly", category: "fun", preview: "🪞", color: "#feca57", css: "contrast(0.95) saturate(0.82) brightness(0.99) sepia(0.33) hue-rotate(-4deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "vivid-effect-318", name: "Vivid Effect", creator: "sofia", category: "fun", preview: "🎀", color: "#f5c6a0", css: "contrast(1.26) saturate(1.65) brightness(1.19) hue-rotate(-5deg)", overlay: "radial-gradient(circle at 80% 20%, rgba(255,0,200,0.2), transparent 60%)" },
  { id: "forest-aura-319", name: "Forest Aura", creator: "ella", category: "fun", preview: "💖", color: "#0095f6", css: "contrast(1.22) saturate(1.4) brightness(1.19) sepia(0.27) hue-rotate(-5deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "bloom-silk-320", name: "Bloom Silk", creator: "paisley", category: "appearance", preview: "💧", color: "#48dbfb", css: "contrast(0.94) saturate(1.54) brightness(0.91) sepia(0.25) hue-rotate(20deg)", overlay: "linear-gradient(180deg, rgba(100,180,255,0.25), transparent)" },
  { id: "denim-shadow-321", name: "Denim Shadow", creator: "kinsley", category: "fun", preview: "🌞", color: "#f5c6a0", css: "contrast(0.92) saturate(1.03) brightness(0.98)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "moss-sky-322", name: "Moss Sky", creator: "riley", category: "world", preview: "💧", color: "#ff9ff3", css: "contrast(1.1) saturate(1.71) brightness(1.11) sepia(0.19) hue-rotate(25deg)", overlay: "linear-gradient(45deg, rgba(255,0,100,0.15), rgba(0,255,150,0.1))" },
  { id: "rose-bloom-323", name: "Rose Bloom", creator: "valentina", category: "trending", preview: "🍃", color: "#feca57", css: "contrast(1.18) saturate(0.88) brightness(1.08) sepia(0.2) hue-rotate(16deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "desert-light-324", name: "Desert Light", creator: "mia", category: "fun", preview: "✨", color: "#0095f6", css: "contrast(0.9) saturate(0.94) brightness(1.12) sepia(0.2) hue-rotate(19deg)", overlay: "linear-gradient(180deg, rgba(255,200,150,0.2), transparent)" },
  { id: "night-star-325", name: "Night Star", creator: "leah", category: "world", preview: "👼", color: "#0095f6", css: "contrast(1.02) saturate(0.73) brightness(0.93) sepia(0.15) hue-rotate(-20deg) blur(0.6px)", overlay: "linear-gradient(45deg, rgba(255,100,100,0.2), rgba(100,255,100,0.15))" },
  { id: "olive-magic-326", name: "Olive Magic", creator: "dixie", category: "fun", preview: "⚡", color: "#feda75", css: "contrast(1.09) saturate(1.22) brightness(1.03) sepia(0.24) hue-rotate(-5deg) blur(0.1px)", overlay: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.25), transparent 60%)" },
  { id: "clean-magic-327", name: "Clean Magic", creator: "kinsley", category: "trending", preview: "💙", color: "#f5c6a0", css: "contrast(0.93) saturate(1.78) brightness(0.97) sepia(0.06) hue-rotate(-15deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "angel-torch-328", name: "Angel Torch", creator: "genesis", category: "fun", preview: "👑", color: "#4f5bd5", css: "contrast(0.94) saturate(1.42) brightness(1.02) sepia(0.26) hue-rotate(-13deg)", overlay: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.4), transparent 70%)" },
  { id: "soft-clay-329", name: "Soft Clay", creator: "dixie", category: "appearance", preview: "❄️", color: "#8e8e8e", css: "contrast(1.23) saturate(1.59) brightness(0.92) hue-rotate(9deg)", overlay: "linear-gradient(90deg, rgba(255,0,128,0.12), rgba(0,200,255,0.12), rgba(255,200,0,0.1))" },
];

const CATEGORIES: { id: EffectItem["category"] | "trending"; label: string }[] = [
  { id: "trending", label: "Trending" },
  { id: "appearance", label: "Appearance" },
  { id: "aesthetic", label: "Aesthetic" },
  { id: "fun", label: "Fun" },
  { id: "world", label: "World" },
];


export function EffectsTray({ onPick, onClose }: { onPick: (effect: EffectItem) => void; onClose: () => void }) {
  const [tab, setTab] = useState<(typeof CATEGORIES)[0]["id"]>("trending");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = EFFECTS;
    if (tab !== "trending") list = list.filter((e) => e.category === tab);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q) || e.creator.toLowerCase().includes(q));
    }
    return list;
  }, [tab, query]);

  return (
    <div className="fixed inset-0 z-[92] flex flex-col bg-[#121212] text-white" role="dialog" aria-label="Effects">
      <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-4 shrink-0 border-b border-[#262626]">
        <div className="h-1 w-9 rounded-full bg-[#363636]" />
        <div className="flex w-full items-center justify-between">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">Effects</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-[#262626] text-white">
            <span className="text-[18px]">×</span>
          </button>
        </div>

        <label className="flex w-full items-center gap-2 rounded-lg bg-[#262626] px-3 py-2.5">
          <Search className="size-4 shrink-0 text-[#a8a8a8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search effects"
            className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#a8a8a8]"
          />
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 scrollbar-none border-b border-[#262626]/50">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setTab(c.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium border transition-all",
              tab === c.id ? "bg-white text-black border-white" : "bg-[#262626] text-[#a8a8a8] border-[#363636]",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((effect) => (
            <button
              key={effect.id}
              type="button"
              onClick={() => onPick(effect)}
              className="flex flex-col items-center gap-2 text-left active:scale-[0.97] transition-transform group"
            >
              <div className="relative aspect-square w-full">
                <div className="absolute inset-0 rounded-full border-2 border-[#2c2c2e] overflow-hidden bg-[#1c1c1e] group-active:scale-95 transition-transform">
                  <img src={getPreviewImage(effect.id)} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ filter: effect.css }} loading="lazy" />
                  {effect.overlay && effect.overlay !== "none" ? <div className="absolute inset-0 mix-blend-overlay opacity-70" style={{ background: effect.overlay }} /> : null}
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 grid size-6 place-items-center rounded-full bg-black/50 backdrop-blur-md text-[14px] border border-white/20">{effect.preview}</span>
                </div>
                <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-[#262626] border border-[#363636] text-white z-10">
                  <Bookmark
                    className={cn("size-3", saved.has(effect.id) ? "fill-white" : "")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSaved((s) => {
                        const n = new Set(s);
                        if (n.has(effect.id)) n.delete(effect.id);
                        else n.add(effect.id);
                        return n;
                      });
                    }}
                  />
                </span>
              </div>
              <span className="flex flex-col items-center">
                <span className="text-[12px] font-semibold text-white leading-tight truncate max-w-[80px]">{effect.name}</span>
                <span className="text-[10px] text-[#a8a8a8] truncate max-w-[80px]">{effect.creator}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
