/**
 * CameraCapture — a minimal full-screen camera for stories.
 * Photo shutter + short video clips, front/back flip, torch where supported,
 * honest permission states. Every track stops the moment the camera closes.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Aperture, CameraOff, RefreshCcw, SwitchCamera, Video, X, Zap, ZapOff } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CapturedPhoto {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

export interface CapturedVideo {
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  durationMs: number;
  contentType: string;
}

type PermissionState = "prompting" | "granted" | "denied" | "unavailable";

const MAX_CLIP_MS = 30_000;

export function CameraCapture({
  onPhoto,
  onVideo,
  onClose,
}: {
  onPhoto: (photo: CapturedPhoto) => void;
  onVideo: (video: CapturedVideo) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimer = useRef<number | undefined>(undefined);
  const recordStart = useRef(0);

  const [permission, setPermission] = useState<PermissionState>("prompting");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [flash, setFlash] = useState(false);

  const stopStream = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    window.clearTimeout(recordTimer.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startStream = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermission("unavailable");
      return;
    }
    stopStream();
    setPermission("prompting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1920 } },
        audio: mode === "video",
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as { torch?: boolean } | undefined;
      setTorchSupported(Boolean(caps?.torch));
      setTorch(false);
      setPermission("granted");
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      setPermission(
        name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable",
      );
    }
  }, [facing, mode, stopStream]);

  useEffect(() => {
    void startStream();
    return () => stopStream();
  }, [startStream, stopStream]);

  /* keep the preview honest when the tab hides */
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      /* torch is best-effort */
    }
  }, [torch]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror the front camera so the capture matches the preview.
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 340);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onPhoto({
          blob,
          dataUrl: canvas.toDataURL("image/jpeg", 0.82),
          width: canvas.width,
          height: canvas.height,
        });
      },
      "image/jpeg",
      0.86,
    );
  }, [facing, onPhoto]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || typeof MediaRecorder === "undefined") return;
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((m) =>
      MediaRecorder.isTypeSupported(m),
    );
    try {
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : undefined,
      );
      chunksRef.current = [];
      recordStart.current = Date.now();
      setRecordMs(0);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        window.clearInterval(recordTimer.current);
        setRecording(false);
        const type = recorder.mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        const durationMs = Date.now() - recordStart.current;
        if (blob.size > 1024 && video) {
          onVideo({
            blob,
            previewUrl: URL.createObjectURL(blob),
            width: video.videoWidth || 720,
            height: video.videoHeight || 1280,
            durationMs,
            contentType: type.split(";")[0] ?? "video/webm",
          });
        }
        chunksRef.current = [];
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setRecording(true);
      recordTimer.current = window.setInterval(() => {
        const elapsed = Date.now() - recordStart.current;
        setRecordMs(elapsed);
        if (elapsed >= MAX_CLIP_MS) stopRecording();
      }, 200);
    } catch {
      /* recording unsupported — photo mode still works */
    }
  }, [onVideo, stopRecording]);

  const flip = useCallback(() => {
    if (recording) return;
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }, [recording]);

  return (
    <div
      className="bstory fixed inset-0 z-[90] flex flex-col bg-black"
      role="dialog"
      aria-label="Story camera"
    >
      {/* preview */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {permission === "granted" ? (
          <video
            ref={videoRef}
            className="size-full object-cover"
            playsInline
            muted
            style={facing === "user" ? { transform: "scaleX(-1)" } : undefined}
            aria-label="Camera preview"
          />
        ) : (
          <div className="grid size-full place-items-center px-8 text-center">
            {permission === "prompting" ? (
              <div className="flex flex-col items-center gap-3">
                <span
                  className="size-10 animate-spin rounded-full border-2 border-white/20 border-t-white/80"
                  aria-hidden
                />
                <p className="text-[13.5px] text-white/70">Opening your camera…</p>
              </div>
            ) : (
              <div className="flex max-w-[300px] flex-col items-center gap-3">
                <span className="grid size-12 place-items-center rounded-full bg-white/10 text-white/80">
                  <CameraOff className="size-5" aria-hidden />
                </span>
                <p className="display text-[18px] text-white">
                  {permission === "denied" ? "Camera access is off" : "No camera here"}
                </p>
                <p className="text-[13px] leading-relaxed text-white/60">
                  {permission === "denied"
                    ? "Bloom needs camera permission to take story photos. You can still share from your gallery."
                    : "This device doesn't have a camera Bloom can use. Your gallery works beautifully instead."}
                </p>
                {permission === "denied" ? (
                  <button
                    type="button"
                    onClick={() => void startStream()}
                    className="se-chip-btn mt-1"
                  >
                    <RefreshCcw className="size-3.5" aria-hidden /> Try again
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}
        {flash ? (
          <div className="scam-flash pointer-events-none absolute inset-0 bg-white" aria-hidden />
        ) : null}

        {/* top chrome */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="sv-icon-btn bg-black/40"
          >
            <X className="size-5" />
          </button>
          <div className="flex items-center gap-1 rounded-full bg-black/40 p-1 backdrop-blur-md">
            {(["photo", "video"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => !recording && setMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition-colors",
                  mode === m ? "bg-white text-black" : "text-white/75",
                )}
              >
                {m === "photo" ? "Photo" : "Video"}
              </button>
            ))}
          </div>
          {torchSupported ? (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              aria-label={torch ? "Turn flash off" : "Turn flash on"}
              aria-pressed={torch}
              className="sv-icon-btn bg-black/40"
            >
              {torch ? <Zap className="size-5" /> : <ZapOff className="size-5" />}
            </button>
          ) : (
            <span className="w-[38px]" aria-hidden />
          )}
        </div>

        {/* recording indicator */}
        {recording ? (
          <div className="absolute left-1/2 top-[max(70px,calc(env(safe-area-inset-top)+56px))] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3.5 py-1.5 backdrop-blur-md">
            <span className="scam-rec-dot size-2 rounded-full bg-[#e0685e]" aria-hidden />
            <span className="mono text-[11.5px] tracking-wide text-white" role="timer">
              {(recordMs / 1000).toFixed(1)}s / 30s
            </span>
          </div>
        ) : null}
      </div>

      {/* shutter row */}
      {permission === "granted" ? (
        <div className="flex items-center justify-around px-10 pb-[max(28px,env(safe-area-inset-bottom))] pt-5">
          <button
            type="button"
            onClick={flip}
            disabled={recording}
            aria-label="Flip camera"
            className="sv-icon-btn disabled:opacity-30"
          >
            {mode === "video" ? <Video className="size-5" /> : <SwitchCamera className="size-5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (mode === "photo") takePhoto();
              else if (recording) stopRecording();
              else startRecording();
            }}
            aria-label={
              mode === "photo" ? "Take photo" : recording ? "Stop recording" : "Start recording"
            }
            className="scam-shutter"
            data-recording={recording || undefined}
          >
            <span />
          </button>
          <span className="grid size-[38px] place-items-center text-white/50" aria-hidden>
            <Aperture className="size-5" />
          </span>
        </div>
      ) : null}
    </div>
  );
}
