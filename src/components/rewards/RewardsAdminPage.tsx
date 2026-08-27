import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  ExternalLink,
  FilePlus2,
  LockKeyhole,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { BloomHeader } from "@/components/BloomHeader";
import { Atmosphere } from "@/components/mood/Atmosphere";
import {
  useRewardsSystem,
  type AdminReward,
  type RewardDraftInput,
  type RewardStatus,
} from "@/hooks/useRewardsSystem";
import { cn } from "@/lib/utils";

type DraftForm = RewardDraftInput;

const EMPTY_FORM: DraftForm = {
  title: "",
  description: "",
  imageUrl: "",
  rewardType: "recognition",
  valueDetails: "",
  adminMessage: "",
  publishAt: "",
  expiresAt: "",
};

const MEDAL_LIBRARY = Array.from({ length: 30 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    id: `medal-${number}`,
    label: `Military medal ${number}`,
    url: `/rewards/medals/medal-${number}.png`,
  };
});

const STATUS_STYLES: Record<RewardStatus, string> = {
  draft: "reward-admin-status-draft",
  published: "reward-admin-status-published",
  claimed: "reward-admin-status-claimed",
  expired: "reward-admin-status-expired",
  revoked: "reward-admin-status-revoked",
};

function toInputDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function statusLabel(status: RewardStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function RewardsAdminPage() {
  const rewardsSystem = useRewardsSystem();
  const {
    isAdmin,
    adminLoading,
    adminError,
    adminRewards,
    adminUsers,
    loadAdminWorkspace,
    createDraft,
    updateDraft,
    publishReward,
    revokeReward,
    setDeliveryState,
  } = rewardsSystem;
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");

  useEffect(() => {
    void loadAdminWorkspace();
  }, [loadAdminWorkspace]);

  const editingStatus: RewardStatus = editingId
    ? (adminRewards.find((reward) => reward.id === editingId)?.state ?? "draft")
    : "draft";

  const updateField = (field: keyof DraftForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setRecipients([]);
    setForm(EMPTY_FORM);
    setMessage(null);
  };

  const editReward = (reward: AdminReward) => {
    setEditingId(reward.id);
    setRecipients(reward.recipient_ids);
    setForm({
      title: reward.title,
      description: reward.description,
      imageUrl: reward.image_url ?? "",
      rewardType: reward.reward_type,
      valueDetails: reward.value_details ?? "",
      adminMessage: reward.admin_message ?? "",
      publishAt: toInputDate(reward.publish_at),
      expiresAt: toInputDate(reward.expires_at),
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (shouldPublish: boolean) => {
    setMessage(null);
    if (!form.title.trim()) {
      setMessageKind("error");
      setMessage("Give this reward a title before saving it.");
      return;
    }
    if (shouldPublish && recipients.length === 0) {
      setMessageKind("error");
      setMessage("Select at least one recipient before publishing.");
      return;
    }

    setSaving(true);
    try {
      const id = editingId ?? (await createDraft(form));
      if (editingId) await updateDraft(id, form);
      if (shouldPublish) {
        await publishReward(id, recipients, form.publishAt, form.expiresAt);
      }
      setEditingId(id);
      setMessageKind("success");
      setMessage(
        shouldPublish
          ? "Reward published to the selected accounts."
          : "Draft saved privately. It is not visible to users.",
      );
      await loadAdminWorkspace();
    } catch (saveError) {
      setMessageKind("error");
      setMessage(saveError instanceof Error ? saveError.message : "Could not save this reward.");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (reward: AdminReward) => {
    if (!window.confirm(`Revoke “${reward.title}” for every recipient?`)) return;
    try {
      await revokeReward(reward.id);
      setMessageKind("success");
      setMessage("Reward revoked. It is no longer available to recipients.");
      await loadAdminWorkspace();
    } catch (revokeError) {
      setMessageKind("error");
      setMessage(
        revokeError instanceof Error ? revokeError.message : "Could not revoke this reward.",
      );
    }
  };

  if (adminLoading && !adminError) {
    return (
      <AdminShell>
        <div className="reward-loading-state">
          <div className="reward-loading-orb">
            <span />
          </div>
          <p className="eyebrow mt-5">Verifying administrator access…</p>
        </div>
      </AdminShell>
    );
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <section className="reward-admin-denied">
          <div className="reward-admin-denied-icon">
            <LockKeyhole className="size-6" />
          </div>
          <p className="eyebrow mt-6">Restricted route</p>
          <h1 className="display mt-3 text-[36px]">Administrator access required.</h1>
          <p className="mx-auto mt-3 max-w-[48ch] text-[13px] leading-relaxed text-muted-foreground">
            {adminError ??
              "This workspace is protected. Rewards can only be created and published by an authorized administrator."}
          </p>
          <Link to="/rewards" className="reward-secondary-button mt-7">
            Return to Rewards <ChevronRight className="size-3.5" />
          </Link>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <header className="reward-admin-header">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-sage" /> Authorized reward console
          </p>
          <h1 className="display mt-4 text-[42px] leading-[.98] sm:text-[58px]">
            Curate the <span className="rewards-gradient-text">moment.</span>
          </h1>
          <p className="mt-4 max-w-[57ch] text-[14px] leading-relaxed text-muted-foreground">
            Create a reward, choose its recipients, and publish it deliberately. Nothing in this
            console is generated from points or streaks.
          </p>
        </div>
        <div className="reward-admin-header-actions">
          <Link to="/rewards" className="reward-text-button">
            Open user view <ExternalLink className="size-3.5" />
          </Link>
          <button type="button" onClick={resetForm} className="reward-primary-button">
            <FilePlus2 className="size-4" /> New reward
          </button>
        </div>
      </header>

      {message ? (
        <div
          className={cn(
            "reward-admin-alert",
            messageKind === "error" ? "reward-admin-alert-error" : "reward-admin-alert-success",
          )}
          role="status"
        >
          {messageKind === "error" ? (
            <CircleAlert className="size-4" />
          ) : (
            <Check className="size-4" />
          )}
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss message">
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="reward-admin-layout">
        <section className="reward-admin-editor">
          <div className="reward-admin-section-label">
            <Megaphone className="size-3.5 text-gold" />{" "}
            {editingId ? "Edit reward" : "Create reward"}
          </div>
          <div className="reward-admin-form">
            <AdminField label="Reward title" hint="Shown to the selected user">
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={120}
                placeholder="Enter a reward title"
              />
            </AdminField>
            <AdminField label="Description">
              <textarea
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                rows={4}
                placeholder="What is being offered, and why?"
              />
            </AdminField>
            <div className="reward-admin-two-col">
              <AdminField label="Reward type">
                <input
                  value={form.rewardType}
                  onChange={(event) => updateField("rewardType", event.target.value)}
                  placeholder="recognition, gift, access…"
                />
              </AdminField>
              <AdminField label="Value / details">
                <input
                  value={form.valueDetails}
                  onChange={(event) => updateField("valueDetails", event.target.value)}
                  placeholder="The concrete details"
                />
              </AdminField>
            </div>
            <AdminField
              label="Image or icon URL"
              hint="Optional. Use a private, approved image URL."
            >
              <input
                type="url"
                value={form.imageUrl}
                onChange={(event) => updateField("imageUrl", event.target.value)}
                placeholder="https://…"
              />
            </AdminField>
            <div className="reward-admin-medal-library">
              <div className="reward-admin-medal-library-head">
                <div>
                  <p className="reward-admin-field-label">Military medal library</p>
                  <p className="reward-admin-field-hint">
                    Optional. Pick one of the 30 custom AI-generated medal assets.
                  </p>
                </div>
                {MEDAL_LIBRARY.some((medal) => medal.url === form.imageUrl) ? (
                  <button
                    type="button"
                    className="reward-admin-clear-medal"
                    onClick={() => updateField("imageUrl", "")}
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>
              <div className="reward-admin-medal-grid">
                {MEDAL_LIBRARY.map((medal) => (
                  <button
                    key={medal.id}
                    type="button"
                    title={medal.label}
                    aria-label={medal.label}
                    aria-pressed={form.imageUrl === medal.url}
                    onClick={() => updateField("imageUrl", medal.url)}
                    className={cn(
                      "reward-admin-medal-option",
                      form.imageUrl === medal.url && "reward-admin-medal-option-selected",
                    )}
                  >
                    <img src={medal.url} alt="" loading="lazy" />
                    <span>{medal.id.replace("medal-", "#")}</span>
                  </button>
                ))}
              </div>
            </div>
            <AdminField label="Message from admin" hint="Optional personal note">
              <textarea
                value={form.adminMessage}
                onChange={(event) => updateField("adminMessage", event.target.value)}
                rows={3}
                placeholder="A note only the recipient will see"
              />
            </AdminField>
            <div className="reward-admin-two-col">
              <AdminField label="Publish date">
                <input
                  type="datetime-local"
                  value={form.publishAt}
                  onChange={(event) => updateField("publishAt", event.target.value)}
                />
              </AdminField>
              <AdminField label="Expiration date" hint="Optional">
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  min={form.publishAt || undefined}
                  onChange={(event) => updateField("expiresAt", event.target.value)}
                />
              </AdminField>
            </div>
            <AdminField
              label="Publish status"
              hint="A draft is invisible until the Publish reward action succeeds."
            >
              <div className={cn("reward-admin-readonly", STATUS_STYLES[editingStatus])}>
                {statusLabel(editingStatus)}
              </div>
            </AdminField>
          </div>
          <div className="reward-admin-editor-footer">
            <span className="reward-admin-security-note">
              <ShieldCheck className="size-3.5 text-sage" /> Save draft first, then publish to
              selected users.
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void save(false)}
                disabled={saving}
                className="reward-secondary-button"
              >
                {saving ? "Saving…" : "Save draft"}
              </button>
              <button
                type="button"
                onClick={() => void save(true)}
                disabled={saving}
                className="reward-primary-button"
              >
                {saving ? "Publishing…" : "Publish reward"} <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </section>

        <aside className="reward-admin-recipients">
          <div className="reward-admin-section-label">
            <Users className="size-3.5 text-sky" /> Intended recipients{" "}
            <span className="reward-admin-count">{recipients.length} selected</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            Recipients are passed to a server-side publish function. A normal user cannot assign a
            reward to themselves.
          </p>
          <div className="reward-admin-user-list">
            {adminUsers.length ? (
              adminUsers.map((user) => (
                <label
                  key={user.user_id}
                  className={cn(
                    "reward-admin-user",
                    recipients.includes(user.user_id) && "reward-admin-user-selected",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={recipients.includes(user.user_id)}
                    onChange={() =>
                      setRecipients((current) =>
                        current.includes(user.user_id)
                          ? current.filter((id) => id !== user.user_id)
                          : [...current, user.user_id],
                      )
                    }
                  />
                  <span className="reward-admin-user-check">
                    <Check className="size-3" />
                  </span>
                  <span className="reward-admin-user-copy">
                    <span>{user.display_name || "Unnamed user"}</span>
                    <small>{user.email || user.user_id}</small>
                  </span>
                </label>
              ))
            ) : (
              <div className="reward-admin-no-users">
                <UserRound className="size-5" />
                <p>No user accounts returned.</p>
                <span>They must exist in Supabase Auth before they can receive a reward.</span>
              </div>
            )}
          </div>
        </aside>
      </div>

      <section className="reward-admin-inventory">
        <div className="reward-admin-inventory-head">
          <div>
            <p className="eyebrow">Published and unpublished records</p>
            <h2 className="display mt-2 text-[27px]">Reward inventory</h2>
          </div>
          <button
            type="button"
            onClick={() => void loadAdminWorkspace()}
            className="reward-secondary-button"
          >
            <RefreshCw className="size-3.5" /> Refresh
          </button>
        </div>
        {adminRewards.length ? (
          <div className="reward-admin-table">
            {adminRewards.map((reward) => (
              <AdminRewardRow
                key={reward.id}
                reward={reward}
                users={adminUsers}
                onEdit={() => editReward(reward)}
                onRevoke={() => void revoke(reward)}
                onDeliveryStateChange={async (userId, state) => {
                  try {
                    await setDeliveryState(reward.id, userId, state);
                    await loadAdminWorkspace();
                    setMessageKind("success");
                    setMessage("Recipient delivery state updated.");
                  } catch (stateError) {
                    setMessageKind("error");
                    setMessage(
                      stateError instanceof Error
                        ? stateError.message
                        : "Could not update delivery state.",
                    );
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="reward-admin-empty">
            <FilePlus2 className="size-5" />
            <p className="display mt-3 text-[17px]">No reward records yet.</p>
            <span>Create a draft above. It will stay invisible until you publish it.</span>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rewards-admin-page relative min-h-screen bg-background text-foreground">
      <BloomHeader />
      <Atmosphere />
      <main className="relative mx-auto w-full max-w-[1200px] px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <div className="rewards-starfield" aria-hidden="true">
          {Array.from({ length: 14 }, (_, index) => (
            <span
              key={index}
              style={
                {
                  "--star-x": `${(index * 43) % 100}%`,
                  "--star-y": `${(index * 67) % 92}%`,
                  "--star-delay": `${(index % 7) * -0.8}s`,
                  "--star-size": `${index % 4 === 0 ? 2 : 1}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
        {children}
      </main>
    </div>
  );
}

function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="reward-admin-field">
      <span className="reward-admin-field-label">{label}</span>
      {hint ? <span className="reward-admin-field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

function AdminRewardRow({
  reward,
  users,
  onEdit,
  onRevoke,
  onDeliveryStateChange,
}: {
  reward: AdminReward;
  users: { user_id: string; email: string | null; display_name: string | null }[];
  onEdit: () => void;
  onRevoke: () => void;
  onDeliveryStateChange: (
    userId: string,
    state: Extract<RewardStatus, "published" | "claimed" | "expired" | "revoked">,
  ) => Promise<void>;
}) {
  const claimedCount = reward.assignment_states.filter(
    (assignment) => assignment.state === "claimed",
  ).length;
  return (
    <article className="reward-admin-record">
      <div className="reward-admin-record-main">
        {reward.image_url ? (
          <img src={reward.image_url} alt="" className="reward-admin-record-image" />
        ) : (
          <span className="reward-admin-record-icon">
            <Megaphone className="size-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-medium">{reward.title}</h3>
            <span className={cn("reward-admin-state", STATUS_STYLES[reward.state])}>
              {statusLabel(reward.state)}
            </span>
          </div>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {reward.description || "No description"}
          </p>
          <div className="reward-admin-record-meta">
            <span>
              <Users className="size-3" /> {reward.recipient_ids.length} recipient
              {reward.recipient_ids.length === 1 ? "" : "s"}
            </span>
            <span>
              <Check className="size-3" /> {claimedCount} claimed
            </span>
            {reward.publish_at ? (
              <span>
                <Clock3 className="size-3" /> {formatDate(reward.publish_at)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="reward-admin-record-actions">
          <button type="button" onClick={onEdit} className="reward-secondary-button">
            Edit
          </button>
          {reward.state !== "revoked" ? (
            <button type="button" onClick={onRevoke} className="reward-admin-danger-button">
              Revoke
            </button>
          ) : null}
        </div>
      </div>
      {reward.assignment_states.length ? (
        <div className="reward-admin-deliveries">
          {reward.assignment_states.map((assignment) => {
            const user = users.find((candidate) => candidate.user_id === assignment.user_id);
            return (
              <label key={assignment.user_id} className="reward-admin-delivery">
                <span>{user?.display_name || user?.email || assignment.user_id.slice(0, 8)}</span>
                <select
                  value={assignment.state}
                  onChange={(event) =>
                    void onDeliveryStateChange(
                      assignment.user_id,
                      event.target.value as Extract<
                        RewardStatus,
                        "published" | "claimed" | "expired" | "revoked"
                      >,
                    )
                  }
                >
                  <option value="published">Published</option>
                  <option value="claimed">Claimed</option>
                  <option value="expired">Expired</option>
                  <option value="revoked">Revoked</option>
                </select>
              </label>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}
