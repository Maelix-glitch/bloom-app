/**
 * InteractionSheets — the warm end of the story loop.
 * Quick reactions with a heartbeat pop, private replies, free Bloom gifts
 * with a petal burst, and the owner's quiet insights (viewers, replies,
 * gifts, responses). Every sheet survives backend failure with local state.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Gift as GiftIcon, Heart, MessageCircle, Send, Trash2 } from "lucide-react";

import { StorySheet } from "./StorySheet";
import { GIFT_META, REACTION_META } from "@/lib/stories/catalogs";
import {
  STORY_GIFTS,
  STORY_REACTIONS,
  type StoryGiftKind,
  type StoryReactionKind,
} from "@/lib/stories/types";
import {
  getReactionState,
  listGifts,
  listReplies,
  listViewers,
  sendGift,
  sendReply,
  setReaction,
  type ReactionState,
  type StoryViewerEntry,
} from "@/lib/stories/interactions";
import { storyAge } from "@/lib/stories/time";
import type { Story } from "@/lib/profile/types";
import { isStoryActive } from "@/lib/profile/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ------------------------------ reaction bar ---------------------------- */
/* Instagram-exact quick reactions — horizontal pill with emojis like IG */

export function ReactionBar({
  storyId,
  userId,
  userName,
  enabled,
  onPop,
}: {
  storyId: string;
  userId: string | null;
  userName?: string | null | undefined;
  enabled: boolean;
  onPop: (glyph: string) => void;
}) {
  const [state, setState] = useState<ReactionState>({ mine: null, counts: {}, total: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void getReactionState(storyId, userId).then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, [storyId, userId]);

  const react = useCallback(
    async (kind: StoryReactionKind) => {
      if (!enabled || busy) return;
      if (!userId) {
        toast("Sign in to react to stories.");
        return;
      }
      setBusy(true);
      try {
        const next = await setReaction(storyId, userId, kind, userName);
        setState(next);
        if (next.mine === kind) onPop(REACTION_META[kind].glyph);
      } finally {
        setBusy(false);
      }
    },
    [enabled, busy, userId, storyId, userName, onPop],
  );

  if (!enabled) return null;

  return (
    <div className="flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1" role="group" aria-label="React to this story">
      {STORY_REACTIONS.map((kind) => {
        const meta = REACTION_META[kind];
        const count = state.counts[kind] ?? 0;
        const active = state.mine === kind;
        return (
          <button
            key={kind}
            type="button"
            onClick={() => void react(kind)}
            disabled={busy}
            aria-label={`${meta.label}${count ? `, ${count}` : ""}`}
            aria-pressed={active}
            title={meta.label}
            className={cn(
              "relative grid size-8 place-items-center rounded-full text-[20px] leading-none transition-all active:scale-90",
              active ? "bg-white scale-110 ring-2 ring-white" : "hover:bg-white/10",
            )}
          >
            <span aria-hidden>{meta.glyph}</span>
            {count > 0 ? (
              <span className="absolute -right-1 -top-1 grid min-w-[14px] place-items-center rounded-full bg-[#ff3040] px-1 text-[8px] font-bold text-white leading-none h-[14px]">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- reply -------------------------------- */

export function ReplySheet({
  story,
  ownerName,
  userId,
  userName,
  isOwner,
  onClose,
  onSent,
}: {
  story: Story;
  ownerName: string;
  userId: string | null;
  userName?: string | null | undefined;
  isOwner: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const [replies, setReplies] = useState<Awaited<ReturnType<typeof listReplies>>>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void listReplies(story.id, userId)
      .then((r) => alive && setReplies(r))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [story.id, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [replies.length]);

  const send = useCallback(async () => {
    const clean = draft.trim();
    if (!clean || sending) return;
    if (!userId) {
      toast("Sign in to reply to stories.");
      return;
    }
    setSending(true);
    try {
      const record = await sendReply(story.id, userId, clean, userName);
      setReplies((prev) => [...prev, record]);
      setDraft("");
      onSent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send that reply.");
    } finally {
      setSending(false);
    }
  }, [draft, sending, userId, story.id, userName, onSent]);

  return (
    <StorySheet
      title={isOwner ? "Replies" : `Reply to ${ownerName}`}
      subtitle={isOwner ? "Only you can see these." : "Only they can see your reply."}
      onClose={onClose}
      footer={
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 500))}
            placeholder={isOwner ? "Reply…" : `Reply to ${ownerName}…`}
            maxLength={500}
            aria-label="Write a reply"
            autoFocus
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface/60 px-4 text-[13.5px] outline-none transition-colors placeholder:text-faint/70 focus:border-border-strong"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send reply"
            className="bsheet-primary size-11 shrink-0 !rounded-full !px-0 disabled:opacity-40"
          >
            <Send className="size-4" aria-hidden />
          </button>
        </form>
      }
    >
      {loading ? (
        <div className="flex flex-col gap-2 py-4" role="status" aria-label="Loading replies">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 w-3/4 animate-pulse rounded-2xl bg-surface-2/60" />
          ))}
        </div>
      ) : replies.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-10 text-center">
          <MessageCircle className="size-5 text-faint" aria-hidden />
          <p className="display text-[15px] text-muted-foreground">No replies yet.</p>
          <p className="max-w-[30ch] text-[12.5px] text-faint">
            {isOwner
              ? "When someone answers your story, it lands here."
              : "Say something kind — it goes straight to them."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2 py-2">
          {replies.map((reply) => {
            const mine = reply.userId === userId;
            return (
              <li key={reply.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2.5",
                    mine
                      ? "rounded-br-md bg-[color:var(--profile-accent-soft,var(--surface-3))] text-foreground"
                      : "rounded-bl-md bg-surface-2/80 text-foreground",
                  )}
                >
                  {!mine ? (
                    <p className="mono mb-1 text-[9.5px] uppercase tracking-[0.08em] text-faint">
                      {reply.authorName ?? "Someone"} · {storyAge(reply.createdAt)}
                    </p>
                  ) : null}
                  <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{reply.body}</p>
                </div>
              </li>
            );
          })}
          <div ref={bottomRef} />
        </ul>
      )}
    </StorySheet>
  );
}

/* --------------------------------- gifts -------------------------------- */
/* Instagram-exact GiftSheet — like real IG gifts with stars, gradients, rarity */

export function GiftSheet({
  story,
  ownerName,
  userId,
  userName,
  onClose,
  onSent,
}: {
  story: Story;
  ownerName: string;
  userId: string | null;
  userName?: string | null | undefined;
  onClose: () => void;
  onSent: (gift: StoryGiftKind) => void;
}) {
  const [sending, setSending] = useState<StoryGiftKind | null>(null);
  const [balance] = useState(120); // Mock star balance like IG
  const [selectedTab, setSelectedTab] = useState<"all" | "common" | "rare" | "epic">("all");

  const send = useCallback(
    async (gift: StoryGiftKind) => {
      if (sending) return;
      if (!userId) {
        toast("Sign in to send gifts.");
        return;
      }
      const meta = GIFT_META[gift];
      if (balance < meta.stars) {
        toast(`Not enough stars. Need ${meta.stars}, you have ${balance}`);
        return;
      }
      setSending(gift);
      try {
        await sendGift(story.id, userId, gift, userName);
        onSent(gift);
        toast(`${meta.glyph} ${meta.name} sent to ${ownerName}!`);
        onClose();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't send that gift.");
      } finally {
        setSending(null);
      }
    },
    [sending, userId, story.id, userName, onSent, onClose, ownerName, balance],
  );

  const filteredGifts = STORY_GIFTS.filter((id) => {
    if (selectedTab === "all") return true;
    const meta = GIFT_META[id];
    if (selectedTab === "common") return meta.rarity === "common";
    if (selectedTab === "rare") return meta.rarity === "rare";
    if (selectedTab === "epic") return meta.rarity === "epic" || meta.rarity === "legendary";
    return true;
  });

  return (
    <div className="fixed inset-0 z-[91] flex flex-col justify-end bg-black/60" role="dialog" aria-label="Send gift">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-[16px] bg-[#121212] border-t border-[#262626] animate-[ig-slide-up_0.3s_ease-out]">
        {/* Handle + header — IG exact */}
        <div className="flex flex-col items-center gap-3 px-4 pt-3 pb-4 border-b border-[#262626] shrink-0">
          <div className="h-1 w-9 rounded-full bg-[#363636]" />
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-semibold text-white tracking-[-0.01em]">Gifts</h2>
              <span className="flex items-center gap-1 rounded-full bg-[#262626] px-2.5 py-1 text-[12px] font-medium text-white">
                <span className="text-[12px]">⭐</span> {balance}
              </span>
            </div>
            <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-full bg-[#262626] text-white">
              <span className="text-[18px]">×</span>
            </button>
          </div>
          <p className="w-full text-left text-[13px] text-[#a8a8a8]">Send {ownerName} a gift — they earn from your support</p>
        </div>

        {/* Tabs — Common / Rare / Epic like IG */}
        <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 scrollbar-none border-b border-[#262626]/50">
          {[
            { id: "all", label: "All" },
            { id: "common", label: "Common" },
            { id: "rare", label: "Rare" },
            { id: "epic", label: "Epic" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTab(tab.id as any)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium border transition-all",
                selectedTab === tab.id ? "bg-white text-black border-white" : "bg-[#262626] text-[#a8a8a8] border-[#363636]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Gift grid — Instagram 4-col exact */}
        <div className="flex-1 overflow-y-auto px-3 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-4 gap-2.5">
            {filteredGifts.map((id) => {
              const meta = GIFT_META[id];
              const isSending = sending === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => void send(id)}
                  disabled={sending !== null}
                  aria-label={`Send ${meta.name} for ${meta.stars} stars`}
                  className={cn(
                    "group relative flex flex-col items-center gap-1.5 rounded-[16px] border bg-[#1c1c1e] p-3 pt-4 pb-3 transition-all active:scale-[0.96] disabled:opacity-50",
                    meta.rarity === "legendary" ? "border-[#feda75]/50 shadow-[0_0_12px_rgba(254,218,117,0.15)]" : "border-[#2c2c2e]",
                  )}
                  style={{ background: meta.gradient }}
                >
                  {/* Rarity glow for epic/legendary */}
                  {meta.rarity === "legendary" ? <div className="absolute inset-0 rounded-[16px] bg-gradient-to-br from-white/20 to-transparent pointer-events-none" /> : null}
                  {meta.rarity === "epic" ? <div className="absolute inset-0 rounded-[16px] bg-gradient-to-br from-white/10 to-transparent pointer-events-none" /> : null}

                  <span className={cn("relative text-[36px] leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-transform group-active:scale-110", isSending && "animate-pulse")}>
                    {isSending ? "…" : meta.glyph}
                  </span>
                  <span className="relative text-[11px] font-semibold text-white leading-tight text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{meta.name}</span>
                  <span className="relative flex items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    <span className="text-[9px]">⭐</span> {meta.stars}
                  </span>

                  {/* Legendary crown */}
                  {meta.rarity === "legendary" ? <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-[#feda75] text-[10px]">👑</span> : null}
                </button>
              );
            })}
          </div>

          {/* Info footer like IG */}
          <div className="mt-6 rounded-xl bg-[#1c1c1e] border border-[#2c2c2e] p-3">
            <p className="text-[12px] leading-relaxed text-[#a8a8a8]">
              <span className="font-semibold text-white">How gifts work:</span> Gifts you send turn into Stars for {ownerName}. They can cash out Stars for money. Your support means a lot! ⭐
            </p>
          </div>
        </div>
      </div>
      <style>{`@keyframes ig-slide-up { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
    </div>
  );
}

/* ------------------------------ owner insights --------------------------- */

export function StoryInsightsSheet({
  story,
  userId,
  onClose,
  onDelete,
  onShareAgain,
  onAddToHighlight,
}: {
  story: Story;
  userId: string | null;
  onClose: () => void;
  onDelete: () => void;
  onShareAgain?: (() => void) | undefined;
  onAddToHighlight?: (() => void) | undefined;
}) {
  const [tab, setTab] = useState<"views" | "replies" | "gifts">("views");
  const [viewers, setViewers] = useState<StoryViewerEntry[]>([]);
  const [reactions, setReactions] = useState<ReactionState>({ mine: null, counts: {}, total: 0 });
  const [replyCount, setReplyCount] = useState(0);
  const [giftCount, setGiftCount] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let alive = true;
    void listViewers(story.id).then((v) => alive && setViewers(v));
    void getReactionState(story.id, userId).then((r) => alive && setReactions(r));
    void listReplies(story.id, userId).then((r) => alive && setReplyCount(r.length));
    void listGifts(story.id, userId).then((g) => alive && setGiftCount(g.length));
    return () => {
      alive = false;
    };
  }, [story.id, userId]);

  const active = isStoryActive(story);

  return (
    <StorySheet
      title="Story insights"
      subtitle={active ? "Who's seen your moment." : "This story has settled into your archive."}
      onClose={onClose}
      footer={
        confirmDelete ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-muted-foreground">Delete this story?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="bsheet-ghost"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[color:var(--destructive)] px-4 text-[13px] font-semibold text-white"
              >
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {!active && onShareAgain ? (
              <button
                type="button"
                onClick={onShareAgain}
                className="bsheet-primary h-10 px-4 text-[12.5px]"
              >
                Share again · 24h
              </button>
            ) : null}
            {onAddToHighlight ? (
              <button
                type="button"
                onClick={onAddToHighlight}
                className="bsheet-ghost h-10 px-4 text-[12.5px]"
              >
                Add to highlight
              </button>
            ) : null}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete story"
              className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-rose/15 hover:text-rose"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )
      }
    >
      {/* counts */}
      <div className="grid grid-cols-4 gap-2 py-1">
        {[
          { icon: Eye, label: "Views", value: viewers.length },
          { icon: Heart, label: "Reacts", value: reactions.total },
          { icon: MessageCircle, label: "Replies", value: replyCount },
          { icon: GiftIcon, label: "Gifts", value: giftCount },
        ].map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface/60 px-2 py-3"
          >
            <s.icon className="size-3.5 text-faint" aria-hidden />
            <span className="display text-[19px] leading-none">{s.value}</span>
            <span className="mono text-[9px] uppercase tracking-[0.08em] text-faint">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-1" role="tablist" aria-label="Insight details">
        {(["views", "replies", "gifts"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="se-tray-tab capitalize"
            data-active={tab === t}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="py-3">
        {tab === "views" ? <ViewersList viewers={viewers} /> : null}
        {tab === "replies" ? <RepliesList storyId={story.id} userId={userId} /> : null}
        {tab === "gifts" ? <GiftsList storyId={story.id} userId={userId} /> : null}
      </div>
    </StorySheet>
  );
}

function ViewersList({ viewers }: { viewers: StoryViewerEntry[] }) {
  if (viewers.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-faint">
        No views yet — moments take their time.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {viewers.map((v) => (
        <li
          key={v.viewerId}
          className="flex items-center justify-between gap-3 rounded-xl px-2 py-2"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-bold text-muted-foreground"
              aria-hidden
            >
              {v.name.trim().slice(0, 1).toUpperCase() || "·"}
            </span>
            <span className="truncate text-[13.5px]">{v.name}</span>
          </span>
          <span className="mono shrink-0 text-[10.5px] text-faint">{storyAge(v.viewedAt)}</span>
        </li>
      ))}
    </ul>
  );
}

function RepliesList({ storyId, userId }: { storyId: string; userId: string | null }) {
  const [replies, setReplies] = useState<Awaited<ReturnType<typeof listReplies>> | null>(null);
  useEffect(() => {
    let alive = true;
    void listReplies(storyId, userId).then((r) => alive && setReplies(r));
    return () => {
      alive = false;
    };
  }, [storyId, userId]);
  if (replies === null) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="Loading replies">
        {[0, 1].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-2xl bg-surface-2/60" />
        ))}
      </div>
    );
  }
  if (replies.length === 0) {
    return <p className="py-6 text-center text-[13px] text-faint">No replies yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {replies.map((r) => (
        <li key={r.id} className="rounded-2xl border border-border bg-surface/60 px-3.5 py-2.5">
          <p className="mono mb-1 text-[9.5px] uppercase tracking-[0.08em] text-faint">
            {r.authorName ?? "Someone"} · {storyAge(r.createdAt)}
          </p>
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}

function GiftsList({ storyId, userId }: { storyId: string; userId: string | null }) {
  const [gifts, setGifts] = useState<Awaited<ReturnType<typeof listGifts>> | null>(null);
  useEffect(() => {
    let alive = true;
    void listGifts(storyId, userId).then((g) => alive && setGifts(g));
    return () => {
      alive = false;
    };
  }, [storyId, userId]);
  if (gifts === null) {
    return (
      <div className="flex gap-2" role="status" aria-label="Loading gifts">
        {[0, 1, 2].map((i) => (
          <div key={i} className="size-14 animate-pulse rounded-2xl bg-surface-2/60" />
        ))}
      </div>
    );
  }
  if (gifts.length === 0) {
    return <p className="py-6 text-center text-[13px] text-faint">No gifts yet.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {gifts.map((g) => (
        <li
          key={g.id}
          title={`${GIFT_META[g.gift].name} from ${g.senderName ?? "someone"} · ${storyAge(g.createdAt)}`}
          className="flex items-center gap-2 rounded-full border border-border bg-surface/60 py-1.5 pl-2 pr-3.5"
        >
          <span className="text-[20px] leading-none" aria-hidden>
            {GIFT_META[g.gift].glyph}
          </span>
          <span className="text-[12px] text-muted-foreground">{g.senderName ?? "Someone"}</span>
        </li>
      ))}
    </ul>
  );
}
