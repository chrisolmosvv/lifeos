import BodyCompositionChart from "../kit/BodyCompositionChart";
import BodyComposition from "./BodyComposition";
import "../kit/bodyCompositionBlock.css";

// LifeOS — Body V3 (Piece 7 reflow): the main-column Composition block is now the FULL-WIDTH
// trend chart as the hero, with the fat/lean split bar directly beneath it. The hero numbers
// (weight, body fat) + the distance-to-goal text moved OUT to the right column (BodySideColumn);
// the chart's hover is now a self-contained tooltip, no longer driving those numbers.

export default function BodyCompositionBlock({
  weightRows, bodyFatRows, splitComp, weightGoal, today, windowStart, windowEnd,
}) {
  return (
    <div className="bcb">
      <BodyCompositionChart
        weightRows={weightRows} bodyFatRows={bodyFatRows}
        windowStart={windowStart} windowEnd={windowEnd}
        weightGoal={weightGoal} today={today}
      />
      <div className="bcb-split">
        <span className="bcb-split-label">fat / lean split</span>
        <BodyComposition comp={splitComp} />
      </div>
    </div>
  );
}
