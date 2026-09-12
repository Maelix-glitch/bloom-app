/**
 * CameraCapture — Instagram-exact full-screen camera.
 * Tap shutter = photo, Hold = video (up to 60s), like Instagram.
 * UI: top X + flash + flip, bottom gallery thumb + shutter + flip, recording indicator.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, RefreshCcw, SwitchCamera, X, Zap, ZapOff } from "lucide-react";

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

const MAX_CLIP_MS = 60_000; // Instagram allows up to 60s

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
  const holdTimer = useRef<number | undefined>(undefined);
  const isHolding = useRef(false);

  const [permission, setPermission] = useState<PermissionState>("prompting");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordMs, setRecordMs] = useState(0);
  const [flash, setFlash] = useState(false);

  const stopStream = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {}
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
        audio: true,
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
      setPermission(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
    }
  }, [facing, stopStream]);

  useEffect(() => {
    void startStream();
    return () => stopStream();
  }, [startStream, stopStream]);

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
    } catch {}
  }, [torch]);

  const takePhoto = useCallback(() => {
    try {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return;
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight, 1));
      canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      if (facing === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 200);
      canvas.toBlob(
        (blob) => {
          try {
            if (!blob) return;
            onPhoto({
              blob,
              dataUrl: canvas.toDataURL("image/jpeg", 0.9),
              width: canvas.width,
              height: canvas.height,
            });
          } catch {}
        },
        "image/jpeg",
        0.9,
      );
    } catch {}
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
        mimeType ? { mimeType, videoBitsPerSecond: 5_000_000 } : undefined,
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
      }, 100);
    } catch {}
  }, [onVideo, stopRecording]);

  const flip = useCallback(() => {
    if (recording) return;
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }, [recording]);

  // Instagram hold-to-record logic
  const onShutterPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      isHolding.current = false;
      window.clearTimeout(holdTimer.current);
      holdTimer.current = window.setTimeout(() => {
        isHolding.current = true;
        startRecording();
      }, 200);
    },
    [startRecording],
  );

  const onShutterPointerUp = useCallback(
    (e: React.PointerEvent) => {
      window.clearTimeout(holdTimer.current);
      if (isHolding.current && recording) {
        stopRecording();
      } else if (!isHolding.current) {
        takePhoto();
      }
      isHolding.current = false;
    },
    [recording, stopRecording, takePhoto],
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black" role="dialog" aria-label="Instagram camera">
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
          <div className="grid size-full place-items-center px-8 text-center bg-black">
            {permission === "prompting" ? (
              <div className="flex flex-col items-center gap-3">
                <span className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden />
                <p className="text-[15px] text-white/70">Opening camera…</p>
              </div>
            ) : (
              <div className="flex max-w-[300px] flex-col items-center gap-4">
                <span className="grid size-16 place-items-center rounded-full bg-[#262626] text-white/80">
                  <CameraOff className="size-7" aria-hidden />
                </span>
                <p className="text-[20px] font-semibold text-white">
                  {permission === "denied" ? "Camera access off" : "No camera"}
                </p>
                <p className="text-[14px] leading-relaxed text-white/60">
                  {permission === "denied"
                    ? "Allow camera access in Settings to take photos. You can still share from gallery."
                    : "This device doesn't have a camera. Use gallery instead."}
                </p>
                {permission === "denied" ? (
                  <button
                    type="button"
                    onClick={() => void startStream()}
                    className="mt-2 flex items-center gap-2 rounded-full bg-white px-5 py-2 text-[14px] font-semibold text-black"
                  >
                    <RefreshCcw className="size-4" aria-hidden /> Try again
                  </button>
                ) : null}
              </div>
            )}
          </div>
        )}

        {flash ? <div className="pointer-events-none absolute inset-0 bg-white animate-[ig-flash_200ms_ease-out]" aria-hidden /> : null}

        {/* Top bar - Instagram */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md"
          >
            <X className="size-6" />
          </button>

          <div className="flex items-center gap-3">
            {torchSupported ? (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                aria-label={torch ? "Flash off" : "Flash on"}
                className="grid size-8 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md"
              >
                {torch ? <Zap className="size-5 fill-white" /> : <ZapOff className="size-5" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={flip}
              disabled={recording}
              aria-label="Flip camera"
              className="grid size-8 place-items-center rounded-full bg-black/30 text-white backdrop-blur-md disabled:opacity-40"
            >
              <SwitchCamera className="size-5" />
            </button>
          </div>
        </div>

        {/* Recording indicator - Instagram */}
        {recording ? (
          <div className="absolute left-1/2 top-[max(60px,calc(env(safe-area-inset-top)+48px))] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-1.5 backdrop-blur-md">
            <span className="size-2 animate-pulse rounded-full bg-[#ff3040]" aria-hidden />
            <span className="text-[13px] font-medium tracking-wide text-white tabular-nums" role="timer">
              {Math.floor(recordMs / 1000)}s
            </span>
          </div>
        ) : null}

        {/* Instagram mode hint */}
        {!recording ? (
          <div className="absolute bottom-[140px] left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 backdrop-blur-md">
            <span className="text-[12px] font-medium text-white/80">Tap for photo, hold for video</span>
          </div>
        ) : null}
      </div>

      {/* Bottom shutter row - Instagram */}
      {permission === "granted" ? (
        <div className="flex items-center justify-between bg-black px-8 pb-[max(32px,env(safe-area-inset-bottom))] pt-6">
          {/* Gallery thumb - Instagram shows last photo */}
          <div className="size-8 rounded-lg bg-[#262626] border border-white/20" aria-hidden />

          {/* Shutter - Instagram white circle */}
          <button
            type="button"
            aria-label="Shutter"
            className="group relative grid place-items-center"
            onPointerDown={onShutterPointerDown}
            onPointerUp={onShutterPointerUp}
            onPointerCancel={() => {
              window.clearTimeout(holdTimer.current);
              if (recording) stopRecording();
              isHolding.current = false;
            }}
          >
            <span className="absolute size-[80px] rounded-full border-[4px] border-white/90 group-active:scale-[0.95] transition-transform" />
            <span
              className={`size-[62px] rounded-full bg-white transition-all duration-150 ${
                recording ? "!size-[32px] !rounded-[6px] !bg-[#ff3040]" : "group-active:scale-[0.9]"
              }`}
            />
            {/* Recording progress ring */}
            {recording ? (
              <svg className="absolute size-[84px] -rotate-90" viewBox="0 0 84 84">
                <circle
                  cx="42"
                  cy="42"
                  r="38"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="3"
                />
                <circle
                  cx="42"
                  cy="42"
                  r="38"
                  fill="none"
                  stroke="#ff3040"
                  strokeWidth="3"
                  strokeDasharray={`${(recordMs / MAX_CLIP_MS) * 238} 238`}
                  className="transition-all duration-100"
                />
              </svg>
            ) : null}
          </button>

          {/* Flip */}
          <button
            type="button"
            onClick={flip}
            disabled={recording}
            aria-label="Switch camera"
            className="grid size-8 place-items-center rounded-full bg-[#262626] text-white disabled:opacity-30"
          >
            <RefreshCcw className="size-5" />
          </button>
        </div>
      ) : null}

      <style>{`@keyframes ig-flash { from { opacity: 1 } to { opacity: 0 } }`}</style>
    </div>
  );
}
