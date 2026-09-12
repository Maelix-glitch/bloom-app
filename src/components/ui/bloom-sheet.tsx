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
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";

import { cn } from "@/lib/utils";
import { play } from "@/lib/sound/sound";
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

  const panelInitial = reduced
    ? { opacity: 0 }
    : bottomSheet
      ? { opacity: 0, y: 48, scale: 1 }
      : { opacity: 0, y: 22, scale: 0.975 };
  const panelShow = { opacity: 1, y: 0, scale: 1 };
  const panelExit = reduced
    ? { opacity: 0, transition: { duration: 0.16 } }
    : bottomSheet
      ? { opacity: 0, y: 40, transition: { duration: 0.26, ease: EASE } }
      : { opacity: 0, y: 12, scale: 0.985, transition: { duration: 0.22, ease: EASE } };

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