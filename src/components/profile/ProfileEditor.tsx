/**
 * ProfileEditor — "Make it feel like you."
 *
 * A photographic hero with the live avatar (gradient ring, camera button),
 * then grouped settings the way phones do them: Personal information,
 * Profile photo, Appearance. Draft state lives here; the server sees exactly
 * one save. Everything the first editor did is intact — name / username with
 * debounced availability / bio validation, accent, photo crop (zoom + drag)
 * exported once on Save, remove photo, interrupted-draft restore.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AtSign,
  Camera,
  Check,
  ImagePlus,
  ListChecks,
  Loader2,
  Palette,
  Sparkles,
  User,
  UserRound,
  X,
} from "lucide-react";

import { BloomSheet, SheetBody, SheetItem } from "@/components/ui/bloom-sheet";
import { accentVar } from "@/components/mood/primitives";
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
import {
  ACCENT_LABELS,
  BLOOM_ACCENTS,
  type BloomAccent,
  type ProfileIdentity,
} from "@/lib/profile/types";
import { AvatarEditor, type PendingAvatar } from "@/components/profile/AvatarEditor";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PresetPicker } from "@/components/profile/PresetPicker";
import { toast } from "sonner";

import heroArt from "@/assets/mood/hero-window.jpg";

export interface ProfileEditorSave {
  displayName: string;
  username: string | null;
  bio: string | null;
  accent: BloomAccent;
  /**
   * Only present when the person picked one of the photographs Bloom ships
   * (a `preset:` path). Uploads still go through `onCommitAvatar`, which owns
   * the storage write; leaving this undefined means "don't touch the avatar".
   */
  avatarPath?: string | null;
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
  const [photoOpen, setPhotoOpen] = useState(false);
  /** A `preset:` path chosen this session, not yet saved. */
  const [preset, setPreset] = useState<string | null>(null);

  const [nameError, setNameError] = useState<string | null>(null);
  const [bioError, setBioError] = useState<string | null>(null);
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | UsernameCheck>("idle");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const checkToken = useRef(0);
  const debounceRef = useRef<number | undefined>(undefined);
  const photoRef = useRef<HTMLDivElement | null>(null);

  /* open with fresh values, unless a saved draft was interrupted */
  useEffect(() => {
    if (!open) return;
    setDisplayName(identity.displayName);
    setUsername(identity.username ?? "");
    setBio(identity.bio ?? "");
    setAccent(identity.accent);
    setPending(null);
    setPhotoOpen(false);
    setPreset(null);
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
        /* An upload wins: it has already been committed just above. */
        ...(preset !== null && !pending ? { avatarPath: preset } : {}),
      });
      profileDraft.clear();
      toast("Profile updated.");
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Couldn't save that just now.");
    } finally {
      setSaving(false);
    }
  }, [
    pending,
    preset,
    displayName,
    username,
    bio,
    accent,
    usernameState,
    onCommitAvatar,
    onSave,
    onClose,
  ]);

  const previewIdentity: ProfileIdentity = {
    ...identity,
    displayName: displayName.trim() || "Bloom User",
    username: username.trim() ? normalizeUsername(username) : null,
    bio: bio.trim() || identity.bio,
    accent,
    /* Live preview: an upload beats a preset, a preset beats what's saved. */
    avatarPath: pending ? null : (preset ?? identity.avatarPath),
  };

  const openPhoto = () => {
    setPhotoOpen(true);
    window.setTimeout(
      () => photoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      60,
    );
  };

  return (
    <BloomSheet
      open={open}
      onClose={onClose}
      title="Edit your space"
      description="Nothing is saved until you press Save."
      size="md"
      className="bedit"
    >
      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ ["--profile-accent" as string]: accentVar[accent] } as React.CSSProperties}
      >
        <div className="bsheet-scroll">
          <SheetBody>
            {/* ------------------------------------------------ hero */}
            <div className="bedit-hero">
              <div className="bedit-hero-art" aria-hidden>
                <img src={heroArt} alt="" />
              </div>

              <SheetItem>
                <div className="bedit-topbar">
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close editor"
                    className="bsheet-icon"
                  >
                    <X className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="bsheet-primary"
                    data-testid="profile-save"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…
                      </>
                    ) : (
                      <>
                        <Check className="size-3.5" aria-hidden /> Save
                      </>
                    )}
                  </button>
                </div>
              </SheetItem>

              <SheetItem>
                <p className="bsheet-eyebrow mt-6">Edit your space</p>
              </SheetItem>
              <SheetItem>
                <h2 className="bsheet-h1 mt-2">Make it feel like you.</h2>
              </SheetItem>
              <SheetItem>
                <p className="bsheet-sub mt-1.5">A more you, for a brighter tomorrow.</p>
              </SheetItem>

              <SheetItem>
                <div className="bedit-identity" aria-label="Live preview of your profile">
                  <div className="bedit-avatar">
                    {pending ? (
                      <img src={pending.previewUrl} alt="New photo preview" />
                    ) : (
                      <span className="bedit-avatar-inner grid place-items-center overflow-hidden bg-surface">
                        <ProfileAvatar
                          name={previewIdentity.displayName}
                          avatarPath={previewIdentity.avatarPath}
                          accent={previewIdentity.accent}
                          size={122}
                          ring="none"
                        />
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={openPhoto}
                      aria-label="Change profile photo"
                      className="bedit-avatar-cam"
                    >
                      <Camera className="size-4" strokeWidth={1.8} />
                    </button>
                  </div>
                  <p className="bedit-name">{previewIdentity.displayName}</p>
                  <span className="bedit-handle">
                    {previewIdentity.username ? `@${previewIdentity.username}` : "no username yet"}
                  </span>
                </div>
              </SheetItem>

              <p className="bedit-script" aria-hidden>
                Same you,
                <br />
                brighter days.
              </p>
            </div>

            {/* ---------------------------------- personal information */}
            <SheetItem>
              <section className="bedit-group" aria-label="Personal information">
                <div className="bedit-group-head">
                  <span className="bedit-group-icon" aria-hidden>
                    <UserRound className="size-4" strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="bedit-group-title">Personal information</p>
                    <p className="bedit-group-sub">Tell us a little about yourself.</p>
                  </div>
                </div>

                <label className="bedit-field" data-invalid={Boolean(nameError)}>
                  <span className="bedit-field-icon" aria-hidden>
                    <User className="size-4" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0">
                    <span className="bedit-field-label">Name</span>
                    <input
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value.slice(0, NAME_MAX));
                        setNameError(null);
                      }}
                      onBlur={(e) => setNameError(validateDisplayName(e.target.value))}
                      placeholder="What should this space be called?"
                      className="bedit-field-input bedit-field-input--display"
                      data-testid="profile-name"
                    />
                  </span>
                  <span className="bedit-field-aside">
                    {displayName.length}/{NAME_MAX}
                  </span>
                </label>
                {nameError ? <FieldNote message={nameError} error /> : null}

                <label
                  className="bedit-field"
                  data-invalid={Boolean(usernameProblem) || usernameState === "taken"}
                >
                  <span className="bedit-field-icon" aria-hidden>
                    <AtSign className="size-4" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0">
                    <span className="bedit-field-label">Username</span>
                    <span className="flex items-baseline gap-1">
                      <span className="mono text-[14px] text-faint" aria-hidden>
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
                        className="bedit-field-input mono mt-0 text-[14px]"
                        data-testid="profile-username"
                      />
                    </span>
                  </span>
                  <span className="bedit-field-aside">
                    {usernameState === "checking" ? (
                      <span className="flex items-center gap-1">
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
                </label>
                {usernameProblem ? <FieldNote message={usernameProblem} error /> : null}
                {usernameState === "unknown" ? (
                  <FieldNote message="Couldn't check availability right now — we'll confirm on save." />
                ) : null}
                {!usernameProblem && !usernameTouched && identity.username ? (
                  <FieldNote message="Links to your profile use this. Changing it will move your link." />
                ) : null}

                <label className="bedit-field" data-invalid={Boolean(bioError)}>
                  <span className="bedit-field-icon self-start pt-1" aria-hidden>
                    <ListChecks className="size-4" strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0">
                    <span className="bedit-field-label">Bio</span>
                    <textarea
                      value={bio}
                      onChange={(e) => {
                        setBio(e.target.value.slice(0, BIO_MAX));
                        setBioError(null);
                      }}
                      onBlur={(e) => setBioError(validateBio(e.target.value))}
                      placeholder="A little about you..."
                      rows={2}
                      className="bedit-field-input"
                      data-testid="profile-bio"
                    />
                  </span>
                  <span className="bedit-field-aside">
                    {bio.length}/{BIO_MAX}
                  </span>
                </label>
                {bioError ? <FieldNote message={bioError} error /> : null}
              </section>
            </SheetItem>

            {/* --------------------------------------- profile photo */}
            <SheetItem>
              <section className="bedit-group" aria-label="Profile photo" ref={photoRef}>
                <div className="bedit-group-head">
                  <span className="bedit-group-icon" aria-hidden>
                    <Camera className="size-4" strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="bedit-group-title">Profile photo</p>
                    <p className="bedit-group-sub">Choose a photo that feels like you.</p>
                  </div>
                </div>

                {!photoOpen ? (
                  <div className="bedit-photos">
                    <button
                      type="button"
                      className="bedit-photo bedit-photo-add"
                      onClick={openPhoto}
                    >
                      <span className="bedit-photo-disc">
                        <ImagePlus className="size-5" strokeWidth={1.6} aria-hidden />
                      </span>
                      {identity.avatarPath ? "Replace" : "Add photo"}
                    </button>
                    <div className="bedit-photo" data-selected="true" aria-label="Current photo">
                      <span className="bedit-photo-disc">
                        {pending ? (
                          <img src={pending.previewUrl} alt="" />
                        ) : (
                          <ProfileAvatar
                            name={previewIdentity.displayName}
                            avatarPath={previewIdentity.avatarPath}
                            accent={previewIdentity.accent}
                            size={70}
                            ring="none"
                          />
                        )}
                      </span>
                      {pending ? "New" : preset ? "Chosen" : identity.avatarPath ? "Current" : "Initials"}
                    </div>
                    {identity.avatarPath && !pending ? (
                      <button
                        type="button"
                        className="bedit-photo"
                        onClick={async () => {
                          try {
                            await onRemoveAvatar();
                            toast("Photo removed.");
                          } catch {
                            toast.error("Couldn't remove that just now.");
                          }
                        }}
                      >
                        <span className="bedit-photo-disc">
                          <X className="size-5 text-rose" strokeWidth={1.6} aria-hidden />
                        </span>
                        Remove
                      </button>
                    ) : null}
                    {pending ? (
                      <button
                        type="button"
                        className="bedit-photo"
                        onClick={() => {
                          setPending(null);
                          setPhotoOpen(false);
                        }}
                      >
                        <span className="bedit-photo-disc">
                          <X className="size-5" strokeWidth={1.6} aria-hidden />
                        </span>
                        Undo
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {!photoOpen ? (
                  <PresetPicker
                    value={preset}
                    onPick={(path) => {
                      /* Choosing one of ours discards a half-cropped upload. */
                      setPending(null);
                      setPreset(path);
                    }}
                  />
                ) : (
                  <div className="bedit-crop">
                    <AvatarEditor
                      onStage={setPending}
                      {...(identity.avatarPath && !pending
                        ? {
                            onRemove: async () => {
                              try {
                                await onRemoveAvatar();
                                toast("Photo removed.");
                                setPhotoOpen(false);
                              } catch {
                                toast.error("Couldn't remove that just now.");
                              }
                            },
                          }
                        : {})}
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        className="bsheet-ghost h-8 px-3 text-[12px]"
                        onClick={() => setPhotoOpen(false)}
                      >
                        {pending ? "Done" : "Close"}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </SheetItem>

            {/* ------------------------------------------ appearance */}
            <SheetItem>
              <section className="bedit-group" aria-label="Appearance">
                <div className="bedit-group-head">
                  <span className="bedit-group-icon" aria-hidden>
                    <Palette className="size-4" strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="bedit-group-title">Appearance</p>
                    <p className="bedit-group-sub">
                      One quiet colour for your rings, highlights and small moments.
                    </p>
                  </div>
                </div>
                <div className="bedit-accents" role="radiogroup" aria-label="Your accent">
                  {BLOOM_ACCENTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={accent === a}
                      aria-label={`${ACCENT_LABELS[a]} accent`}
                      title={ACCENT_LABELS[a]}
                      onClick={() => setAccent(a)}
                      className="bedit-accent"
                      style={
                        {
                          ["--bedit-accent-color" as string]: accentVar[a],
                          background: `radial-gradient(circle at 35% 30%, color-mix(in oklab, ${accentVar[a]} 70%, #fff), ${accentVar[a]} 70%)`,
                        } as React.CSSProperties
                      }
                      data-testid={`profile-accent-${a}`}
                    >
                      {accent === a ? (
                        <Check className="size-4 text-[#1a1523]" strokeWidth={2.4} aria-hidden />
                      ) : null}
                    </button>
                  ))}
                  <span className="ml-1 self-center text-[12.5px] text-muted-foreground">
                    {ACCENT_LABELS[accent]}
                  </span>
                </div>
              </section>
            </SheetItem>

            {saveError ? (
              <SheetItem>
                <div className="bedit-error" role="alert">
                  <p>{saveError}</p>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    className="bsheet-ghost h-8 px-3 text-[12px]"
                  >
                    Try again
                  </button>
                </div>
              </SheetItem>
            ) : null}

            <div className="h-2" />
          </SheetBody>
        </div>

        {/* footer — the same Save, reachable without scrolling back up */}
        <div className="bedit-footer">
          <p className="bedit-footer-note flex items-center gap-2 text-[12px] text-faint">
            <Sparkles className="size-3.5" aria-hidden /> Nothing is saved until you press Save.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="bsheet-ghost">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className={cn("bsheet-primary", saving && "opacity-60")}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </BloomSheet>
  );
}

function FieldNote({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <p
      role={error ? "alert" : undefined}
      className={cn("bedit-field-note", error && "bedit-field-note--error")}
    >
      {message}
    </p>
  );
}
