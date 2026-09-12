/**
 * Fire Templates — exact replicas of screenshots, NO unsplash, pure CSS/HTML.
 * Black and White Illustrated Birthday, Gray Beige Memories, Janmashtami, Today Dump, White Brown Scrapbook
 * All templates are pure CSS designs with doodles, tape, flowers, torn paper — no external images.
 */

export type FireCategory = 'birthday' | 'memories' | 'festival' | 'nature' | 'scrapbook' | 'trending';

export interface FireTemplate {
  id: string;
  category: FireCategory;
  text: string;
  subtext: string;
  layout: 'birthday-illustrated' | 'memories-minimal' | 'janmashtami' | 'nature-dump' | 'scrapbook-love';
}

export const FIRE_TEMPLATES: FireTemplate[] = [
  // Exact from screenshot 1 - Black and White Illustrated Birthday
  { id: "fire-bw-birthday-1", category: "birthday", text: "Happy Birthday", subtext: "@reallygreatsite", layout: "birthday-illustrated" },
  { id: "fire-bw-birthday-2", category: "birthday", text: "Happy Birthday", subtext: "Celebrate", layout: "birthday-illustrated" },
  { id: "fire-bw-birthday-3", category: "birthday", text: "Happy Birthday", subtext: "Make a wish", layout: "birthday-illustrated" },
  // Gray and Beige Minimalist Memories
  { id: "fire-memories-1", category: "memories", text: "Memories", subtext: "Tiny pieces of life that made this season beautiful.", layout: "memories-minimal" },
  { id: "fire-memories-2", category: "memories", text: "Memories", subtext: "Life lately", layout: "memories-minimal" },
  { id: "fire-memories-3", category: "memories", text: "Memories", subtext: "Beautiful season", layout: "memories-minimal" },
  // Multi Shades Janamashtami
  { id: "fire-janmashtami-1", category: "festival", text: "Happy Janamashtami", subtext: "Wishing you love", layout: "janmashtami" },
  { id: "fire-janmashtami-2", category: "festival", text: "Happy Janamashtami", subtext: "Jai Shri Krishna", layout: "janmashtami" },
  { id: "fire-janmashtami-3", category: "festival", text: "Janamashtami", subtext: "Blessings", layout: "janmashtami" },
  // Orange and Green Modern Nature - Today Dump
  { id: "fire-nature-1", category: "nature", text: "Today Dump", subtext: "Life lately", layout: "nature-dump" },
  { id: "fire-nature-2", category: "nature", text: "Today Dump", subtext: "Aesthetic", layout: "nature-dump" },
  // White And Brown Scrapbook - second screenshot
  { id: "fire-scrapbook-1", category: "scrapbook", text: "love you", subtext: "happy birthday", layout: "scrapbook-love" },
  { id: "fire-scrapbook-2", category: "scrapbook", text: "love you", subtext: "Our story", layout: "scrapbook-love" },
  { id: "fire-scrapbook-3", category: "scrapbook", text: "happy", subtext: "birthday", layout: "scrapbook-love" },
  // Additional fire variations - all pure CSS, no photos
  { id: "fire-birthday-4", category: "birthday", text: "Happy Birthday", subtext: "Party time", layout: "birthday-illustrated" },
  { id: "fire-birthday-5", category: "birthday", text: "Happy Birthday", subtext: "To you", layout: "birthday-illustrated" },
  { id: "fire-memories-4", category: "memories", text: "Memories", subtext: "Tiny pieces", layout: "memories-minimal" },
  { id: "fire-festival-4", category: "festival", text: "Happy Diwali", subtext: "Festival of lights", layout: "janmashtami" },
  { id: "fire-festival-5", category: "festival", text: "Happy Holi", subtext: "Colors", layout: "janmashtami" },
  { id: "fire-nature-3", category: "nature", text: "Today Dump", subtext: "Nature", layout: "nature-dump" },
  { id: "fire-scrapbook-4", category: "scrapbook", text: "love you", subtext: "Forever", layout: "scrapbook-love" },
  { id: "fire-trending-1", category: "trending", text: "Happy Birthday", subtext: "Trending", layout: "birthday-illustrated" },
  { id: "fire-trending-2", category: "trending", text: "Memories", subtext: "Trending", layout: "memories-minimal" },
  { id: "fire-trending-3", category: "trending", text: "Janamashtami", subtext: "Festival", layout: "janmashtami" },
];

export const FIRE_CATEGORIES = [
  { id: 'trending', label: 'Trending' },
  { id: 'birthday', label: 'Birthday' },
  { id: 'memories', label: 'Memories' },
  { id: 'festival', label: 'Festival' },
  { id: 'nature', label: 'Nature' },
  { id: 'scrapbook', label: 'Scrapbook' },
] as const;
