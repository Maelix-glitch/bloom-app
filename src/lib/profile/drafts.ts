/**
 * Small localStorage-backed draft store. Used for the profile editor and the
 * story composer so meaningful content is never silently destroyed.
 */

export interface DraftEnvelope<T> {
  value: T;
  savedAt: number;
}

const encoder = <T>(key: string) => ({
  read(): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as DraftEnvelope<T>;
      return parsed && typeof parsed === "object" && "value" in parsed ? parsed.value : null;
    } catch {
      return null;
    }
  },
  write(value: T): void {
    if (typeof window === "undefined") return;
    try {
      const envelope: DraftEnvelope<T> = { value, savedAt: Date.now() };
      window.localStorage.setItem(key, JSON.stringify(envelope));
    } catch {
      /* storage full or unavailable — drafts are best-effort */
    }
  },
  clear(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
});

export const profileDraft = encoder<{
  displayName: string;
  username: string;
  bio: string;
  accent: string;
}>("bloom.profile.draft.v1");

export const storyDraft = encoder<{ value: unknown; userId: string }>("bloom.story.draft.v1");

export const seenStories = (() => {
  const KEY = "bloom.stories.seen.v1";
  const readSet = (): Set<string> => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem(KEY);
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      return new Set(
        Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : [],
      );
    } catch {
      return new Set();
    }
  };
  return {
    has(id: string): boolean {
      return readSet().has(id);
    },
    mark(id: string): void {
      const set = readSet();
      set.add(id);
      try {
        // Keep only the most recent 200 ids.
        window.localStorage.setItem(KEY, JSON.stringify([...set].slice(-200)));
      } catch {
        /* ignore */
      }
    },
  };
})();
