/**
 * Sleep & Recovery — the recovery read on the Trackers page, where the
 * sleep record itself lives. Everything shown is computed on read from
 * the logged nights by the pure core (src/lib/recovery/recovery.ts):
 * debt, the banded recovery state, and the week-on-week trend, each
 * with its basis attached. The Assessment is read, never written —
 * its sleep answers only supply the baseline a night is measured
 * against, when the person gave them.
 */

import { useMemo } from "react";

import { SectionHead } from "@/components/ui/SectionHead";
import { useAssessment } from "@/hooks/useAssessment";
import { buildRecoverySnapshot, recoveryLines } from "@/lib/recovery/recovery";
import type { DayEntry } from "@/lib/trackers/core";

export function SleepRecoverySection({
  days,
  today,
}: {
  days: readonly DayEntry[];
  today: string;
}) {
  const { state } = useAssessment();
  const snapshot = useMemo(
    () => buildRecoverySnapshot(days, today, state.answers),
    [days, today, state.answers],
  );

  const lines = recoveryLines(snapshot);
  /* A thin record gets ONE honest line (M-134): the inputs line, which
     carries the count and what a read needs. The fuller line list is
     built for a record that can be read — on a thin one its debt line
     ("…there is no sleep debt to read") and the inputs line ("…there
     is nothing to read yet") said the same thing twice, and a debt
     figure drawn from one or two nights is a read the band itself
     refuses to make. */
  const shown =
    snapshot.recovery.band === "not-enough-data" ? [snapshot.recovery.inputsLine] : lines;

  return (
    <section className="at-section" aria-label="Sleep and recovery">
      <SectionHead variant="atlas" title="Sleep · recovery" />
      <p className="at-statement">{snapshot.recovery.label}</p>
      <ul className="at-finelist">
        {shown.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      <p className="at-fine">
        Read only from the nights you logged — duration and the quality rating you gave them.
        Bloom doesn't record heart rate or sleep stages, so nothing like that is estimated here.
      </p>
    </section>
  );
}

export default SleepRecoverySection;
