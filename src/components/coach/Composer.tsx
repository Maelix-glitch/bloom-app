import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Camera,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Plus,
  Send,
  Square,
  X,
} from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { CoachGlyph } from "./bloom-mark";

export interface ComposerAttachment {
  file: File;
  name: string;
  type: string;
  size: number;
  previewUrl: string | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isSupportedFile(file: File) {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/") || type.startsWith("audio/") || type.startsWith("text/")) {
    return true;
  }
  return [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ].includes(type);
}

const MAX_BYTES = 12 * 1024 * 1024;

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: ComposerAttachment;
  onRemove: () => void;
}) {
  const isImage = attachment.type.startsWith("image/");
  const isAudio = attachment.type.startsWith("audio/");
  return (
    <div className="coach-attachment">
      {isImage && attachment.previewUrl ? (
        <img className="coach-attachment-thumb" src={attachment.previewUrl} alt="" />
      ) : isAudio && attachment.previewUrl ? (
        <span className="coach-attachment-thumb coach-attachment-thumb-audio" aria-hidden="true">
          <Mic className="size-4" />
        </span>
      ) : (
        <span className="coach-attachment-thumb" aria-hidden="true">
          <FileText className="size-4" />
        </span>
      )}
      <span className="coach-attachment-copy">
        <strong>{attachment.name}</strong>
        <small>{formatBytes(attachment.size)}</small>
      </span>
      <button
        type="button"
        className="coach-attachment-remove"
        onClick={onRemove}
        aria-label={`Remove ${attachment.name}`}
        title="Remove attachment"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The composer — a quiet, tactile dock rather than a form in a box.
 * Attach (photo / file / camera), a voice note, and the send button are the
 * only permanent controls; everything rarer lives behind the plus menu.
 */
export function Composer({
  draft,
  onDraftChange,
  placeholder,
  thinking,
  inputRef,
  onSubmit,
  onOpenCamera,
  onNotice,
  onOpenContext,
  contextLabel,
  contextLive,
  followUps,
  onFollowUp,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  placeholder: string;
  thinking: boolean;
  /** Forced focus from the page (starters, follow-ups). */
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onSubmit: (text: string, attachment: ComposerAttachment | null) => Promise<boolean>;
  onOpenCamera: () => void;
  onNotice: (message: string | null) => void;
  onOpenContext: () => void;
  contextLabel: string;
  contextLive: boolean;
  followUps: string[];
  onFollowUp: (prompt: string) => void;
}) {
  const isMobile = useIsMobile();
  const textareaRef = inputRef;
  const menuRef = useRef<HTMLDivElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [attachment, setAttachment] = useState<ComposerAttachment | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        try {
          recorder.stop();
        } catch {
          /* already closed */
        }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  /* Auto-grow the textarea up to a comfortable five lines. */
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 168)}px`;
  }, [draft, textareaRef]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const finishRecording = (discard = false) => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorder.ondataavailable = null;
    recorder.onstop = null;
    const stream = streamRef.current;
    const chunks = chunksRef.current;
    const mime = recorder.mimeType || "audio/webm";
    recorderRef.current = null;
    chunksRef.current = [];
    stopStream();
    if (!discard && mountedRef.current && chunks.length > 0) {
      const blob = new Blob(chunks, { type: mime });
      const extension = mime.includes("mp4") ? "m4a" : "webm";
      addFile(new File([blob], `bloom-voice-${Date.now()}.${extension}`, { type: mime }));
    }
    if (mountedRef.current) {
      setRecording(false);
      setSeconds(0);
    }
    try {
      recorder.stop();
    } catch {
      /* already inactive */
    }
  };

  const startRecording = async () => {
    if (recording || thinking) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onNotice("Microphone access isn't available in this browser.");
      return;
    }
    let stream: MediaStream | undefined;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (candidate) =>
          typeof MediaRecorder.isTypeSupported !== "function" ||
          MediaRecorder.isTypeSupported(candidate),
      );
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        onNotice("Recording stopped because the microphone reported an error.");
        finishRecording(true);
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
      onNotice(null);
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      onNotice("Microphone access was denied. Check permissions and try again.");
    }
  };

  const addFile = (file: File) => {
    onNotice(null);
    if (file.size === 0) {
      onNotice("That file is empty — choose another.");
      return;
    }
    if (!isSupportedFile(file)) {
      onNotice("That file type isn't supported here — try an image, audio, text or PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      onNotice("That file is larger than 12 MB. Choose a smaller one.");
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const type = file.type || "application/octet-stream";
    const previewUrl =
      type.startsWith("image/") || type.startsWith("audio/") ? URL.createObjectURL(file) : null;
    urlRef.current = previewUrl;
    setAttachment({ file, name: file.name, type, size: file.size, previewUrl });
    setMenuOpen(false);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const removeAttachment = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setAttachment(null);
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (thinking || busy) return;
    const text = draft.trim();
    if (!text && !attachment) return;
    setBusy(true);
    const ok = await onSubmit(text, attachment);
    setBusy(false);
    if (ok) {
      setDraftState("");
      removeAttachment();
    } else {
      onNotice("That reply didn't make it — your message is still here to try again.");
    }
  };

  /* Camera picks arrive here (the page hands them to us via events). */
  useEffect(() => {
    const attach = (event: Event) => {
      const file = (event as CustomEvent<File>).detail;
      if (file) addFile(file);
    };
    const pickPhoto = () => {
      photoRef.current?.click();
    };
    window.addEventListener("coach:attach", attach);
    window.addEventListener("coach:pick-photo", pickPhoto);
    return () => {
      window.removeEventListener("coach:attach", attach);
      window.removeEventListener("coach:pick-photo", pickPhoto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDraftState = (value: string) => {
    onDraftChange(value);
  };

  const hasContent = Boolean(draft.trim()) || attachment !== null;
  const canSubmit = (hasContent && !thinking && !busy) || false;

  return (
    <div className="coach-composer-zone">
      {followUps.length > 0 && !thinking ? (
        <div className="coach-followups" aria-label="Suggested follow-ups">
          {followUps.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="coach-followup"
              onClick={() => onFollowUp(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {attachment ? (
          <motion.div
            className="coach-composer-attachments"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <AttachmentPreview attachment={attachment} onRemove={removeAttachment} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {recording ? (
        <div className="coach-recording" role="status">
          <span className="coach-recording-live" aria-hidden="true" />
          <span className="coach-recording-label">Recording</span>
          <span className="coach-recording-time">0:{String(seconds).padStart(2, "0")}</span>
          <span className="coach-recording-spacer" />
          <button
            type="button"
            className="coach-recording-action"
            onClick={() => finishRecording(true)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="coach-recording-stop"
            onClick={() => finishRecording(false)}
            aria-label="Use recording"
          >
            <Square className="coach-recording-stop-icon" aria-hidden="true" />
            Use
          </button>
        </div>
      ) : (
        <form
          className={cn("coach-composer", !hasContent && "is-empty", thinking && "is-thinking")}
          onSubmit={handleSubmit}
          aria-busy={thinking}
        >
          <div className="coach-composer-row">
            <div className="coach-composer-actions-left">
              <div ref={menuRef} className="coach-attach">
                <button
                  type="button"
                  className="coach-composer-icon"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="Add to your message"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  title="Add to your message"
                >
                  <Plus className={cn("coach-composer-icon-svg", menuOpen && "is-rotated")} />
                </button>
                {menuOpen ? (
                  <div className="coach-attach-menu" role="menu" aria-label="Add options">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        photoRef.current?.click();
                      }}
                    >
                      <ImageIcon className="coach-attach-menu-icon" aria-hidden="true" />
                      Photo
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        fileRef.current?.click();
                      }}
                    >
                      <FileText className="coach-attach-menu-icon" aria-hidden="true" />
                      File
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenCamera();
                      }}
                    >
                      <Camera className="coach-attach-menu-icon" aria-hidden="true" />
                      Camera
                    </button>
                  </div>
                ) : null}
              </div>
              <input
                ref={photoRef}
                type="file"
                hidden
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) addFile(file);
                  event.currentTarget.value = "";
                }}
              />
              <input
                ref={fileRef}
                type="file"
                hidden
                accept="audio/*,.pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) addFile(file);
                  event.currentTarget.value = "";
                }}
              />
            </div>
            <textarea
              ref={textareaRef}
              value={draft}
              rows={1}
              onChange={(event) => setDraftState(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (canSubmit) handleSubmit();
                }
              }}
              placeholder={placeholder}
              aria-label="Message Bloom"
              className="coach-composer-input"
            />
            <div className="coach-composer-actions-right">
              <button
                type="button"
                className="coach-composer-icon"
                onClick={() => void startRecording()}
                disabled={thinking}
                aria-label="Record a voice note"
                title="Voice note"
              >
                <Mic className="coach-composer-icon-svg" />
              </button>
              <motion.button
                type="submit"
                disabled={!canSubmit}
                className={cn("coach-send", canSubmit && "can-send", thinking && "is-thinking")}
                aria-label="Send message"
                title="Send message"
                whileTap={{ scale: 0.9 }}
              >
                {thinking ? (
                  <CoachGlyph size={16} active />
                ) : (
                  <Send className="coach-send-icon" aria-hidden="true" />
                )}
              </motion.button>
            </div>
          </div>
          <div className="coach-composer-foot">
            <button
              type="button"
              className={cn("coach-context-chip", !contextLive && "is-quiet")}
              onClick={onOpenContext}
              aria-haspopup="dialog"
            >
              <span className="coach-context-dot" aria-hidden="true" />
              <span>{contextLabel}</span>
            </button>
            <span className="coach-composer-hint">
              {thinking
                ? "Bloom is responding…"
                : isMobile
                  ? "Shift + Enter for a new line"
                  : "Enter to send · Shift + Enter for a new line"}
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
