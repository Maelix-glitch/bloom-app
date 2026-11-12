/**
 * The signed-out Profile — an elegant door, not an error screen.
 */

import { useState } from "react";
import { KeyRound, Loader2, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

export function SignedOutProfile({
  onSendMagicLink,
  onVerifyCode,
  compact = false,
}: {
  onSendMagicLink: (email: string) => Promise<{ ok: boolean; message: string }>;
  /** When given, the sent state grows a code box: type the emailed code and
      the session lands in this tab, no link tap needed. */
  onVerifyCode?: (email: string, code: string) => Promise<{ ok: boolean; message: string }>;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "verifying" | "failed">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeFailed, setCodeFailed] = useState(false);

  const submit = async () => {
    const value = email.trim();
    if (!value || !value.includes("@")) {
      setState("failed");
      setMessage("An email address, and the code arrives.");
      return;
    }
    setState("sending");
    setCode("");
    setCodeFailed(false);
    /*
     * A rejection here used to strand the button on "sending" forever, because
     * nothing caught it — which is exactly what "the magic link isn't sending"
     * looked like. The state must always resolve, even when the call explodes.
     */
    try {
      const result = await onSendMagicLink(value);
      setMessage(result.message);
      setState(result.ok ? "sent" : "failed");
    } catch (e) {
      setMessage(
        e instanceof Error && e.message
          ? e.message
          : "Something went wrong sending that code. Try again in a moment.",
      );
      setState("failed");
    }
  };

  const verify = async () => {
    if (!onVerifyCode) return;
    const token = code.trim();
    if (!token) return;
    setState("verifying");
    /* Same rule as the send: the state must always resolve. A failed check
       returns to "sent" — the code box stays up, with the reason under it. */
    try {
      const result = await onVerifyCode(email.trim(), token);
      setMessage(result.message);
      setCodeFailed(!result.ok);
      setState("sent");
    } catch (e) {
      setMessage(
        e instanceof Error && e.message
          ? e.message
          : "Something went wrong checking that code. Try again in a moment.",
      );
      setCodeFailed(true);
      setState("sent");
    }
  };

  return (
    <div
      className={cn(
        "mx-auto flex max-w-[520px] flex-col items-center text-center",
        compact ? "py-4" : "pt-16",
      )}
    >
      <p className="eyebrow mb-5">A little place that's yours</p>
      <h1
        className={cn(
          "display leading-tight text-balance",
          compact ? "text-[24px]" : "text-[30px] sm:text-[36px]",
        )}
      >
        Your profile is here,
        <br />
        behind a quiet door.
      </h1>
      <p
        className={cn(
          "mt-4 max-w-[46ch] text-[14px] leading-relaxed text-muted-foreground",
          compact && "text-[13.5px]",
        )}
      >
        Sign in and Bloom will show you your moments, your milestones, and the things you've chosen
        to keep — exactly as you left them.
      </p>

      <div className="mt-8 w-full max-w-[380px]">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border bg-surface/60 p-1.5 pl-4 transition-colors",
            state === "failed"
              ? "border-rose/50"
              : "border-border focus-within:border-border-strong",
          )}
        >
          <Mail className="size-4 shrink-0 text-faint" aria-hidden />
          <label htmlFor="bloom-signin-email" className="sr-only">
            Email address
          </label>
          <input
            id="bloom-signin-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state !== "idle") setState("idle");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] outline-none placeholder:text-faint/70"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={state === "sending"}
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-[var(--primary-foreground)] transition-transform duration-300 enabled:hover:scale-[1.02] disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, var(--violet), var(--sky))" }}
          >
            {state === "sending" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            {state === "sending" ? "Sending…" : "Send code"}
          </button>
        </div>

        {message ? (
          <p
            role="status"
            className={cn(
              "mt-3 text-[12.5px]",
              (state === "sent" || state === "verifying") && !codeFailed
                ? "text-sage"
                : "text-rose",
            )}
          >
            {message}
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-faint">
            A sign-in code, once. No password to remember.
          </p>
        )}

        {onVerifyCode && (state === "sent" || state === "verifying") ? (
          <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-surface/60 p-1.5 pl-4 transition-colors focus-within:border-border-strong">
            <KeyRound className="size-4 shrink-0 text-faint" aria-hidden />
            <label htmlFor="bloom-signin-code" className="sr-only">
              Sign-in code
            </label>
            <input
              id="bloom-signin-code"
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
              placeholder="8-digit code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\s/g, ""));
                setCodeFailed(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void verify();
                }
              }}
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] tracking-[0.18em] outline-none placeholder:text-faint/70 placeholder:tracking-normal"
            />
            <button
              type="button"
              onClick={() => void verify()}
              disabled={state === "verifying" || code.trim().length === 0}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-[var(--primary-foreground)] transition-transform duration-300 enabled:hover:scale-[1.02] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, var(--violet), var(--sky))" }}
            >
              {state === "verifying" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
              {state === "verifying" ? "Checking…" : "Verify"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
