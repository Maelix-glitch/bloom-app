import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Check, Image as ImageIcon, X } from "lucide-react";

/**
 * A private camera capture — nothing leaves the device until the person
 * presses Capture, and nothing is uploaded anywhere until they send it.
 */
export function CoachCamera({
  onClose,
  onUsePhoto,
  onChooseFile,
}: {
  onClose: () => void;
  onUsePhoto: (file: File) => void;
  onChooseFile: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<{ file: File; url: string } | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const requestCamera = useCallback(async () => {
    stopStream();
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera isn't available here. You can choose a photo instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch (cameraError) {
      stopStream();
      const name = cameraError instanceof DOMException ? cameraError.name : "";
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Camera permission was denied. You can choose a photo instead."
          : name === "NotFoundError"
            ? "No camera was found here. You can choose a photo instead."
            : "Camera isn't available here. You can choose a photo instead.",
      );
    }
  }, [stopStream]);

  useEffect(() => {
    mountedRef.current = true;
    void requestCamera();
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("keydown", onKey);
      stopStream();
    };
  }, [onClose, requestCamera, stopStream]);

  useEffect(
    () => () => {
      if (captured) URL.revokeObjectURL(captured.url);
    },
    [captured],
  );

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setError("The camera is still getting ready. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("This browser couldn't capture the image. Choose a photo instead.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("This browser couldn't capture the image. Try again.");
          return;
        }
        if (captured) URL.revokeObjectURL(captured.url);
        const file = new File([blob], `bloom-camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        setCaptured({ file, url: URL.createObjectURL(blob) });
        stopStream();
      },
      "image/jpeg",
      0.88,
    );
  };

  const retake = () => {
    if (captured) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    setError(null);
    void requestCamera();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="coach-camera-backdrop"
        role="presentation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onMouseDown={(event) => {
          if (event.currentTarget === event.target) onClose();
        }}
      >
        <motion.div
          className="coach-camera"
          role="dialog"
          aria-modal="true"
          aria-label="Camera input"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="coach-camera-head">
            <div>
              <p className="coach-camera-kicker">Camera input</p>
              <h2 className="coach-camera-title">Bring a moment into focus.</h2>
              <p className="coach-camera-sub">Nothing is captured until you press Capture.</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              className="coach-panel-close"
              onClick={onClose}
              aria-label="Close camera"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="coach-camera-stage">
            {error ? (
              <div className="coach-camera-error" role="alert">
                <AlertCircle className="size-4" aria-hidden="true" />
                <div>
                  <p>{error}</p>
                  <button type="button" onClick={onChooseFile} className="coach-camera-alt">
                    <ImageIcon className="size-3.5" aria-hidden="true" /> Choose a photo instead
                  </button>
                </div>
              </div>
            ) : captured ? (
              <img src={captured.url} alt="Captured photo preview" className="coach-camera-shot" />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="coach-camera-video"
                aria-label="Live camera preview"
              />
            )}
          </div>
          {captured ? (
            <div className="coach-camera-actions">
              <button type="button" className="coach-btn-ghost" onClick={retake}>
                Retake
              </button>
              <button
                type="button"
                className="coach-btn-primary"
                onClick={() => onUsePhoto(captured.file)}
              >
                <Check className="size-4" aria-hidden="true" /> Use photo
              </button>
            </div>
          ) : (
            <div className="coach-camera-actions">
              <button type="button" className="coach-btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="coach-btn-primary"
                disabled={Boolean(error)}
                onClick={capture}
              >
                Capture
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
