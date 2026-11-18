/**
 * Food Capture — the analysis adapter (SYSTEM 7).
 *
 * This is a thin wrapper over the ONE vision pipeline Bloom already
 * has — the Coach's. Nothing here re-implements, forks or reroutes it:
 *
 *   · the photo is prepared by `fileToPhotoMedia` (coach/media), the
 *     same downscale-to-JPEG step the Coach composer uses;
 *   · it is sent through `askEdge` (coach/edge), the same edge-function
 *     invocation, carrying the image exactly the way a Coach photo
 *     message carries it — so the function's own photo contract (dish
 *     first, then the ≈ estimate line, PR #113) produces the reply;
 *   · the estimate is extracted by `coachPhotoEstimate`
 *     (nutrition/coachLog), the same strict detector the "Log this"
 *     handoff uses: a recorded identification plus a clean ≈ line, or
 *     there is no estimate.
 *
 * What capture deliberately does NOT send: a chat history (there is no
 * conversation — history is empty) and a personal record. The facts
 * are the empty record a brand-new account would send — today's date
 * and nothing claimed — because identifying a dish needs no one's
 * diary, and inventing record values to fill the shape would be worse
 * than sending none.
 *
 * Failure is data, never a thrown error and never a substitute answer:
 * every failure comes back as a reason the session machine can hold,
 * including the Money System's billing refusals, which arrive through
 * the edge client unchanged.
 */

import { askEdge } from "@/lib/coach/edge";
import { fileToPhotoMedia } from "@/lib/coach/media";
import { detectTopics } from "@/lib/coach/topics";
import { todayLocal } from "@/lib/localDay";
import { coachPhotoEstimate, type CoachPhotoEstimate } from "@/lib/nutrition/coachLog";

import type { CaptureFailureReason } from "./session";

/** The one question a capture asks. Worded so the topic classifier
 *  reads it as food, and so the function's photo rule answers with the
 *  identification first and the estimate line second. */
export const CAPTURE_MESSAGE =
  "What food is this? Please name the dish and estimate the portion in the photo.";

export type CaptureAnalysis =
  | { ok: true; estimate: CoachPhotoEstimate }
  | { ok: false; reason: CaptureFailureReason; detail?: string };

/**
 * The identification a reply records for its photo: the reply's first
 * paragraph, whitespace-collapsed and capped — the identical rule the
 * Coach thread applies in `photoNoteFromReply` (hooks/useCoachSystem).
 * It is re-derived here rather than imported because lib modules never
 * import the hooks layer at runtime (only types cross that line);
 * `coachPhotoEstimate` — the strict half of the pipeline — is imported
 * and reused exactly.
 */
function photoNoteFromParagraphs(paragraphs: readonly string[]): string | undefined {
  const first = paragraphs.map((p) => p.replace(/\s+/g, " ").trim()).find((p) => p.length > 0);
  if (!first) return undefined;
  return first.length > 300 ? `${first.slice(0, 299).trimEnd()}…` : first;
}

/**
 * Analyse one photo file into a loggable estimate proposal.
 *
 * Resolves for every outcome — a file that cannot be decoded, an
 * unreachable or refusing function, a reply with no usable estimate —
 * because the session machine, not an exception, owns failure.
 * `signal` lets the sheet abandon an in-flight analysis when it closes.
 */
export async function analyseCapturePhoto(
  file: File,
  signal?: AbortSignal,
): Promise<CaptureAnalysis> {
  const media = await fileToPhotoMedia(file).catch(() => null);
  if (!media) return { ok: false, reason: "unreadable_photo" };

  const result = await askEdge(
    {
      message: CAPTURE_MESSAGE,
      history: [],
      facts: {
        today: todayLocal(),
        trackers: [],
        cycle: null,
        habitsActive: 0,
        memories: [],
      },
      image: media,
      register: "normal",
      topic: detectTopics(CAPTURE_MESSAGE).primary,
    },
    signal,
  );

  if (!result.ok) {
    return result.detail
      ? { ok: false, reason: result.reason, detail: result.detail }
      : { ok: false, reason: result.reason };
  }

  const estimate = coachPhotoEstimate(
    result.paragraphs,
    photoNoteFromParagraphs(result.paragraphs),
  );
  if (!estimate) return { ok: false, reason: "no_estimate" };
  return { ok: true, estimate };
}
