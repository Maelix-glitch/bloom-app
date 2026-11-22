/**
 * ChapterMark — a quiet signpost over a group of sections in a long
 * single-column stack (Final Audit F-41/F-42, M-204).
 *
 * One small label and a hairline rule. It changes nothing about the
 * sections it groups — same content, same order — it only tells the
 * reader which chapter of the page they are in. First used on Mood
 * Intelligence (Your patterns / Your rhythm / Your history), then
 * extended to Trackers and Profile by the same finding family.
 */

export function ChapterMark({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`chapter-mark${className ? ` ${className}` : ""}`} aria-hidden="true">
      <span className="chapter-mark__label">{label}</span>
      <span className="chapter-mark__rule" />
    </div>
  );
}
