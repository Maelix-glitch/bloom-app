/**
 * BloomSheet — the one overlay primitive the premium dialogs share.
 *
 *   · phones: a native-feeling bottom sheet (grab handle, slides up, safe area)
 *   · desktop: a centred card
 *   · placement="pop": a centred floating card on phones too, for compact
 *     moments that shouldn't own the screen (no grabber, card motion)
 *   · backdrop fades; the panel arrives with opacity + translateY + a whisper
 *     of scale; the content inside staggers in ~40–70 ms steps
 *   · closing is symmetric and quick; reduced-motion collapses to plain fades
 *
 * Built on Radix Dialog (focus trap, escape, aria) with Motion driving the
 * transitions, so nothing here re-invents accessibility.
 *
 * U2 convergence (plan §2.4): this file also carries the confirm variant,
 * `BloomConfirm` — the old standalone confirm-sheet was absorbed here; its
 * re-export shim was retired in the U6 Rewards pass once the last call
 * sites migrated to importing `BloomConfirm` from this file. The ui sheet /
 * dialog / alert-dialog wrappers keep their Radix APIs but wear this
 * sheet's chrome (blurred canvas backdrop, token surface, --radius-dialog,
 * --elevation-dialog, motion tokens), so every overlay in the app reads as
 * one family until U6 migrates the remaining call sites onto BloomSheet.
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { play } from "@/lib/sound/sound";
import { Button } from "./button";
import "@/styles/bloom-sheet.css";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function useIsPhone(): boolean {
  const [phone, setPhone] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return phone;
}

export const sheetStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.12 } },
};

export const sheetItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const sheetItemReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
};

export function useSheetItemVariants(): Variants {
  const reduced = useReducedMotion();
  return reduced ? sheetItemReduced : sheetItem;
}

export function BloomSheet({
  open,
  onClose,
  title,
  description,
  size = "md",
  placement = "sheet",
  className,
  panelClassName,
  children,
  onEscapeKeyDown,
}: {
  open: boolean;
  onClose: () => void;
  /** Visually-hidden accessible name (the visible title lives in `children`). */
  title: string;
  description?: string | undefined;
  size?: "md" | "lg";
  /** "sheet" slides from the bottom; "pop" floats centred on phones too. */
  placement?: "sheet" | "pop" | undefined;
  className?: string | undefined;
  panelClassName?: string | undefined;
  children: React.ReactNode;
  onEscapeKeyDown?: ((e: KeyboardEvent) => void) | undefined;
}) {
  const phone = useIsPhone();
  const reduced = useReducedMotion();
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  /** A pop is a phone that chose the centred card — card motion, no grabber. */
  const pop = phone && placement === "pop";
  const bottomSheet = phone && !pop;

  /*
   * Keyboard: phones don't shrink the layout viewport when it opens, so a
   * focused field deep in a tall sheet would hide underneath — bring it into
   * view inside the sheet instead. Runs for every BloomSheet at once.
   */
  React.useEffect(() => {
    if (!open || !phone) return;
    const panel = panelRef.current;
    if (!panel) return;
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.scrollIntoView !== "function") return;
      if (!panel.contains(target)) return;
      window.setTimeout(() => {
        try {
          target.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
        } catch {
          target.scrollIntoView();
        }
      }, 120);
    };
    panel.addEventListener("focusin", onFocus);
    return () => panel.removeEventListener("focusin", onFocus);
  }, [open, phone, reduced]);

  /*
   * Every sheet in the app gets its open/close cue here rather than at each
   * call site — one place to change, and no sheet can forget. Fired on the
   * transition of `open`, not on mount, so a sheet rendered already-open (a
   * deep link, a restored draft) stays silent.
   */
  const wasOpen = React.useRef(open);
  React.useEffect(() => {
    if (open !== wasOpen.current) {
      play(open ? "open" : "close");
      wasOpen.current = open;
    }
  }, [open]);

  /*
   * The centre offset lives here, inside Motion's own transform — not in the
   * stylesheet. Motion writes the whole `transform` property at runtime and
   * wins the cascade, so the stylesheet's offset was discarded; and because
   * the panel is positioned with `left/top: 50%`, the card's *top-left* corner
   * landed on the centre of the screen and the sheet ran down-right, off the
   * bottom edge. Values handed to Motion through `style` are part of its
   * transform template, so no animation can drop them.
   */
  const centered = !bottomSheet;
  const panelStyle = centered ? { x: "-50%", y: "-50%" } : undefined;

  const panelInitial = reduced
    ? { opacity: 0 }
    : bottomSheet
      ? { opacity: 0, y: 48, scale: 1 }
      : { opacity: 0, scale: 0.975 };
  /* `y` is pinned at −50% for a centred panel, so the slide can only apply to
     a bottom sheet — animating it here would fight the pinned offset. */
  const panelShow = bottomSheet ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, scale: 1 };
  const panelExit = reduced
    ? { opacity: 0, transition: { duration: 0.16 } }
    : bottomSheet
      ? { opacity: 0, y: 40, transition: { duration: 0.26, ease: EASE } }
      : { opacity: 0, scale: 0.985, transition: { duration: 0.22, ease: EASE } };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                key="backdrop"
                className="bsheet-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.22 } }}
                transition={{ duration: 0.36, ease: "easeOut" }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content
              asChild
              forceMount
              {...(onEscapeKeyDown ? { onEscapeKeyDown } : {})}
            >
              <motion.div
                key="panel"
                ref={panelRef}
                className={cn(
                  "bsheet",
                  pop ? "bsheet--pop" : phone ? "bsheet--phone" : "bsheet--card",
                  `bsheet--${size}`,
                  className,
                )}
                initial={panelInitial}
                animate={panelShow}
                exit={panelExit}
                transition={{ duration: reduced ? 0.25 : 0.62, ease: EASE }}
                {...(panelStyle ? { style: panelStyle } : {})}
              >
                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="sr-only">
                    {description}
                  </DialogPrimitive.Description>
                ) : null}
                <div className={cn("bsheet-panel", panelClassName)}>
                  {bottomSheet ? <span className="bsheet-grab" aria-hidden /> : null}
                  {children}
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/** A staggering container for the panel's content. */
export function SheetBody({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <motion.div className={className} variants={sheetStagger} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function SheetItem({
  className,
  children,
}: {
  className?: string | undefined;
  children: React.ReactNode;
}) {
  const variants = useSheetItemVariants();
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}

/**
 * BloomConfirm — BloomSheet's confirm variant (plan §2.4/§5.2), absorbing
 * the old standalone ConfirmSheet. Same props and behaviour the
 * ConfirmSheet call sites know: calm rather than alarming (the copy
 * carries the consequence), an async-aware busy state that locks dismissal
 * while the confirm is in flight, and — since U2 — the kit Button for both
 * actions instead of hand-rolled pills, so confirms inherit the button
 * language (gold primary, rose destructive, ghost cancel) for free.
 */
export function BloomConfirm({
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
  /** "danger" uses the destructive button; "default" the gold primary. */
  tone?: "danger" | "default";
  /** Shown on the confirm button while an async onConfirm is in flight. */
  busyLabel?: string | undefined;
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);

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
        <p className="text-[length:var(--text-meta)] font-medium uppercase tracking-[var(--tracking-meta)] text-muted-foreground">
          {tone === "danger" ? "Before you go" : "Just checking"}
        </p>
        <h2 className="mt-3 font-display text-[22px] leading-tight text-foreground sm:text-[24px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2.5 max-w-[46ch] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div className="mt-7 flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "destructive" : "default"}
            onClick={() => void run()}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="animate-pulse" aria-hidden />
                {busyLabel ?? "Working…"}
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </BloomSheet>
  );
}
