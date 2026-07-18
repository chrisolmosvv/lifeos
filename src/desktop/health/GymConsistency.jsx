import { lastNWeeksSessions } from "../../spine/logic/gymCalc";

// LifeOS — Gym V2 (Piece 1): the Consistency zone — PLACEHOLDER fidelity. Just the
// "sessions this week" hero number + a one-line caption. The weekday-by-week grid and the
// streak callout are Piece 2. ALWAYS fixed to this week / the last 13 weeks, regardless of
// the time switcher — it reads the same lastNWeeksSessions calc the old quadrant used, only
// with a 13-week default (was 8) so Piece 2's grid has the right history depth to draw.
//
// buckets[0] = the current rolling-7-day week's session count (oldest week last).

export default function GymConsistency({ built }) {
  const weeks = lastNWeeksSessions(built || [], 13);
  const thisWeek = weeks[0] || 0;
  const caption =
    thisWeek === 0
      ? "no sessions logged yet this week"
      : thisWeek === 1
        ? "session so far this week"
        : "sessions so far this week";

  return (
    <section className="gym-zone gym-consist">
      <span className="gym-kicker">This week</span>
      <div className="gym-consist-hero">
        <b className="gym-consist-num">{thisWeek}</b>
        <span className="gym-consist-cap">{caption}</span>
      </div>
    </section>
  );
}
