/**
 * VoiceMic — the Voice-First India mic on Today (System 11).
 *
 * Tap the mic, speak ("mark gym done", "drank two glasses of water"),
 * and Bloom shows a confirm chip with exactly what it heard as an
 * action. NOTHING runs until Confirm is tapped — parsing alone never
 * executes. Recognition is the browser's own speech engine (en-IN);
 * where it doesn't exist, this renders one honest line and no button.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Mic, X } from "lucide-react";

import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { startListening, voiceCapability } from "@/lib/voice/capability";

export function VoiceMic({
  presentation = "row",
}: {
  /**
   * "row" — the original standalone row (kept for any other surface).
   * "chip" — Today's hero cluster (brief v6, M-117): the mic wears the
   * cluster's one `.home-chip` style and the helper sentence goes away;
   * the confirm card and status lines still render, full-width under
   * the cluster. The handler and the confirm-first rule are identical.
   */
  presentation?: "row" | "chip";
} = {}) {
  const chip = presentation === "chip";
  const capability = useMemo(() => voiceCapability(), []);
  const commands = useVoiceCommands();
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      stopRef.current?.();
    },
    [],
  );

  if (!capability.supported) {
    return chip ? (
      <p
        className="w-full text-[length:var(--text-support)] text-muted-foreground"
        role="note"
      >
        {capability.message}
      </p>
    ) : (
      <p className="mt-4 text-[length:var(--text-support)] text-muted-foreground" role="note">
        {capability.message}
      </p>
    );
  }

  const start = () => {
    setMicError(null);
    commands.dismiss();
    const stop = startListening({
      onTranscript: (transcript) => {
        setListening(false);
        stopRef.current = null;
        commands.hear(transcript);
      },
      onError: (error) => {
        setListening(false);
        stopRef.current = null;
        setMicError(
          error === "not-allowed" || error === "service-not-allowed"
            ? "The mic was blocked — allow microphone access for this site, then try again."
            : "Voice didn't work just then — try again, or type it instead.",
        );
      },
      onEnd: () => {
        setListening(false);
        stopRef.current = null;
      },
    });
    if (stop) {
      stopRef.current = stop;
      setListening(true);
    } else {
      setMicError("Voice isn't available in this browser — typing works as always.");
    }
  };

  const stopListening = () => {
    stopRef.current?.();
    stopRef.current = null;
    setListening(false);
  };

  const { state } = commands;

  if (chip) {
    return (
      <div className="contents">
        <button
          type="button"
          onClick={listening ? stopListening : start}
          aria-pressed={listening}
          className="home-chip"
        >
          <Mic className="h-4 w-4" aria-hidden />
          {listening ? "Listening… tap to stop" : "Speak a command"}
        </button>

        {micError && (
          <p
            className="w-full text-[length:var(--text-support)] text-muted-foreground"
            role="status"
          >
            {micError}
          </p>
        )}

        {state.phase === "confirm" && (
          <div
            className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3"
            role="group"
            aria-label="Confirm voice command"
          >
            <span className="text-sm font-medium text-foreground">{state.resolution.label}</span>
            <button
              type="button"
              onClick={commands.confirm}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              <Check className="h-4 w-4" aria-hidden />
              Confirm
            </button>
            <button
              type="button"
              onClick={commands.dismiss}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm text-foreground transition hover:bg-accent"
            >
              <X className="h-4 w-4" aria-hidden />
              Cancel
            </button>
          </div>
        )}

        {(state.phase === "notice" || state.phase === "done") && (
          <p
            className="w-full text-[length:var(--text-support)] text-muted-foreground"
            role="status"
          >
            {state.message}{" "}
            <button
              type="button"
              onClick={commands.dismiss}
              className="underline underline-offset-2"
            >
              Dismiss
            </button>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={listening ? stopListening : start}
          aria-pressed={listening}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
        >
          <Mic className="h-4 w-4" aria-hidden />
          {listening ? "Listening… tap to stop" : "Speak a command"}
        </button>
        <span className="text-[length:var(--text-support)] text-muted-foreground">
          Try “mark gym done” or “drank 500 ml water”.
        </span>
      </div>

      {micError && (
        <p className="mt-2 text-[length:var(--text-support)] text-muted-foreground" role="status">
          {micError}
        </p>
      )}

      {state.phase === "confirm" && (
        <div
          className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3"
          role="group"
          aria-label="Confirm voice command"
        >
          <span className="text-sm font-medium text-foreground">{state.resolution.label}</span>
          <button
            type="button"
            onClick={commands.confirm}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Check className="h-4 w-4" aria-hidden />
            Confirm
          </button>
          <button
            type="button"
            onClick={commands.dismiss}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-sm text-foreground transition hover:bg-accent"
          >
            <X className="h-4 w-4" aria-hidden />
            Cancel
          </button>
        </div>
      )}

      {(state.phase === "notice" || state.phase === "done") && (
        <p className="mt-2 text-[length:var(--text-support)] text-muted-foreground" role="status">
          {state.message}{" "}
          <button type="button" onClick={commands.dismiss} className="underline underline-offset-2">
            Dismiss
          </button>
        </p>
      )}
    </div>
  );
}
