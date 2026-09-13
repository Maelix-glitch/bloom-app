import { get, set, del } from "idb-keyval";
import type { StoryElement, StoryAdjustments } from "./types";
import type { DrawStroke } from "@/components/stories/DrawLayer";
import type { StoryKind } from "@/lib/profile/types";

const DRAFT_KEY = "bloom.story.editor.draft.v3";

export interface EditorDraft {
  userId: string;
  savedAt: number;
  source: {
    base: "photo" | "video" | "background";
    photoFile?: Blob | null;
    photoDataUrl?: string | null;
    photoWidth?: number;
    photoHeight?: number;
    videoFile?: Blob | null;
    videoDurationMs?: number;
    videoWidth?: number;
    videoHeight?: number;
    videoThumbnail?: string | null;
    backgroundId?: string;
    storyKind?: StoryKind;
  };
  elements: StoryElement[];
  strokes: DrawStroke[];
  filterId: string;
  adjustments: StoryAdjustments;
  captionTitle: string;
  captionBody: string;
  altText: string;
}

export const editorDraftStore = {
  async read(userId: string): Promise<EditorDraft | null> {
    if (typeof window === "undefined") return null;
    try {
      const draft = await get<EditorDraft>(DRAFT_KEY);
      if (!draft || draft.userId !== userId) return null;
      // Expire drafts older than 7 days
      if (Date.now() - (draft.savedAt || 0) > 7 * 86400000) {
        await this.clear();
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  },

  async write(draft: EditorDraft): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      draft.savedAt = Date.now();
      await set(DRAFT_KEY, draft);
    } catch (e) {
      console.error("Draft save failed:", e);
    }
  },

  async clear(): Promise<void> {
    if (typeof window === "undefined") return;
    try {
      await del(DRAFT_KEY);
    } catch {
      // ignore
    }
  },
};
