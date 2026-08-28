/**
 * ProfileEditor — one calm form for identity. Draft state lives here; the
 * server sees exactly one save. Name, username (debounced availability),
 * bio, accent, photo crop, and a live hero preview so edits are felt as
 * they're made.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { profileDraft } from "@/lib/profile/drafts";
import {
  BIO_MAX,
  NAME_MAX,
  normalizeUsername,
  validateBio,
  validateDisplayName,
  validateUsername,
} from "@/lib/profile/validation";
import { checkUsername, type UsernameCheck } from "@/lib/profile/profileService";
import type { BloomAccent, ProfileIdentity } from "@/lib/profile/types";
import { AccentPicker } from "@/components/stories/StoryComposer";
import { AvatarEditor, type PendingAvatar } from "@/components/profile/AvatarEditor";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { toast } from "sonner";

export interface ProfileEditorSave {
  displayName: string;
  username: string | null;
  bio: string | null;
  accent: BloomAccent;
}

export function ProfileEditor({
  open,
  onClose,
  identity,
  onSave,
  onCommitAvatar,
  onRemoveAvatar,
}: {
  open: boolean;
  onClose: () => void;
  identity: ProfileIdentity;
  onSave: (patch: ProfileEditorSave) => Promise<void>;
  onCommitAvatar: (blob: Blob) => Promise<void>;
  onRemoveAvatar: () => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [username, setUsername] = useState(identity.username ?? "");
  const [bio, setBio] = useState(identity.bio ?? "");
  const [accent, setAccent] = useState<BloomAccent>(identity.accent);
  const [pending, setPending] = useState<PendingAvatar | null>(null);

  const [nameError, setNameError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | UsernameCheck>("idle");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const checkToken = useRef(0);
  const debounceRef = useRef<number | undefined>(undefined);

  /* open with fresh values, unless a saved draft was interrupted */
  useEffect(() => {
    if (!open) return;
    setDisplayName(identity.displayName);
    setUsername(identity.username ?? "");
    setBio(identity.bio ?? "");
    setAccent(identity.accent);
    setPending(null);
    setSaveError(null);
    setNameError(null);
    setBioError(null);
    setUsernameState("idle");
    const draft = profileDraft.read();
    if (
      draft &&
      (draft.displayName !== identity.displayName ||
        draft.username !== (identity.username ?? "") ||
        draft.bio !== (identity.bio ?? ""))
    ) {
      setDisplayName(draft.displayName);
      setUsername(draft.username);
      setBio(draft.bio);
      setAccent(draft.accent as BloomAccent);
      toast("We kept your last edits.", {
        description: "The unsaved changes from before are restored.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* drafts: persist quietly while dirty */
  useEffect(() => {
    if (!open) return;
    const dirtyForm =
      displayName !== identity.displayName ||
      username !== (identity.username ?? "") ||
      bio !== (identity.bio ?? "");
    if (!dirtyForm) {
      profileDraft.clear();
      return;
    }
    const t = window.setTimeout(
      () => profileDraft.write({ displayName, username, bio, accent }),
      500,
    );
    return () => window.clearTimeout(t);
  }, [open, displayName, username, bio, accent, identity]);

  const usernameTouched = username !== (identity.username ?? "");

  /* debounced availability */
  useEffect(() => {
    if (!open) return;
    if (!usernameTouched || username.trim() === "") {
      setUsernameState("idle");
      return;
    }
    const invalid = validateUsername(username);
    if (invalid) {
      setUsernameState("idle");
      return;
    }
    setUsernameState("checking");
    window.clearTimeout(debounceRef.current);
    const token = ++checkToken.current;
    debounceRef.current = window.setTimeout(() => {
      void checkUsername(normalizeUsername(username)).then((state) => {
        if (checkToken.current === token) setUsernameState(state);
      });
    }, 450);
    return () => window.clearTimeout(debounceRef.current);
  }, [open, username, usernameTouched]);

  const usernameProblem =
    username.trim() === "" && !usernameTouched
      ? null
      : usernameTouched && !identity.username && username.trim() === ""
        ? "A username makes your profile shareable — or leave it blank."
        : validateUsername(username);

  const handleSave = useCallback(async () => {
    const nameInvalid = validateDisplayName(displayName);
    setNameError(nameInvalid);
    const bioInvalid = validateBio(bio);
    setBioError(bioInvalid);
    if (nameInvalid || bioInvalid) return;

    const trimmed = username.trim().toLowerCase();
    if (trimmed !== "") {
      const usernameInvalid = validateUsername(trimmed);
      if (usernameInvalid) {
        setSaveError(usernameInvalid);
        return;
      }
      if (usernameState === "checking") {
        setSaveError("Give the check a second…");
        return;
      }
      if (usernameState === "taken") {
        setSaveError("That @username isn't free. Keep your current one, or pick another.");
        return;
      }
    }

    setSaving(true);
    setSaveError(null);
    try {
      if (pending) {
        await onCommitAvatar(pending.blob);
      }
      await onSave({
        displayName: displayName.trim(),
        username: trimmed === "" ? null : normalizeUsername(trimmed),
        bio: bio.trim() === "" ? null : bio.trim(),
        accent,
      });
      profileDraft.clear();
      toast("Profile updated.");
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Couldn't save that just now.");
    } finally {
      setSaving(false);
    }
  }, [pending, displayName, username, bio, accent, usernameState, onCommitAvatar, onSave, onClose]);

  const previewIdentity: ProfileIdentity = {
    ...identity,
    displayName: displayName.trim() || "Bloom User",
    username: username.trim() ? normalizeUsername(username) : null,
    bio: bio.trim() || identity.bio,
    accent,
    avatarPath: pending ? null : identity.avatarPath,
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 border-border bg-background p-0 sm:max-w-[540px]"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <SheetTitle className="display text-[17px]">Edit your space</SheetTitle>
              <SheetDescription className="mt-0.5 text-[12px] text-muted-foreground">
                Nothing is saved until you press Save.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close editor"
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* live preview */}
            <div
              className="border-b border-border px-5 py-6"
              style={{
                background: `radial-gradient(120% 130% at 50% 0%, color-mix(in oklab, var(--profile-accent, var(--violet)) 9%, transparent), transparent 65%)`,
              }}
              aria-label="Live preview of your profile"
            >
              <div className="flex flex-col items-center text-center">
                {pending ? (
                  <img
                    src={pending.previewUrl}
                    alt="New photo preview"
                    className="size-[72px] rounded-full border border-border object-cover"
                  />
                ) : (
                  <ProfileAvatar
                    name={previewIdentity.displayName}
                    avatarPath={previewIdentity.avatarPath}
                    accent={previewIdentity.accent}
                    size={72}
                    ring="none"
                  />
                )}
                <p className="display mt-3 text-[20px] leading-tight break-words">
                  {previewIdentity.displayName}
                </p>
                <p className="mono text-[11px] text-muted-foreground">
                  {previewIdentity.username ? `@${previewIdentity.username}` : "no username yet"}
                </p>
                <p
                  className={cn(
                    "mt-1.5 max-w-[40ch] text-[12.5px] leading-relaxed",
                    previewIdentity.bio ? "text-muted-foreground" : "text-faint italic",
                  )}
                >
                  {previewIdentity.bio || "A little about you..."}
                </p>
              </div>
            </div>

            <form
              className="flex flex-col gap-7 px-5 py-6"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSave();
              }}
            >
              <section aria-label="Profile photo">
                <p className="eyebrow mb-3">Photo</p>
                <AvatarEditor
                  onStage={setPending}
                  {...(identity.avatarPath && !pending
                    ? {
                        onRemove: async () => {
                          try {
                            await onRemoveAvatar();
                            toast("Photo removed.");
                          } catch {
                            toast.error("Couldn't remove that just now.");
                          }
                        },
                      }
                    : {})}
                />
              </section>

              <section className="flex flex-col gap-5" aria-label="Name and details">
                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow flex items-center justify-between">
                    Name
                    <span
                      className={cn(
                        "normal-case",
                        displayName.length > NAME_MAX - 8 ? "text-muted-foreground" : "text-faint",
                      )}
                    >
                      {displayName.length}/{NAME_MAX}
                    </span>
                  </span>
                  <input
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value.slice(0, NAME_MAX));
                      setNameError(null);
                    }}
                    onBlur={(e) => setNameError(validateDisplayName(e.target.value))}
                    placeholder="What should this space be called?"
                    className={cn(
                      "display w-full rounded-xl border bg-surface/50 px-3.5 py-2.5 text-[17px] outline-none transition-colors placeholder:text-faint/60 focus:bg-surface-2/50",
                      nameError ? "border-rose/60" : "border-border focus:border-border-strong",
                    )}
                  />
                  {nameError ? <FieldError message={nameError} /> : null}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow">@username</span>
                  <div className="relative">
                    <span className="mono pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-faint">
                      @
                    </span>
                    <input
                      value={username}
                      onChange={(e) => {
                        setUsername(normalizeUsername(e.target.value));
                        setSaveError(null);
                      }}
                      placeholder="quiet-lavender"
                      maxLength={30}
                      className={cn(
                        "mono w-full rounded-xl border bg-surface/50 py-2.5 pl-8 pr-24 text-[14px] outline-none transition-colors placeholder:text-faint/60 focus:bg-surface-2/50",
                        usernameProblem || usernameState === "taken"
                          ? "border-rose/60"
                          : "border-border focus:border-border-strong",
                      )}
                    />
                    <span className="mono absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] uppercase tracking-[0.06em]">
                      {usernameState === "checking" ? (
                        <span className="flex items-center gap-1 text-faint">
                          <Loader2 className="size-3 animate-spin" aria-hidden /> checking
                        </span>
                      ) : usernameState === "available" ? (
                        <span className="flex items-center gap-1 text-sage">
                          <Check className="size-3" aria-hidden /> free
                        </span>
                      ) : usernameState === "taken" ? (
                        <span className="flex items-center gap-1 text-rose">
                          <X className="size-3" aria-hidden /> taken
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {usernameProblem ? <FieldError message={usernameProblem} /> : null}
                  {usernameState === "unknown" ? (
                    <p className="text-[12px] text-faint">
                      Couldn't check availability right now — we'll confirm on save.
                    </p>
                  ) : null}
                  {!usernameProblem && !usernameTouched && identity.username ? (
                    <p className="text-[12px] text-faint">
                      Links to your profile use this. Changing it will move your link.
                    </p>
                  ) : null}
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="eyebrow flex items-center justify-between">
                    Bio{" "}
                    <span
                      className={cn(
                        "normal-case",
                        bio.length > BIO_MAX - 20 ? "text-muted-foreground" : "text-faint",
                      )}
                    >
                      {bio.length}/{BIO_MAX}
                    </span>
                  </span>
                  <textarea
                    value={bio}
                    onChange={(e) => {
                      setBio(e.target.value.slice(0, BIO_MAX));
                      setBioError(null);
                    }}
                    onBlur={(e) => setBioError(validateBio(e.target.value))}
                    placeholder="A little about you..."
                    rows={3}
                    className={cn(
                      "w-full resize-none rounded-xl border bg-surface/50 px-3.5 py-2.5 text-[14px] leading-relaxed outline-none transition-colors placeholder:text-faint/60 focus:bg-surface-2/50",
                      bioError ? "border-rose/60" : "border-border focus:border-border-strong",
                    )}
                  />
                  {bioError ? <FieldError message={bioError} /> : null}
                </label>
              </section>

              <section aria-label="Accent">
                <AccentPicker value={accent} onChange={setAccent} label="Your accent" />
                <p className="mt-2 text-[12px] text-faint">
                  One quiet color for your rings, highlights, and small moments.
                </p>
              </section>

              {saveError ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-rose/40 bg-rose/5 px-4 py-3">
                  <p className="text-[13px] text-rose">{saveError}</p>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    className="mono shrink-0 rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-medium text-[var(--primary-foreground)] transition-transform duration-300 enabled:hover:scale-[1.02] disabled:opacity-60"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--profile-accent, var(--violet)), var(--sky))",
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-[12.5px] leading-snug text-rose">
      {message}
    </p>
  );
}
