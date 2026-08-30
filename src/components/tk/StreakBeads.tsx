/**
 * StreakBeads — one bead per day, filled where the target was met.
 * The last bead has a ring around it so today is always findable.
 */

export function StreakBeads({
  met,
  label,
}: {
  met: boolean[];
  label: string;
}) {
  return (
    <span className="tk-beads" role="img" aria-label={label}>
      {met.map((on, i) => (
        <i
          key={i}
          data-on={on ? "true" : "false"}
          data-today={i === met.length - 1 ? "true" : "false"}
        />
      ))}
    </span>
  );
}

export default StreakBeads;
