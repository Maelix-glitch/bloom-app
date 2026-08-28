import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Archive, RefreshCcw, Sparkles } from "lucide-react";
import { toast, Toaster } from "sonner";

import { useProfileSpace } from "@/hooks/useProfileSpace";
import { BloomHeader } from "@/components/BloomHeader";
import { Atmosphere } from "@/components/mood/Atmosphere";
import { Panel, Reveal, SectionHead, accentVar } from "@/components/mood/primitives";
import { cn } from "@/lib/utils";
import { EMOTION_MAP } from "@/lib/mood/types";
import { seenStories } from "@/lib/profile/drafts";
import { isStoryActive, type Story } from "@/lib/profile/types";
import type { CreateStoryInput } from "@/lib/profile/storyService";
import { buildViewModel, resolveFeatured } from "@/components/profile/ProfileView";
import type { ProfileEditorSave } from "@/components/profile/ProfileEditor";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { PrivacySheet } from "@/components/profile/PrivacySheet";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { FeaturedCard, FeaturePrompt, FeaturedPicker } from "@/components/profile/FeaturedMoment";
import { JourneySection } from "@/components/profile/JourneySection";
import { AccountSection } from "@/components/profile/AccountSection";
import { SignedOutProfile } from "@/components/profile/SignedOutProfile";
import { StoryRail } from "@/components/stories/StoryRail";
import { StoryComposer } from "@/components/stories/StoryComposer";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { StoryArchive } from "@/components/stories/StoryArchive";
import { HighlightRail } from "@/components/highlights/HighlightRail";
import { HighlightComposer } from "@/components/highlights/HighlightComposer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { z } from "zod";

const profileSearchSchema = z.object({
  story: z.string().optional(),
});

export type ProfileSearch = z.infer<typeof profileSearchSchema>;

export const Route = createFileRoute("/profile")({
  validateSearch: (search: Record<string, unknown>) => profileSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Bloom — Profile" },
      {
        name: "description",
        content:
          "Your private corner of Bloom: identity, moments, highlights, and everything you choose to keep.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { story: storyParam } = Route.useSearch();
  const navigate = useNavigate();
  const space = useProfileSpace();

  const [composerSource, setComposerSource] = useState<{
    kind: "mood" | "reflection";
    id: string;
  } | null>(null);
  useEffect(() => {
    if (!storyParam) return;
    const m = /^(mood|reflection):(.+)$/.exec(storyParam);
    if (m) {
      setComposerSource({ kind: m[1] as "mood" | "reflection", id: m[2]! });
      setComposerOpen(true);
    }
    void navigate({ to: "/profile", search: {}, replace: true });
  }, [storyParam, navigate]);
  const {
    identity,
    authState,
    userId,
    storiesByAge,
    highlightsBlock,
    journey,
    moodBlock,
    rewardsBlock,
  } = space;

  const [editorOpen, setEditorOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [viewer, setViewer] = useState<{ stories: Story[]; startIndex: number } | null>(null);
  const [highlightEditor, setHighlightEditor] = useState<{
    id: string | null;
    preselect: string | null;
  } | null>(null);
  const [seenIds, setSeenIds] = useState<ReadonlySet<string>>(() => new Set());
  const online = useOnlineStatus();

  // after a magic-link sign-in resolves, the dialog steps aside on its own
  useEffect(() => {
    if (authState === "signed-in") setSignInOpen(false);
  }, [authState]);

  // watch/unwatch state hydrates after mount (SSR-safe)
  useEffect(() => {
    const active = storiesByAge?.active ?? [];
    setSeenIds(new Set(active.filter((s) => seenStories.has(s.id)).map((s) => s.id)));
  }, [storiesByAge]);
  const markSeen = useCallback((story: Story) => {
    seenStories.mark(story.id);
    setSeenIds((prev) => (prev.has(story.id) ? prev : new Set([...prev, story.id])));
  }, []);

  const accent = identity?.identity.accent ?? "violet";

  const offlineToastShown = useRef(false);
  useEffect(() => {
    if (!online && !offlineToastShown.current) {
      offlineToastShown.current = true;
      toast("You're offline.", { description: "Your drafts are kept." });
    } else if (online) {
      offlineToastShown.current = false;
    }
  }, [online]);

  /* profile share */
  const handleShare = useCallback(async () => {
    if (!identity?.identity.username) {
      toast("Pick a @username first.", {
        description: "It becomes the address of your space.",
        action: { label: "Add one", onClick: () => setEditorOpen(true) },
      });
      return;
    }
    const url = `${window.location.origin}/@${identity.identity.username}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${identity.identity.displayName} on Bloom`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Profile link copied.");
    } catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "AbortError")
        return;
      try {
        window.prompt("Copy your profile link:", url);
      } catch {
        toast.error("Couldn't copy the link just now.");
      }
    }
  }, [identity]);

  /* story actions */
  const publishStory = useCallback(
    async (input: CreateStoryInput) => {
      try {
        await space.actions.publishStory(input);
        toast(input.visibility === "public" ? "Story published." : "Saved privately.");
      } catch (error) {
        throw error instanceof Error && error.message
          ? error
          : new Error("Couldn't publish your story.");
      }
    },
    [space.actions],
  );

  const deleteStory = useCallback(
    async (story: Story) => {
      try {
        const { undo } = await space.actions.removeStory(story);
        toast("Story deleted.", {
          action: {
            label: "Undo",
            onClick: () => {
              void undo().catch(() => toast.error("Couldn't bring that back."));
            },
          },
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't delete that just now.");
      }
    },
    [space.actions],
  );

  const shareAgain = useCallback(
    async (story: Story) => {
      try {
        await space.actions.shareAgain(story);
        toast("Shared again for 24 hours.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't share that again.");
      }
    },
    [space.actions],
  );

  const saveIdentity = useCallback(
    async (patch: ProfileEditorSave) => {
      await space.actions.saveIdentity({
        displayName: patch.displayName,
        username: patch.username,
        bio: patch.bio,
        accent: patch.accent,
        featured: identity?.identity.featured ?? null,
      });
    },
    [space.actions, identity],
  );

  /* journey sources for the featured picker and composer */
  const milestonesList = useMemo(() => {
    if (journey.status !== "ready") return [];
    return journey.milestones.achieved;
  }, [journey]);

  const featuredSources = useMemo(() => {
    const reflections = (moodBlock?.status === "ready" ? moodBlock.data : [])
      .filter((e) => e.note && e.note.trim())
      .slice(-12)
      .reverse()
      .map((e) => ({
        id: e.id,
        title: `Reflection · ${new Date(e.timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
        body: e.note!.trim(),
        date: new Date(e.timestamp).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        accent: EMOTION_MAP[e.emotions[0] ?? "neutral"].accent,
      }));
    const rewards = (rewardsBlock?.status === "ready" ? rewardsBlock.data : []).map((r) => ({
      id: r.id,
      title: r.title,
      date: r.claimed_at
        ? new Date(r.claimed_at).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "",
    }));
    return {
      stories: storiesByAge ? [...storiesByAge.active, ...storiesByAge.archived] : [],
      reflections,
      rewards,
      milestones: milestonesList,
    };
  }, [moodBlock, rewardsBlock, storiesByAge, milestonesList]);

  const featuredContent = useMemo(
    () => (identity ? resolveFeatured(identity.identity.featured, featuredSources) : null),
    [identity, featuredSources],
  );

  const previewModel = identity
    ? buildViewModel({
        identity: identity.identity,
        allStories: featuredSources.stories,
        highlights: highlightsBlock?.status === "ready" ? highlightsBlock.data : [],
        privacyPublic: identity.privacy.profileVisibility === "public",
        sources: featuredSources,
      })
    : null;

  const editingHighlight =
    highlightEditor?.id != null
      ? highlightsBlock?.status === "ready"
        ? (highlightsBlock.data.find((h) => h.id === highlightEditor.id) ?? null)
        : null
      : null;

  /* ------------------------------- render ------------------------------- */
  const content = (
    <div
      className="relative min-h-screen bg-background text-foreground"
      style={{
        ["--profile-accent" as string]: accentVar[accent],
        ["--profile-accent-soft" as string]: `color-mix(in oklab, ${accentVar[accent]} 10%, transparent)`,
        ["--profile-accent-border" as string]: `color-mix(in oklab, ${accentVar[accent]} 38%, transparent)`,
        ["--profile-accent-glow" as string]: `0 16px 44px -26px color-mix(in oklab, ${accentVar[accent]} 65%, transparent)`,
      }}
    >
      <BloomHeader />
      <Atmosphere />

      <main className="relative mx-auto w-full max-w-[1020px] px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        {authState === "checking" ? (
          <ProfileSkeleton />
        ) : !identity ? (
          <div className="panel mx-auto mt-14 max-w-[560px] p-8 text-center">
            <p className="display text-[20px]">Your space is quiet right now.</p>
            <p className="mt-2 text-[13.5px] text-muted-foreground">
              {space.identityBlock?.status === "error"
                ? space.identityBlock.message
                : "Reading your profile…"}
            </p>
            <button
              type="button"
              onClick={space.actions.refresh}
              className="mono mt-5 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <RefreshCcw className="size-3" aria-hidden /> Try again
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {space.identityBlock?.status === "error" ? (
              <p className="mb-6 rounded-xl border border-amber/30 bg-amber/5 px-4 py-2.5 text-center text-[12.5px] text-amber">
                Some of your Bloom space couldn't load — what's below may be out of date.{" "}
                <button
                  type="button"
                  onClick={space.actions.refresh}
                  className="underline underline-offset-2"
                >
                  Refresh
                </button>
              </p>
            ) : null}

            {authState === "signed-out" ? (
              <div className="mb-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-xl border border-border bg-surface/50 px-4 py-2.5 text-center text-[12.5px] text-muted-foreground">
                <span>
                  You're looking at a preview of your Bloom space — real empty state, nothing saved.
                </span>
                <button
                  type="button"
                  onClick={() => setSignInOpen(true)}
                  className="text-foreground underline underline-offset-2 transition-colors hover:text-[var(--profile-accent)]"
                >
                  Sign in
                </button>
              </div>
            ) : null}

            <Reveal>
              <ProfileHero
                identity={identity.identity}
                isSignedIn={authState === "signed-in"}
                onSignIn={() => setSignInOpen(true)}
                completion={
                  journey.status === "ready"
                    ? journey.completeness
                    : { done: 0, total: 5, show: false }
                }
                onEdit={() => setEditorOpen(true)}
                onShare={() => void handleShare()}
                onPreview={() => setPreviewOpen(true)}
                onOpenArchive={() => setArchiveOpen(true)}
                onOpenPrivacy={() => setPrivacyOpen(true)}
                onSignOut={() => {
                  void space.actions.signOut();
                }}
              />
            </Reveal>

            {/* Stories */}
            <Reveal delay={60}>
              <section aria-label="Stories" className="mt-14">
                <SectionHead
                  eyebrow="Moments"
                  title="Stories"
                  right={
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setArchiveOpen(true)}
                        className="mono inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                      >
                        <Archive className="size-3" aria-hidden /> Archive
                      </button>
                    </div>
                  }
                />
                {storiesByAge ? (
                  <StoryRail
                    stories={storiesByAge.active}
                    displayName={identity.identity.displayName}
                    avatarPath={identity.identity.avatarPath}
                    accent={accent}
                    seenIds={seenIds}
                    onCreate={() => setComposerOpen(true)}
                    onOpen={(index) =>
                      setViewer({ stories: storiesByAge.active, startIndex: index })
                    }
                  />
                ) : (
                  <RailSkeleton />
                )}
                {space.storiesBlock?.status === "error" ? (
                  <p className="mt-3 text-[12.5px] text-faint">
                    {space.storiesBlock.message}{" "}
                    <button
                      type="button"
                      onClick={space.actions.refresh}
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Try again
                    </button>
                  </p>
                ) : null}
              </section>
            </Reveal>

            {/* Highlights */}
            <Reveal delay={60}>
              <section aria-label="Highlights" className="mt-14">
                <SectionHead
                  eyebrow="Kept"
                  title="Highlights"
                  sub="The moments you decided to keep beyond 24 hours."
                />
                {highlightsBlock?.status === "ready" ? (
                  <HighlightRail
                    highlights={highlightsBlock.data}
                    onOpen={(i) => {
                      const h = highlightsBlock.data[i];
                      if (h && h.stories.length > 0)
                        setViewer({ stories: h.stories, startIndex: 0 });
                    }}
                    onCreate={() => setHighlightEditor({ id: null, preselect: null })}
                    onEdit={(h) => setHighlightEditor({ id: h.id, preselect: null })}
                  />
                ) : highlightsBlock?.status === "error" ? (
                  <p className="text-[12.5px] text-faint">
                    {highlightsBlock.message}{" "}
                    <button
                      type="button"
                      onClick={space.actions.refresh}
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Try again
                    </button>
                  </p>
                ) : (
                  <RailSkeleton />
                )}
              </section>
            </Reveal>

            {/* Featured */}
            <Reveal delay={60}>
              <section aria-label="Featured moment" className="mt-14">
                <SectionHead
                  eyebrow="You, chosen"
                  title="Featured moment"
                  right={
                    <FeaturePrompt
                      hasFeatured={Boolean(featuredContent)}
                      onPick={() => setFeaturedOpen(true)}
                      onClear={() =>
                        void space.actions
                          .setFeatured(null)
                          .then(() => toast("Removed from your profile."))
                      }
                    />
                  }
                />
                {featuredContent ? (
                  <FeaturedCard content={featuredContent} accent={accent} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setFeaturedOpen(true)}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-dashed border-border px-5 py-5 text-left transition-colors hover:border-[color:var(--profile-accent-border)]"
                  >
                    <Sparkles
                      className="size-4 shrink-0 text-faint transition-colors group-hover:text-[var(--profile-accent)]"
                      aria-hidden
                    />
                    <span>
                      <span className="block text-[13.5px] font-medium">
                        Feature something that represents you
                      </span>
                      <span className="block text-[12.5px] text-muted-foreground">
                        A story, a reflection, a reward, a milestone — only one thing, chosen
                        deliberately.
                      </span>
                    </span>
                  </button>
                )}
              </section>
            </Reveal>

            {/* Journey */}
            <Reveal delay={60}>
              <section aria-label="Your Bloom journey" className="mt-14">
                <SectionHead eyebrow="Quietly" title="Your Bloom journey" />
                <Panel className="p-6 sm:p-8" sheen={false}>
                  <JourneySection journey={journey} accent={accent} />
                </Panel>
              </section>
            </Reveal>

            {/* Account */}
            <Reveal delay={60}>
              <section aria-label="Account" className="mt-14">
                <AccountSection
                  account={{ email: identity.email, memberSince: identity.memberSince }}
                  privacy={identity.privacy}
                  onOpenPrivacy={() => setPrivacyOpen(true)}
                />
              </section>
            </Reveal>

            <footer className="mt-16 border-t border-border pt-5">
              <p className="mono text-[10px] uppercase tracking-[0.08em] text-faint">
                Bloom · your records stay private unless you choose otherwise
              </p>
            </footer>
          </div>
        )}
      </main>

      {/* overlays */}
      {identity ? (
        <>
          <ProfileEditor
            open={editorOpen}
            onClose={() => setEditorOpen(false)}
            identity={identity.identity}
            onSave={saveIdentity}
            onCommitAvatar={space.actions.commitAvatar}
            onRemoveAvatar={space.actions.clearAvatar}
          />
          <PrivacySheet
            open={privacyOpen}
            onClose={() => setPrivacyOpen(false)}
            privacy={identity.privacy}
            hasUsername={Boolean(identity.identity.username)}
            onSave={space.actions.savePrivacySettings}
            onPreview={() => {
              setPrivacyOpen(false);
              setPreviewOpen(true);
            }}
          />
          <StoryComposer
            open={composerOpen}
            userId={userId ?? "preview"}
            defaultAccent={accent}
            defaultVisibility={identity.privacy.storyVisibility}
            moodEntries={moodBlock?.status === "ready" ? moodBlock.data : []}
            rewards={rewardsBlock?.status === "ready" ? rewardsBlock.data : []}
            milestones={milestonesList}
            initialSource={composerSource}
            onPublish={publishStory}
            onClose={() => {
              setComposerOpen(false);
              setComposerSource(null);
            }}
          />
          <StoryArchive
            open={archiveOpen}
            onClose={() => setArchiveOpen(false)}
            archived={storiesByAge?.archived ?? []}
            active={storiesByAge?.active.filter((s) => isStoryActive(s)) ?? []}
            onView={(story) => {
              setArchiveOpen(false);
              setViewer({ stories: [story], startIndex: 0 });
            }}
            onShareAgain={(story) => void shareAgain(story)}
            onDelete={(story) => void deleteStory(story)}
            onAddToHighlight={(story) => {
              setArchiveOpen(false);
              setHighlightEditor({ id: null, preselect: story.id });
            }}
          />
          <HighlightComposer
            open={highlightEditor !== null}
            editing={editingHighlight}
            allStories={featuredSources.stories}
            preselectedStoryId={highlightEditor?.preselect ?? null}
            defaultAccent={accent}
            onSave={space.actions.saveHighlight}
            onDelete={space.actions.removeHighlight}
            onClose={() => setHighlightEditor(null)}
          />
          <FeaturedPicker
            open={featuredOpen}
            onClose={() => setFeaturedOpen(false)}
            current={identity.identity.featured}
            sources={featuredSources}
            stories={featuredSources.stories}
            onSelect={async (featured) => {
              await space.actions.setFeatured(featured);
              toast(featured ? "Featured on your profile." : "Removed.");
            }}
          />
        </>
      ) : null}

      <StoryViewer
        target={viewer}
        viewerName={identity?.identity.displayName ?? "You"}
        viewerAvatarPath={identity?.identity.avatarPath ?? null}
        accent={accent}
        onSeen={markSeen}
        onDelete={
          viewer
            ? (story) => {
                void deleteStory(story).then(() => {
                  setViewer((v) =>
                    v && v.stories.length <= 1
                      ? null
                      : v
                        ? { ...v, stories: v.stories.filter((s) => s.id !== story.id) }
                        : null,
                  );
                });
              }
            : undefined
        }
        onClose={() => setViewer(null)}
      />

      <Dialog open={previewOpen} onOpenChange={(o) => !o && setPreviewOpen(false)}>
        <DialogContent className="top-1/2 left-1/2 max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-[680px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] border-border bg-background">
          <DialogTitle className="sr-only">Profile preview</DialogTitle>
          {previewModel ? <PublicProfileView model={previewModel} asPreview /> : null}
        </DialogContent>
      </Dialog>

      <Dialog open={signInOpen} onOpenChange={(o) => !o && setSignInOpen(false)}>
        <DialogContent className="top-1/2 left-1/2 w-[calc(100%-1.5rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border-border bg-background">
          <DialogTitle className="sr-only">Sign in to Bloom</DialogTitle>
          <SignedOutProfile compact onSendMagicLink={space.actions.sendMagicLink} />
        </DialogContent>
      </Dialog>

      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "var(--surface-2)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          },
        }}
      />
    </div>
  );

  return content;
}

function useOnlineStatus(): boolean {
  const [status, setStatus] = useState(true);
  useEffect(() => {
    setStatus(navigator.onLine);
    const on = () => setStatus(true);
    const off = () => setStatus(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return status;
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse pt-14" aria-label="Loading your profile" role="status">
      <div className="flex flex-col items-center gap-3">
        <div className="size-[116px] rounded-full bg-surface-3/60" />
        <div className="mt-2 h-7 w-44 rounded-lg bg-surface-3/50" />
        <div className="h-3.5 w-28 rounded bg-surface-3/40" />
        <div className="mt-1 h-3.5 w-64 rounded bg-surface-3/30" />
        <div className="mt-5 flex gap-2.5">
          <div className="h-10 w-32 rounded-full bg-surface-3/50" />
          <div className="h-10 w-20 rounded-full bg-surface-3/40" />
        </div>
      </div>
      <div className="mt-16 flex gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div className="size-[62px] rounded-full bg-surface-3/40" />
            <div className="h-2.5 w-12 rounded bg-surface-3/30" />
          </div>
        ))}
      </div>
      <p className="sr-only">Loading your profile…</p>
    </div>
  );
}

function RailSkeleton() {
  return (
    <div className={cn("flex gap-4 opacity-60")} aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="size-[62px] animate-pulse rounded-full bg-surface-3/40" />
          <div className="h-2.5 w-12 animate-pulse rounded bg-surface-3/30" />
        </div>
      ))}
    </div>
  );
}
