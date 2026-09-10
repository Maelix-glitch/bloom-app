/**
 * ConfirmSheet — the one confirmation language in Bloom.
 *
 * Three places were still calling `window.confirm()`, which drops the browser's
 * own grey dialog over a carefully designed app and gives the person no way to
 * see what they are about to lose. This is the replacement: a BloomSheet, so it
 * is a bottom sheet on a phone and a small centred card on a desktop, with the
 * same motion as every other dialog.
 *
 * It is calm rather than alarming — a rose-tinted confirm button, not a red
 * wall — because these are recoverable decisions most of the time, and the copy
 * carries the consequence instead of the colour doing it.
 */

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { BloomSheet } from "./bloom-sheet";

export function ConfirmSheet({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Keep",
  tone = "danger",
  busyLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" tints the confirm button rose; "default" uses the accent. */
  tone?: "danger" | "default";
  /** Shown on the confirm button while an async onConfirm is in flight. */
  busyLabel?: string | undefined;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    try {
      setBusy(true);
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BloomSheet
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      description={description}
      onEscapeKeyDown={busy ? (e) => e.preventDefault() : undefined}
    >
      <div className="flex flex-col px-6 pb-6 pt-7 sm:px-7">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
          {tone === "danger" ? "Before you go" : "Just checking"}
        </p>
        <h2 className="mt-3 font-display text-[22px] leading-tight text-foreground sm:text-[24px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2.5 max-w-[46ch] text-[13.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div className="mt-7 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-5 py-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-[13.5px] font-medium transition-[transform,filter] duration-200 hover:brightness-105 active:scale-[0.975] disabled:opacity-60"
            style={{
              background:
                tone === "danger"
                  ? "color-mix(in oklab, var(--rose) 86%, transparent)"
                  : "var(--primary)",
              color: tone === "danger" ? "oklch(0.98 0.01 20)" : "var(--primary-foreground)",
            }}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {busyLabel ?? "Working…"}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </BloomSheet>
  );
}
