/**
 * Transformation Programmes — the Nutrition-page section.
 *
 * Programmes live on the Nutrition page because a programme is an
 * arc over the plan, the food log and the weigh-ins, and all three
 * are resolved on this page already; Today is the habit surface
 * and Profile is the record/settings surface. The section shows:
 * the two programme cards (Enrol) when no run is live; for the
 * live run, the current week, its focus, this week's targets with
 * their real counted states, and the week-by-week strip; and the
 * person's past runs underneath, exactly as they ended.
 *
 * Copy discipline: structure, never outcomes. A week with no
 * records says "No record" — the same words the engine uses.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAssessment } from "@/hooks/useAssessment";
import { useProgrammes } from "@/hooks/useProgrammes";
import { fmtDate } from "@/lib/format";
import {
  PROGRAMMES,
  programmeMatchesGoal,
  targetKindLabel,
} from "@/lib/programmes/definitions";
import type { ProgrammeProgress, WeekState } from "@/lib/programmes/programmes";

const WEEK_STATE_LABEL: Record<WeekState, string> = {
  met: "Met",
  missed: "Missed",
  in_progress: "In progress",
  no_record: "No record",
  upcoming: "Upcoming",
};

function ActiveProgramme({ progress, onQuit }: { progress: ProgrammeProgress; onQuit: () => void }) {
  const current =
    progress.currentWeek !== null ? progress.weeks[progress.currentWeek - 1] : undefined;
  return (
    <div className="mt-3">
      <h3 className="text-[length:var(--text-section)] font-semibold text-foreground">
        {progress.definition.name}
        {progress.currentWeek !== null
          ? ` — Week ${progress.currentWeek} of ${progress.definition.weeks.length}`
          : ""}
      </h3>
      {current ? (
        <>
          <p className="mt-1 text-[length:var(--text-support)] leading-[var(--leading-body)] text-foreground">
            {current.focus}
          </p>
          <ul className="mt-3 space-y-2">
            {current.targets.map((tp) => (
              <li
                key={tp.target.kind}
                className="flex flex-wrap items-baseline justify-between gap-2"
              >
                <span className="text-[length:var(--text-support)] text-foreground">
                  {targetKindLabel(tp.target.kind)}
                </span>
                <span className="text-[length:var(--text-support)] text-muted-foreground">
                  {tp.actual} of {tp.target.count} — {WEEK_STATE_LABEL[tp.state]}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5" role="list" aria-label="Week by week">
        {progress.weeks.map((week) => (
          <span key={week.index} role="listitem" className="nut-chip" title={week.focus}>
            W{week.index + 1} · {WEEK_STATE_LABEL[week.state]}
          </span>
        ))}
      </div>

      <p className="mt-3 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        So far: {progress.summary.weeksMet} week{progress.summary.weeksMet === 1 ? "" : "s"} met
        {progress.summary.weeksMissed > 0
          ? `, ${progress.summary.weeksMissed} missed`
          : ""}
        {progress.summary.weeksNoRecord > 0
          ? `, ${progress.summary.weeksNoRecord} with no record`
          : ""}
        . Progress is counted from your own log — nothing here is estimated.
      </p>

      <div className="mt-3">
        <Button type="button" variant="secondary" size="sm" onClick={onQuit}>
          Quit programme
        </Button>
      </div>
    </div>
  );
}

export function ProgrammesSection() {
  const { activeProgress, history, enrol, quit } = useProgrammes();
  const { state: assessment } = useAssessment();
  const pastRuns = history.filter((p) => !activeProgress || p.run.id !== activeProgress.run.id);

  return (
    <section className="nut-card nut-rise mt-4" aria-label="Programmes">
      <p className="eyebrow">Programmes</p>
      <h2 className="font-display text-[length:var(--text-section)] text-foreground">
        A structure for the weeks ahead
      </h2>

      {activeProgress ? (
        <ActiveProgramme progress={activeProgress} onQuit={() => quit(activeProgress.run.id)} />
      ) : (
        <div className="mt-3 space-y-4">
          {PROGRAMMES.map((programme) => {
            /* Button hierarchy (system slice): equal options are
               secondary — only the programme whose declared goals
               include the person's own stated goal earns the primary
               and the badge. No stated goal, no recommendation. */
            const matched = programmeMatchesGoal(programme, assessment.answers.goal);
            return (
              <div key={programme.id}>
                <h3 className="flex flex-wrap items-center gap-2 text-[length:var(--text-section)] font-semibold text-foreground">
                  {programme.name} · {programme.weeks.length} weeks
                  {matched ? <Badge variant="gold">Matches your goal</Badge> : null}
                </h3>
                <p className="mt-1 max-w-[var(--measure)] text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
                  {programme.blurb}
                </p>
                <div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={matched ? "default" : "secondary"}
                    onClick={() => enrol(programme.id)}
                  >
                    Enrol
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pastRuns.length > 0 ? (
        <div className="mt-5 border-t border-border-subtle pt-3">
          <h3 className="nut-group-title">Past runs</h3>
          <ul className="mt-2 space-y-1.5">
            {pastRuns.map((p) => (
              <li
                key={p.run.id}
                className="flex flex-wrap items-baseline justify-between gap-2 text-[length:var(--text-support)]"
              >
                <span className="text-foreground">{p.definition.name}</span>
                <span className="text-muted-foreground">
                  {fmtDate(p.run.startedOn)} · {p.state === "quit" ? "Quit" : "Completed"} ·{" "}
                  {p.summary.weeksMet} of {p.definition.weeks.length} weeks met
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
