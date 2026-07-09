import HubCard from "../kit/HubCard";
import { ageLabel, whole } from "../../spine/logic/healthFormat";

// Gym card. Headline = THIS WEEK's training volume (the same box-score volume the
// Gym front page leads with), with sessions as the quiet secondary. Label = time
// since the last workout; support line = the last session summary ("2 days ago ·
// 22 min"). No set count — the gym layer doesn't expose one (Option A). Opens the
// existing Gym front page unchanged.
export default function HubGymCard({ gym, now, onClick }) {
  const age = gym.lastWorkoutAt ? ageLabel(gym.lastWorkoutAt, now) : null;
  const hasVolume = Number.isFinite(gym.volume) && gym.volume > 0;
  const sessions = gym.sessions || 0;
  const mins = Number.isFinite(gym.lastMinutes) ? `${Math.round(gym.lastMinutes)} min` : null;

  const headline = hasVolume ? (
    <span className="hub-pair-val">{whole(gym.volume)}<span className="hub-unit">kg</span></span>
  ) : "—";

  return (
    <HubCard label={age || "no sessions"} headline={headline} onClick={onClick}>
      <div className="hub-support">
        {sessions} session{sessions === 1 ? "" : "s"} this week
      </div>
      {age && mins && <div className="hub-support hub-support--quiet">{age} · {mins}</div>}
    </HubCard>
  );
}
