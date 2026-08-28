/**
 * PrivacySheet — control in human language. No acronyms, no policy jargon.
 * Real switches that write to the profile_privacy row (RLS-owner-only).
 */

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, X } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ProfilePrivacy } from "@/lib/profile/types";
import { toast } from "sonner";

export function PrivacySheet({
  open,
  onClose,
  privacy,
  hasUsername,
  onSave,
  onPreview,
}: {
  open: boolean;
  onClose: () => void;
  privacy: ProfilePrivacy;
  hasUsername: boolean;
  onSave: (privacy: ProfilePrivacy) => Promise<void>;
  onPreview: () => void;
}) {
  const [draft, setDraft] = useState(privacy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(privacy);
      setError(null);
    }
  }, [open, privacy]);

  const dirty =
    draft.profileVisibility !== privacy.profileVisibility ||
    draft.storyVisibility !== privacy.storyVisibility;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      toast("Privacy updated.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that just now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 border-border bg-background p-0 sm:max-w-[440px]"
        showCloseButton={false}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <SheetTitle className="display text-[17px]">Privacy</SheetTitle>
              <SheetDescription className="mt-0.5 text-[12px] text-muted-foreground">
                Private by default. Only what you choose to share appears on your profile.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close privacy settings"
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <div className="flex flex-col gap-3">
              <Choice
                checked={draft.profileVisibility === "public"}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, profileVisibility: v ? "public" : "private" }))
                }
                icon={
                  draft.profileVisibility === "public" ? (
                    <Eye className="size-4" />
                  ) : (
                    <EyeOff className="size-4" />
                  )
                }
                title="Let people find my profile"
                body={
                  hasUsername
                    ? "Anyone with your link can see your public face — name, bio, shared moments."
                    : "Turn this on after claiming a @username; that's what your link will use."
                }
              />
              <Choice
                checked={draft.storyVisibility === "public"}
                onChange={(v) =>
                  setDraft((d) => ({ ...d, storyVisibility: v ? "public" : "private" }))
                }
                icon={<span className={cn("mx-auto block size-2 rounded-full", "bg-current")} />}
                title="New stories start public"
                body="Off means every story begins private and you decide, one by one, what leaves your space."
              />
            </div>

            <div className="mt-6 rounded-xl border border-border bg-surface/50 p-4">
              <p className="eyebrow mb-2">What stays private regardless</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Your mood record, trackers, cycle data, reflections, Coach conversations, and
                rewards stay in your private Bloom space unless you turn something into a story and
                choose to share it.
              </p>
            </div>

            {error ? (
              <p role="alert" className="mt-4 text-[13px] text-rose">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onPreview}
              className="rounded-full px-3.5 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              See what others see
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-5 py-2 text-[13px] font-medium text-foreground transition-all enabled:hover:border-border-strong disabled:opacity-40"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              Save
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Choice({
  checked,
  onChange,
  icon,
  title,
  body,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-200",
        checked
          ? "border-[color:var(--profile-accent-border,var(--border-strong))] bg-[color:var(--profile-accent-soft,var(--surface-2))]"
          : "border-border bg-surface/40 hover:border-border-strong",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border",
          checked ? "text-[var(--profile-accent,var(--violet))]" : "text-faint",
        )}
        style={{ borderColor: "var(--border)" }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium">{title}</span>
        <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted-foreground">
          {body}
        </span>
      </span>
      <span
        aria-hidden
        className={cn(
          "relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-[var(--profile-accent,var(--violet))]" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-foreground transition-all duration-200",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
