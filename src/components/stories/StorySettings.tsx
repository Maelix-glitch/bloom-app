/**
 * StorySettings — privacy and interaction controls for stories.
 * Who can reply, react, and gift; whether expired stories rest in the
 * archive; the default audience for new public stories.
 */

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { StorySheet } from "./StorySheet";
import { getStorySettings, listCloseFriends, saveStorySettings } from "@/lib/stories/interactions";
import { DEFAULT_STORY_SETTINGS, type StorySettings as Settings } from "@/lib/stories/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-surface/60 px-4 py-3.5 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold">{label}</span>
        <span className="block text-[12px] text-muted-foreground">{hint}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          on ? "bg-[color:var(--profile-accent,var(--violet))]" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-white shadow transition-all",
            on ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}

export function StorySettings({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_STORY_SETTINGS);
  const [closeCount, setCloseCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void getStorySettings(userId).then((s) => alive && setSettings(s));
    void listCloseFriends(userId).then((ids) => alive && setCloseCount(ids.length));
    setLoaded(true);
    return () => {
      alive = false;
    };
  }, [userId]);

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    void saveStorySettings(userId, next)
      .then(() => toast("Story settings saved."))
      .catch(() => toast.error("Couldn't save that just now."));
  };

  return (
    <StorySheet
      title="Story settings"
      subtitle="You decide who can reach your moments."
      onClose={onClose}
    >
      <div className={cn("flex flex-col gap-2.5 pb-3", !loaded && "opacity-70")}>
        <Toggle
          label="Replies"
          hint="Let people reply to your stories."
          on={settings.allowReplies}
          onChange={(allowReplies) => update({ allowReplies })}
        />
        <Toggle
          label="Reactions"
          hint="Let people react with one tap."
          on={settings.allowReactions}
          onChange={(allowReactions) => update({ allowReactions })}
        />
        <Toggle
          label="Blooms"
          hint="Let people send you free Bloom gifts."
          on={settings.allowGifts}
          onChange={(allowGifts) => update({ allowGifts })}
        />
        <Toggle
          label="Keep in archive"
          hint="Expired stories rest in your private vault."
          on={settings.autoArchive}
          onChange={(autoArchive) => update({ autoArchive })}
        />

        <div className="mt-1">
          <p className="eyebrow mb-2">New public stories are visible to</p>
          <div
            className="grid grid-cols-2 gap-2"
            role="radiogroup"
            aria-label="Default story audience"
          >
            {(
              [
                { key: "all", label: "Everyone", hint: "Wherever shared" },
                {
                  key: "close",
                  label: "Close friends",
                  hint: closeCount > 0 ? `${closeCount} people` : "Nobody yet",
                },
              ] as const
            ).map((o) => (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={settings.defaultAudience === o.key}
                onClick={() => update({ defaultAudience: o.key })}
                className={cn(
                  "rounded-2xl border px-3.5 py-3 text-left transition-all",
                  settings.defaultAudience === o.key
                    ? "border-[color:var(--profile-accent-border,var(--border-strong))] bg-[color:var(--profile-accent-soft,var(--surface-2))]"
                    : "border-border bg-surface/60 hover:border-border-strong",
                )}
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  {settings.defaultAudience === o.key ? <Check className="size-3.5" /> : null}
                  {o.label}
                </span>
                <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{o.hint}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
            Close friends is for your innermost circle. You can still choose the audience on every
            story before you share it.
          </p>
        </div>
      </div>
    </StorySheet>
  );
}
