/**
 * The three sheets Tier B part 2 adds to the profile's Account & data block:
 *
 *   · **ExportSheet** (B7) — one file with everything, with the counts shown
 *     before the download so nobody has to guess what they are getting.
 *   · **RemindersSheet** (B4) — permission, then per-kind switches and the
 *     evening time; a "show me one" button so the first notification is
 *     expected rather than a surprise.
 *   · **EraseSheet** (B9) — what is about to go, a typed confirmation, and an
 *     honest report of which halves succeeded.
 *
 * All three sit on `BloomSheet`, the primitive the premium profile dialogs
 * already use, so they feel like the rest of the app on phone and desktop.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  Download,
  Loader2,
  Share,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

import { BloomIcon } from "@/components/icons/BloomIcon";
import { BloomSheet, SheetBody, SheetItem } from "@/components/ui/bloom-sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  describeExport,
  downloadExport,
  totalRecords,
  type ExportBundle,
} from "@/lib/data/exportAll";
import { ERASE_PHRASE, eraseEverything, matchesErasePhrase } from "@/lib/data/erase";
import type { RemindersStore } from "@/hooks/useReminders";
import type { InstallState } from "@/hooks/useInstallPrompt";

/* -------------------------------- shared -------------------------------- */

/**
 * The family's visible way out (popup-premium slice): these sheets relied
 * on Escape / backdrop alone, so on desktop nothing on screen said they
 * could be closed. One round ×, top-right of the panel, like the tracker
 * sheets carry. It only dismisses — it never saves or erases.
 */
function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="bsheet-icon absolute right-4 top-4 z-10 sm:right-5"
    >
      <BloomIcon name="close" size={16} />
    </button>
  );
}

function SheetHead({ title, blurb }: { title: string; blurb: string }) {
  return (
    <SheetItem className="px-5 pb-1 pr-14 pt-1 sm:px-6 sm:pr-16">
      <h2 className="display text-[20px] leading-tight">{title}</h2>
      <p className="mt-1.5 text-[length:var(--text-support)] leading-relaxed text-muted-foreground">
        {blurb}
      </p>
    </SheetItem>
  );
}

function LineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[length:var(--text-support)] text-muted-foreground">{label}</span>
      <span className="mono text-[length:var(--text-caption)] tabular-nums">{value}</span>
    </div>
  );
}

/* ------------------------------- B7 export ------------------------------- */

export function ExportSheet({
  open,
  onClose,
  build,
}: {
  open: boolean;
  onClose: () => void;
  /** Built lazily — the bundle is only assembled when the sheet is open. */
  build: () => ExportBundle;
}) {
  const bundle = useMemo(() => (open ? build() : null), [open, build]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) setDone(false);
  }, [open]);

  const counts = bundle?.counts;

  return (
    <BloomSheet open={open} onClose={onClose} title="Download everything" size="md">
      <SheetClose onClose={onClose} />
      <SheetBody className="pb-5">
        <SheetHead
          title="Download everything"
          blurb="One JSON file with your whole record — not just the profile. It is built here, on this device; nothing is uploaded to make it."
        />
        <SheetItem className="px-5 pt-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-surface/50 px-4 py-3">
            {counts ? (
              <>
                <LineRow label="Mood check-ins" value={String(counts.moodEntries)} />
                <LineRow label="Habit ticks" value={String(counts.habitLogs)} />
                <LineRow label="Habits" value={String(counts.habits)} />
                <LineRow label="Tracker days" value={String(counts.trackerDays)} />
                <LineRow label="Periods" value={String(counts.periods)} />
                <LineRow label="Cycle days" value={String(counts.cycleDays)} />
                <LineRow
                  label="Moments & highlights"
                  value={String(counts.stories + counts.highlights)}
                />
                <LineRow label="Coach messages" value={String(counts.coachMessages)} />
                <LineRow label="Point entries" value={String(counts.pointEntries)} />
                <div className="mt-2 border-t border-border pt-2">
                  <LineRow label="Records in the file" value={String(totalRecords(counts))} />
                </div>
              </>
            ) : null}
          </div>
        </SheetItem>
        <SheetItem className="px-5 pt-4 sm:px-6">
          <button
            type="button"
            data-testid="pf-export-all-go"
            onClick={() => {
              if (!bundle) return;
              downloadExport(bundle);
              setDone(true);
              toast("Downloaded.", { description: describeExport(bundle.counts) });
            }}
            className="pf-btn pf-btn--primary h-11 w-full justify-center text-[length:var(--text-support)]"
          >
            {done ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {done ? "Saved to your downloads" : "Download my data"}
          </button>
          <p className="mt-3 text-[length:var(--text-caption)] leading-relaxed text-faint">
            Keep it somewhere private: it contains everything you have logged.
          </p>
        </SheetItem>
      </SheetBody>
    </BloomSheet>
  );
}

/* ----------------------------- B4 reminders ------------------------------ */

export function RemindersSheet({
  open,
  onClose,
  reminders,
  install,
}: {
  open: boolean;
  onClose: () => void;
  reminders: RemindersStore;
  install: InstallState;
}) {
  const { settings, permission } = reminders;
  const [asking, setAsking] = useState(false);
  const blocked = permission === "denied";
  const unsupported = permission === "unsupported";

  return (
    <BloomSheet open={open} onClose={onClose} title="Reminders" size="md">
      <SheetClose onClose={onClose} />
      <SheetBody className="pb-5">
        <SheetHead
          title="Remind me"
          blurb="Quiet by default. Bloom only nudges about habits you have set a time for, a period the record expects, and an evening that still has nothing on it."
        />

        {unsupported ? (
          <SheetItem className="px-5 pt-4 sm:px-6">
            <p className="rounded-2xl border border-border bg-surface/50 px-4 py-3 text-[length:var(--text-support)] text-muted-foreground">
              This browser can't show notifications. On iPhone, add Bloom to your home screen first
              — installed apps can.
            </p>
          </SheetItem>
        ) : null}

        {blocked ? (
          <SheetItem className="px-5 pt-4 sm:px-6">
            <p className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[length:var(--text-support)] text-muted-foreground">
              Notifications are blocked for Bloom in your browser settings. Allow them there, then
              come back.
            </p>
          </SheetItem>
        ) : null}

        <SheetItem className="px-5 pt-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-surface/50 px-4 py-3">
            <label className="flex items-center justify-between gap-4 py-1.5">
              <span className="flex items-center gap-2.5 text-[length:var(--text-support)]">
                {settings.enabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
                Reminders
              </span>
              <Switch
                data-testid="pf-reminders-toggle"
                checked={settings.enabled}
                disabled={asking || blocked || unsupported}
                onCheckedChange={(on) => {
                  if (!on) {
                    reminders.disable();
                    return;
                  }
                  setAsking(true);
                  void reminders.enable().then((ok) => {
                    setAsking(false);
                    if (!ok) toast("Bloom needs permission from the browser to remind you.");
                  });
                }}
              />
            </label>

            {settings.enabled ? (
              <div className="mt-1 border-t border-border pt-1">
                <label className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[length:var(--text-support)]">Habits, at their time</span>
                  <Switch
                    data-testid="pf-reminders-habits"
                    checked={settings.habits}
                    onCheckedChange={(v) => reminders.set("habits", v)}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[length:var(--text-support)]">
                    Cycle
                    <span className="block text-[length:var(--text-meta)] text-faint">
                      two days before an expected period, and when it's late
                    </span>
                  </span>
                  <Switch
                    data-testid="pf-reminders-cycle"
                    checked={settings.cycle}
                    onCheckedChange={(v) => reminders.set("cycle", v)}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 py-2">
                  <span className="text-[length:var(--text-support)]">
                    Nothing logged today
                    <span className="block text-[length:var(--text-meta)] text-faint">
                      only on an empty day
                    </span>
                  </span>
                  <Switch
                    data-testid="pf-reminders-evening"
                    checked={settings.evening}
                    onCheckedChange={(v) => reminders.set("evening", v)}
                  />
                </label>
                {settings.evening ? (
                  <label className="flex items-center justify-between gap-4 py-2">
                    <span className="text-[length:var(--text-support)]">Evening nudge at</span>
                    <input
                      type="time"
                      data-testid="pf-reminders-time"
                      value={settings.eveningTime}
                      onChange={(e) => reminders.set("eveningTime", e.target.value)}
                      className="h-9 rounded-lg border border-border bg-background px-2 text-[length:var(--text-support)]"
                    />
                  </label>
                ) : null}
              </div>
            ) : null}
          </div>
        </SheetItem>

        {settings.enabled && permission === "granted" ? (
          <SheetItem className="px-5 pt-3 sm:px-6">
            <button
              type="button"
              onClick={() => void reminders.test()}
              className="pf-btn h-9 px-3 text-[length:var(--text-caption)]"
            >
              Show me one
            </button>
            {reminders.preview.length > 0 ? (
              <p className="mt-3 text-[length:var(--text-caption)] text-faint">
                Due right now: {reminders.preview.map((r) => r.title).join(" · ")}
              </p>
            ) : null}
          </SheetItem>
        ) : null}

        {!install.installed ? (
          <SheetItem className="px-5 pt-4 sm:px-6">
            <div className="rounded-2xl border border-border bg-surface/50 px-4 py-3">
              <p className="flex items-center gap-2 text-[length:var(--text-support)]">
                <Smartphone className="size-4" aria-hidden /> Install Bloom
              </p>
              <p className="mt-1 text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
                {install.ios
                  ? "On iPhone: tap Share, then Add to Home Screen. Reminders can only fire from the installed app."
                  : "Add Bloom to your home screen — it opens without browser chrome and reminders keep working."}
              </p>
              {install.canInstall ? (
                <button
                  type="button"
                  data-testid="pf-install-go"
                  onClick={() => void install.install()}
                  className="pf-btn mt-3 h-9 px-3 text-[length:var(--text-caption)]"
                >
                  <Smartphone className="size-3.5" aria-hidden /> Add to home screen
                </button>
              ) : install.ios ? (
                <p className="mono mt-3 flex items-center gap-1.5 text-[length:var(--text-meta)] text-faint">
                  <Share className="size-3.5" aria-hidden /> Share → Add to Home Screen
                </p>
              ) : null}
            </div>
          </SheetItem>
        ) : null}
      </SheetBody>
    </BloomSheet>
  );
}

/* ------------------------------- B9 erase -------------------------------- */

export function EraseSheet({
  open,
  onClose,
  isSignedIn,
  counts,
  onErased,
}: {
  open: boolean;
  onClose: () => void;
  isSignedIn: boolean;
  counts: { label: string; value: number }[];
  onErased: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      setProblem(null);
    }
  }, [open]);

  const armed = matchesErasePhrase(typed) && !busy;

  return (
    <BloomSheet open={open} onClose={onClose} title="Erase everything" size="md">
      <SheetClose onClose={onClose} />
      <SheetBody className="pb-5">
        <SheetItem className="px-5 pb-1 pr-14 pt-1 sm:px-6 sm:pr-16">
          <p className="flex items-center gap-2 text-[length:var(--text-caption)] uppercase tracking-[var(--tracking-meta)] text-red-400">
            <AlertTriangle className="size-3.5" aria-hidden /> This cannot be undone
          </p>
          <h2 className="display mt-2 text-[20px] leading-tight">Erase everything</h2>
          <p className="mt-1.5 text-[length:var(--text-support)] leading-relaxed text-muted-foreground">
            {isSignedIn
              ? "Your record is deleted from this device and from your account, and you are signed out."
              : "Your record is deleted from this device. There is no account signed in, so there is nothing else to remove."}
          </p>
        </SheetItem>

        <SheetItem className="px-5 pt-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-surface/50 px-4 py-3">
            {counts.map((c) => (
              <LineRow key={c.label} label={c.label} value={String(c.value)} />
            ))}
          </div>
          <p className="mt-3 text-[length:var(--text-caption)] leading-relaxed text-muted-foreground">
            If you might want any of it later, download it first — the export sits one row above
            this one.
          </p>
        </SheetItem>

        <SheetItem className="px-5 pt-4 sm:px-6">
          <label
            className="block text-[length:var(--text-caption)] text-muted-foreground"
            htmlFor="pf-erase-confirm"
          >
            Type <span className="mono text-foreground">{ERASE_PHRASE}</span> to confirm
          </label>
          <input
            id="pf-erase-confirm"
            data-testid="pf-erase-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-[length:var(--text-callout)] outline-none focus:border-red-400/60"
          />
          {problem ? (
            <p className="mt-2 text-[length:var(--text-caption)] text-amber-400">{problem}</p>
          ) : null}
          <button
            type="button"
            data-testid="pf-erase-go"
            disabled={!armed}
            onClick={() => {
              setBusy(true);
              setProblem(null);
              void eraseEverything(isSignedIn).then((result) => {
                setBusy(false);
                if (result.message) {
                  setProblem(result.message);
                  return;
                }
                toast("Everything has been erased.");
                onErased();
              });
            }}
            className={cn(
              "mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-[length:var(--text-support)] transition-colors",
              armed
                ? "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                : "cursor-not-allowed border-border text-faint",
            )}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Erase everything
          </button>
        </SheetItem>
      </SheetBody>
    </BloomSheet>
  );
}
