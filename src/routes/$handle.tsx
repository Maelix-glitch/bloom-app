/**
 * /@username — the public face of a Bloom space. Data comes from the
 * security-definer function which returns ONLY public fields, so this page
 * cannot leak anything even by construction.
 */

import { useEffect, useMemo, useState } from "react";

import profileCss from "../styles/profile.css?url";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";

import {
  loadPublicProfile,
  objectUrl,
  type PublicProfileResponse,
} from "@/lib/profile/profileService";
import {
  normalizeAccent,
  normalizeHighlightIcon,
  type BloomAccent,
  type HighlightItem,
  type Story,
} from "@/lib/profile/types";
import { BloomHeader } from "@/components/BloomHeader";
import { Atmosphere } from "@/components/mood/Atmosphere";
import { accentVar } from "@/components/mood/primitives";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import type { ProfileViewModel } from "@/components/profile/ProfileView";
import { parseFeatured } from "@/lib/profile/profileService";
import { sanitizeAdjustments, sanitizeElements } from "@/lib/stories/elements";
import { supabase } from "@/lib/supabase";

const HANDLE_RE = /^@?[a-z0-9_]{3,30}$/;

export const Route = createFileRoute("/$handle")({
  head: ({ params }: { params: { handle: string } }) => ({
    links: [{ rel: "stylesheet", href: profileCss }],
    meta: [{ title: `Bloom — @${params.handle.replace(/^@/, "")}` }],
  }),
  loader: ({ params }) => {
    const handle = params.handle.replace(/^@/, "").toLowerCase();
    if (!HANDLE_RE.test(handle) || handle === "profile") {
      throw notFound();
    }
    return { handle };
  },
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { handle } = Route.useLoaderData() as { handle: string };

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "retry" }
    | { status: "done"; payload: PublicProfileResponse | null }
  >({ status: "loading" });

  useEffect(() => {
    if (state.status !== "loading" && state.status !== "retry") return;
    let alive = true;
    void (async () => {
      try {
        const result = await loadPublicProfile(handle);
        if (!alive) return;
        if (result.status === "not-found") {
          setState({ status: "done", payload: null });
        } else if (result.status === "private") {
          setState({ status: "done", payload: { private: true, username: handle } });
        } else {
          setState({ status: "done", payload: result.data as PublicProfileResponse });
        }
      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, [handle, state.status]);

  /* A signed-in visitor can react, reply, and gift — their own identity. */
  const [visitor, setVisitor] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (!userId) return;
        const { data: row, error } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();
        if (!alive) return;
        if (error) return;
        setVisitor({
          id: userId,
          name:
            row && typeof row === "object" && "display_name" in row
              ? String((row as { display_name: unknown }).display_name ?? "Someone")
              : "Someone",
        });
      } catch {
        /* signed-out experience */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const model = useMemo<ProfileViewModel | null>(() => {
    if (state.status !== "done" || !state.payload || state.payload.private) return null;
    return mapPublicProfile(state.payload, handle);
  }, [state, handle]);

  return (
    <div
      className="relative min-h-screen bg-background text-foreground"
      style={
        model
          ? {
              ["--profile-accent" as string]: accentVar[model.identity.accent],
              ["--profile-accent-soft" as string]: `color-mix(in oklab, ${accentVar[model.identity.accent]} 10%, transparent)`,
              ["--profile-accent-border" as string]: `color-mix(in oklab, ${accentVar[model.identity.accent]} 38%, transparent)`,
            }
          : undefined
      }
    >
      <BloomHeader />
      <Atmosphere />
      <main className="relative mx-auto w-full max-w-[720px] px-5 pb-24 pt-12 sm:px-8">
        {state.status === "loading" ? (
          <div className="flex items-center justify-center gap-3 py-32 text-faint">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span className="mono text-[11px] uppercase tracking-[0.08em]">Opening the space…</span>
          </div>
        ) : state.status === "error" ? (
          <div className="panel mx-auto mt-14 max-w-[480px] p-8 text-center">
            <p className="display text-[20px]">Something went wrong.</p>
            <button
              type="button"
              onClick={() => setState({ status: "retry" })}
              className="mono mt-4 rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground"
            >
              Try again
            </button>
          </div>
        ) : state.status === "done" && state.payload?.private ? (
          <div className="mx-auto mt-14 max-w-[480px] rounded-2xl border border-border bg-surface/40 p-10 text-center">
            <Lock className="mx-auto size-5 text-faint" strokeWidth={1.5} aria-hidden />
            <h1 className="display mt-5 text-[24px]">This space is private.</h1>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
              @{handle} keeps their Bloom to themselves right now — and that's okay.
            </p>
            <Link
              to="/"
              className="mono mt-6 inline-block rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to Bloom
            </Link>
          </div>
        ) : !model ? (
          <div className="mx-auto mt-14 max-w-[480px] text-center">
            <h1 className="display text-[24px]">No Bloom space here yet.</h1>
            <p className="mt-2.5 text-[13.5px] text-muted-foreground">
              @{handle} isn't a name in Bloom.
            </p>
            <Link
              to="/"
              className="mono mt-6 inline-block rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to Bloom
            </Link>
          </div>
        ) : (
          <PublicProfileView
            model={model}
            visitorId={visitor?.id ?? null}
            visitorName={visitor?.name ?? null}
          />
        )}
      </main>
    </div>
  );
}

type RawStory = {
  id: string;
  kind: string;
  title: string | null;
  body: string | null;
  media_url: string | null;
  media_type?: string | null;
  duration_ms?: number | null;
  elements?: unknown;
  filter_id?: string | null;
  adjustments?: unknown;
  background_id?: string | null;
  music?: unknown;
  alt_text?: string | null;
  audience?: string | null;
  accent: string | null;
  created_at: string;
  expires_at: string;
};

function mapStory(raw: RawStory): Story {
  const mediaType =
    raw.media_type === "video" || raw.media_type === "none" || raw.media_type === "image"
      ? raw.media_type
      : raw.media_url
        ? "image"
        : "none";
  return {
    id: raw.id,
    kind: (
      ["text", "photo", "video", "mood", "reflection", "win", "reward", "milestone"] as const
    ).includes(raw.kind as Story["kind"])
      ? (raw.kind as Story["kind"])
      : "text",
    title: raw.title ?? "",
    body: raw.body ?? "",
    mediaPath: raw.media_url ? raw.media_url.replace(/^profile-media\//, "") : null,
    mediaWidth: null,
    mediaHeight: null,
    accent: normalizeAccent(raw.accent),
    atmosphere: "quiet",
    createdAt: raw.created_at,
    expiresAt: raw.expires_at,
    visibility: "public",
    deletedAt: null,
    mediaType,
    durationMs: typeof raw.duration_ms === "number" ? raw.duration_ms : null,
    elements: sanitizeElements(raw.elements),
    filterId: typeof raw.filter_id === "string" ? raw.filter_id : null,
    adjustments: sanitizeAdjustments(raw.adjustments),
    backgroundId: typeof raw.background_id === "string" ? raw.background_id : null,
    music: parsePublicMusic(raw.music),
    altText: typeof raw.alt_text === "string" ? raw.alt_text.slice(0, 300) : null,
    audience: raw.audience === "close" ? "close" : "all",
  };
}

function parsePublicMusic(value: unknown): Story["music"] {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const title = v["title"];
  const artist = v["artist"];
  if (typeof title !== "string" || typeof artist !== "string") return null;
  const trackId = v["trackId"];
  const src = v["src"];
  return {
    trackId: typeof trackId === "string" ? trackId.slice(0, 120) : "catalog",
    title: title.slice(0, 120),
    artist: artist.slice(0, 120),
    startMs: Math.max(0, Number(v["startMs"]) || 0),
    durationMs: Math.max(1000, Math.min(60000, Number(v["durationMs"]) || 15000)),
    ...(typeof src === "string" && src ? { src: src.slice(0, 2048) } : {}),
  };
}

function mapPublicProfile(payload: PublicProfileResponse, handle: string): ProfileViewModel {
  const accent = normalizeAccent(payload.accent) as BloomAccent;
  const stories = Array.isArray(payload.stories)
    ? (payload.stories as RawStory[]).map(mapStory)
    : [];
  const highlights: HighlightItem[] = Array.isArray(payload.highlights)
    ? (
        payload.highlights as {
          id: string;
          name: string;
          accent: string | null;
          icon?: string | null;
          created_at?: string;
          stories?: RawStory[];
        }[]
      ).map((h) => ({
        id: h.id,
        name: h.name,
        accent: normalizeAccent(h.accent),
        icon: normalizeHighlightIcon(h.icon),
        createdAt: h.created_at ?? "",
        stories: Array.isArray(h.stories) ? h.stories.map(mapStory) : [],
      }))
    : [];

  const featured = parseFeatured(payload.featured);

  return {
    identity: {
      displayName: payload.display_name ?? "A person in Bloom",
      username: payload.username ?? handle,
      bio: payload.bio ?? null,
      avatarPath: payload.avatar_url ? payload.avatar_url.replace(/^profile-media\//, "") : null,
      accent,
      featured,
    },
    stories,
    highlights: highlights.filter((h) => h.stories.length > 0),
    featured:
      featured?.kind === "story"
        ? (() => {
            const story = stories.find((s) => s.id === featured.id);
            return story
              ? {
                  eyebrow: "A shared moment",
                  title: story.title || "Untitled moment",
                  body: story.body || undefined,
                  date: new Date(story.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  }),
                  accent: story.accent,
                }
              : null;
          })()
        : null,
    canBeShared: true,
  };
}
