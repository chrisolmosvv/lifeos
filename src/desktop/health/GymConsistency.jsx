import { consistencyGrid } from "../../spine/logic/gymConsistency";

// LifeOS — Gym V2 (Piece 2): the Consistency hero — REAL fidelity (replaces Piece 1's
// number-only placeholder). A weekday-by-week timeline grid (7 rows Mon→Sun × 13 columns,
// oldest left, current week right) — a filled terracotta cell = a session that weekday that
// week; a white dot on it = a PR was set. Beside it: the hero "sessions this week" number,
// the 13-week average caption, and a streak badge. ALWAYS fixed to this week / the trailing
// 13 weeks — it does NOT page with the time switcher. The calc (gymConsistency) owns the
// maths incl. the self-referential streak definition; this only DISPLAYS it.

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]; // Mon→Sun row labels

export default function GymConsistency({ built }) {
  const g = consistencyGrid(built || [], { weeks: 13 });
  const avg = g.average.toFixed(1);
  const cap = g.thisWeek === 1 ? "session this week" : "sessions this week";

  return (
    <section className="gym-zone gym-consist">
      <span className="gym-kicker">Consistency · last 13 weeks</span>
      <div className="gym-consist-body">
        <div className="gym-grid-cal" role="img" aria-label={`Training grid, ${g.streak}-week streak`}>
          {WEEKDAYS.map((d, row) => (
            <div className="gym-grid-row" key={row}>
              <span className="gym-grid-daylabel">{d}</span>
              {g.weeks.map((w, col) => {
                const cell = w.cells[row];
                const cls = cell.trained ? "gym-cell gym-cell--on" : "gym-cell";
                return (
                  <span className={cls} key={col}>
                    {cell.isPR ? <span className="gym-cell-pr" /> : null}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        <div className="gym-consist-hero">
          <b className="gym-consist-num">{g.thisWeek}</b>
          <span className="gym-consist-cap">{cap}</span>
          <span className="gym-consist-avg">avg {avg}/week · 13 weeks</span>
          {g.streak > 0 && (
            <span className="gym-streak">{g.streak}-week streak</span>
          )}
        </div>
      </div>
    </section>
  );
}
