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
 * Anti-document form (brief v3, slice 4): with no live run the two
 * programmes are COMPARISON CARDS side by side (rulebook v2 §7) —
 * name, duration badge, check-listed commitments and one outcome
 * line, never stacked paragraphs. The commitments derive from the
 * definition's own final-week targets (the programme's full ask);
 * the outcome line is the definition's own closing clause. Past
 * runs are compact rows inside a disclosure: name, date, a neutral
 * status badge and the weeks meter, adjacent — a run the person
 * ended is "Ended early", never "Quit" (registry M-72).
 *
 * Copy discipline: structure, never outcomes. A week with no
 * records says "No record" — the same words the engine uses.
 */

import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAssessment } from "@/hooks/useAssessment";
import { useProgrammes } from "@/hooks/useProgrammes";
import { fmtCount, fmtDate } from "@/lib/format";
import {
  PROGRAMMES,
  programmeMatchesGoal,
  targetKindLabel,
  type ProgrammeDefinition,
  type ProgrammeTargetKind,
} from "@/lib/programmes/definitions";
import type { ProgrammeProgress, WeekState } from "@/lib/programmes/programmes";

const WEEK_STATE_LABEL: Record<WeekState, string> = {
  met: "Met",
  missed: "Missed",
  in_progress: "In progress",
  no_record: "No record",
  upcoming: "Upcoming",
};

/**
 * The card's check-listed commitments: the programme's own final
 * week — the full ask it builds to — in the target vocabulary's
 * plain words, capped at three. Priority is the plan first, then
 * the log, then habits, then the weigh-in: the order the programme
 * itself emphasises.
 */
const COMMITMENT_ORDER: readonly ProgrammeTargetKind[] = [
  "plan_days",
  "food_log_days",
  "habit_tick_days",
  "weigh_in_count",
];

function commitmentLine(kind: ProgrammeTargetKind, count: number): string {
  switch (kind) {
    case "plan_days":
      return count >= 7 ? "Follow your plan every day" : `Follow your plan ${count} days a week`;
    case "food_log_days":
      return count >= 7 ? "Log food every day" : `Log food ${count} days a week`;
    case "habit_tick_days":
      return count >= 7 ? "Tick habits every day" : `Tick habits ${count} days a week`;
    case "weigh_in_count":
      return count === 1 ? "Weigh in weekly" : `Weigh in ${count} times a week`;
  }
}

function programmeCommitments(def: ProgrammeDefinition): string[] {
  const finalWeek = def.weeks[def.weeks.length - 1];
  if (!finalWeek) return [];
  const byKind = new Map(finalWeek.targets.map((t) => [t.kind, t.count]));
  return COMMITMENT_ORDER.filter((kind) => byKind.has(kind))
    .slice(0, 3)
    .map((kind) => commitmentLine(kind, byKind.get(kind)!));
}

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
          End programme
        </Button>
      </div>
    </div>
  );
}

/** One past run: name, start date, honest status badge, weeks meter —
 *  all adjacent in one row. A completed run is "Completed"; a run the
 *  person ended is "Ended early". The engine's word for the second
 *  state never reaches the screen. */
function PastRunRow({ progress }: { progress: ProgrammeProgress }) {
  const total = progress.definition.weeks.length;
  const met = progress.summary.weeksMet;
  const pct = total > 0 ? Math.min(100, Math.max(0, (met / total) * 100)) : 0;
  return (
    <li className="past-run">
      <span className="text-foreground">{progress.definition.name}</span>
      <span className="text-muted-foreground">{fmtDate(progress.run.startedOn)}</span>
      {progress.state === "completed" ? (
        <span className="nut-badge">Completed</span>
      ) : (
        <span className="nut-badge">Ended early</span>
      )}
      <span className="past-run__meter">
        <span
          className="nut-track tile-meter"
          role="progressbar"
          aria-label={`${progress.definition.name} weeks met`}
          aria-valuenow={met}
          aria-valuemin={0}
          aria-valuemax={total}
        >
          <span className="nut-track-fill" style={{ width: `${pct}%` }} />
        </span>
        {met} of {total} weeks
      </span>
    </li>
  );
}

export function ProgrammesSection() {
  const { activeProgress, history, enrol, quit } = useProgrammes();
  const { state: assessment } = useAssessment();
  const pastRuns = history.filter((p) => !activeProgress || p.run.id !== activeProgress.run.id);

  return (
    <section className="nut-card nut-rise mt-4" aria-label="Programmes">
      <h2 className="font-display text-[length:var(--text-section)] text-foreground">
        A structure for the weeks ahead
      </h2>
      <p className="mt-1.5 text-[length:var(--text-support)] leading-[var(--leading-body)] text-muted-foreground">
        Pick a structure for the next few weeks.
      </p>

      {activeProgress ? (
        <ActiveProgramme progress={activeProgress} onQuit={() => quit(activeProgress.run.id)} />
      ) : (
        <div className="programmes mt-4">
          {PROGRAMMES.map((programme) => {
            /* Button hierarchy (system slice): equal options are
               secondary — only the programme whose declared goals
               include the person's own stated goal earns the primary
               and the badge. No stated goal, no recommendation. */
            const matched = programmeMatchesGoal(programme, assessment.answers.goal);
            return (
              <article
                key={programme.id}
                className={`programme${matched ? " programme--recommended" : ""}`}
              >
                <div className="programme__head">
                  <h3>{programme.name}</h3>
                  <span className="nut-badge">
                    {programme.weeks.length} weeks
                  </span>
                  {matched ? <Badge variant="gold">Matches your goal</Badge> : null}
                </div>
                <ul className="programme__list">
                  {programmeCommitments(programme).map((line) => (
                    <li key={line}>
                      <Check aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="programme__outcome">{programme.outcome}</p>
                <Button
                  type="button"
                  size="sm"
                  variant={matched ? "default" : "secondary"}
                  className="btn-anchor"
                  onClick={() => enrol(programme.id)}
                >
                  Enrol
                </Button>
              </article>
            );
          })}
        </div>
      )}

      {pastRuns.length > 0 ? (
        <details open className="mt-5">
          <summary className="nut-group-title cursor-pointer">
            Past runs ({fmtCount(pastRuns.length)})
          </summary>
          <ul className="mt-3 space-y-2.5">
            {pastRuns.map((p) => (
              <PastRunRow key={p.run.id} progress={p} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
