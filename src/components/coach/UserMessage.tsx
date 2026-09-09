import { motion } from "motion/react";
import { FileText } from "lucide-react";

import type { CoachMessage } from "@/hooks/useCoachSystem";
import { messageTime } from "@/lib/coach/ui-helpers";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentInline({
  message,
  previewUrl,
}: {
  message: CoachMessage;
  previewUrl?: string | undefined;
}) {
  const attachment = message.attachment;
  if (!attachment) return null;
  const isImage = attachment.type.startsWith("image/");
  const isAudio = attachment.type.startsWith("audio/");
  return (
    <span className="coach-user-attachment">
      {isImage && previewUrl ? (
        <img src={previewUrl} alt={attachment.name} className="coach-user-attachment-img" />
      ) : isAudio && previewUrl ? (
        <audio
          controls
          preload="metadata"
          src={previewUrl}
          aria-label={`Preview ${attachment.name}`}
        />
      ) : (
        <span className="coach-user-attachment-file">
          <FileText className="coach-user-attachment-icon" aria-hidden="true" />
          <span>
            <strong>{attachment.name}</strong>
            <small>{formatBytes(attachment.size)}</small>
          </span>
        </span>
      )}
    </span>
  );
}

export function UserMessage({
  message,
  previewUrl,
  fresh,
}: {
  message: CoachMessage;
  previewUrl?: string | undefined;
  fresh?: boolean;
}) {
  const text = message.text ?? message.paragraphs.join("\n");
  const time = messageTime(message.time, "now");
  return (
    <motion.div
      className="coach-msg coach-msg-user"
      initial={fresh ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="coach-user-stack">
        <div className="coach-user-bubble">
          {text ? <p>{text}</p> : null}
          <AttachmentInline message={message} previewUrl={previewUrl} />
        </div>
        {time ? (
          <time className="coach-msg-time coach-user-time" dateTime={message.time}>
            {time}
          </time>
        ) : null}
      </div>
    </motion.div>
  );
}
