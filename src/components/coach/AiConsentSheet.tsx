/**
 * AiConsentSheet — the just-in-time ask for AI-written explanations
 * (M-232, App Store audit #9).
 *
 * Shown once per AI surface (Coach, Vitalis) before the first send,
 * when the ai_assistance permission has never been decided. The words
 * are the consent domain's own copy — the same label and description
 * the Settings consent section shows — plus the Privacy page's plain
 * account of what leaves the device and to whom. "Not now" sends
 * nothing: the draft stays where it was, Bloom's tracking, plans and
 * on-device basics keep working, and the permission can be switched on
 * later in Settings → Privacy → Your consent.
 */

import { BloomSheet } from "@/components/ui/bloom-sheet";
import { Button } from "@/components/ui/button";
import { CONSENT_COPY } from "@/lib/vitalis/domain/consent";

export function AiConsentSheet({
  open,
  onAllow,
  onNotNow,
}: {
  open: boolean;
  onAllow: () => void;
  onNotNow: () => void;
}) {
  const copy = CONSENT_COPY.ai_assistance;
  return (
    <BloomSheet
      open={open}
      onClose={onNotNow}
      title={copy.label}
      description={copy.description}
      placement="pop"
    >
      <div className="flex flex-col px-6 pb-6 pt-7 sm:px-7" data-testid="ai-consent-sheet">
        <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
          Before you send
        </p>
        <h2 className="mt-3 font-display text-[length:var(--text-title)] leading-tight text-foreground">
          {copy.label}
        </h2>
        <p className="mt-2.5 max-w-[46ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          {copy.description} When you use Coach or Vitalis, your message and the parts of your
          record the reply depends on are sent to Bloom&rsquo;s AI providers — and if a reply is
          spoken aloud, its text goes to ElevenLabs, which provides the voice.
        </p>
        <p className="mt-2.5 max-w-[46ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
          Nothing is sent until you allow it, and Bloom&rsquo;s tracking and plans keep working
          without it. You can change this any time in Settings → Privacy → Your consent.
        </p>
        <div className="mt-7 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onNotNow}>
            Not now
          </Button>
          <Button type="button" onClick={onAllow}>
            Allow
          </Button>
        </div>
      </div>
    </BloomSheet>
  );
}
