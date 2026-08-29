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
          <PublicProfileView model={model} />
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
  accent: string | null;
  created_at: string;
  expires_at: string;
};

function mapStory(raw: RawStory): Story {
  return {
    id: raw.id,
    kind: (["text", "photo", "mood", "reflection", "win", "reward", "milestone"] as const).includes(
      raw.kind as Story["kind"],
    )
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
