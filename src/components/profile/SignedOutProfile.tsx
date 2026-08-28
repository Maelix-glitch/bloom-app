/**
 * The signed-out Profile — an elegant door, not an error screen.
 */

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

import { cn } from "@/lib/utils";

export function SignedOutProfile({
  onSendMagicLink,
  compact = false,
}: {
  onSendMagicLink: (email: string) => Promise<{ ok: boolean; message: string }>;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    const value = email.trim();
    if (!value || !value.includes("@")) {
      setState("failed");
      setMessage("An email address, and the link arrives.");
      return;
    }
    setState("sending");
    const result = await onSendMagicLink(value);
    setMessage(result.message);
    setState(result.ok ? "sent" : "failed");
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
            placeholder="you@somewhere.calm"
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
            {state === "sending" ? "Sending…" : "Send link"}
          </button>
        </div>

        {message ? (
          <p
            role="status"
            className={cn("mt-3 text-[12.5px]", state === "sent" ? "text-sage" : "text-rose")}
          >
            {message}
          </p>
        ) : (
          <p className="mt-3 text-[12px] text-faint">
            A sign-in link, once. No password to remember.
          </p>
        )}
      </div>
    </div>
  );
}
