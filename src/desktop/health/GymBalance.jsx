import { prettyMuscle } from "../../spine/logic/gymFormat";

// LifeOS — Gym V2 (Piece 1): the Body-Part Balance zone. The existing muscleBalance calc's
// FULL ranked list (the old quadrant only showed the top 3), fixed to the trailing 7 days
// ALWAYS — it does NOT page with the time switcher. Each row is a primary-muscle group with
// its share of working sets over the week, drawn as name + a faint proportion bar + percent.
// Pure presentation — the parent computes muscleBalance({ days: 7 }).

export default function GymBalance({ balance }) {
  const ranked = balance?.ranked || [];
  const totalSets = balance?.totalSets || 1;
  return (
    <section className="gym-zone gym-balance-zone">
      <span className="gym-kicker">Body-part balance · last 7 days</span>
      {ranked.length === 0 ? (
        <p className="gym-ph">No training logged in the last 7 days.</p>
      ) : (
        <div className="gym-balance">
          {ranked.map((g) => {
            const pct = Math.round((g.sets / totalSets) * 100);
            return (
              <div className="gym-bal-row" key={g.muscle}>
                <span className="gym-bal-name">{prettyMuscle(g.muscle)}</span>
                <span className="gym-bal-bar" aria-hidden="true">
                  <span className="gym-bal-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="gym-bal-pct">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
