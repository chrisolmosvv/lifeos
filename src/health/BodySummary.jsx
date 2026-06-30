import BodyComposition from "./BodyComposition";
import { JourneyBar } from "./BodyCells";
import { composition, goalProgress } from "./healthBodyRange";

// LifeOS — Body (V2 P2): the two bottom SUMMARY bars, kept across all ranges — they
// summarise as shapes what the table rows give as numbers:
//   • fat / lean split — the composition bar (fat vs lean vs unlabelled remainder; the
//     ratio-mode fallback is preserved when fat+lean overrun scale weight).
//   • weight to goal — the journey bar (anchored at the first-ever reading), tappable.
// Pure presentation; reuses BodyComposition + the JourneyBar cell.
export default function BodySummary({ body, rowsByMetric, goalMap, today, openEditor }) {
  const comp = composition(
    body?.weight?.latestRaw?.value,
    body?.body_fat?.latestRaw?.value,
    body?.lean_mass?.latestRaw?.value,
  );
  return (
    <div className="body-summary">
      <div className="bsum">
        <span className="bsum-label">fat / lean split</span>
        <BodyComposition comp={comp} goals={[]} />
      </div>
      <div className="bsum">
        <span className="bsum-label">weight to goal</span>
        <JourneyBar
          metric="weight"
          goalProg={goalProgress(rowsByMetric.weight, goalMap.get("weight") ?? null, { end: today })}
          onEdit={(el) => openEditor("weight", el)}
          promptText="set a goal weight"
        />
      </div>
    </div>
  );
}
