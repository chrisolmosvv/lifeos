import { useState } from "react";
import { humanDayLong } from "../../spine/logic/gymDates";
import { smoothedSeries } from "../../spine/logic/bodyComposition";
import { fmtFull } from "../../spine/logic/bodyFormat";
import BodyCompositionChart from "../kit/BodyCompositionChart";
import BodyComposition from "./BodyComposition";
import "../kit/bodyCompositionBlock.css";

// LifeOS — Body V3 (Piece 4): the live Composition block — the page's dominant content.
// TWO hero numbers (weight, body fat: raw latest + a 7-day smoothed average) over the
// Var-2 trend chart, with the fat/lean split bar beneath. The chart's hover-scrub drives
// the heroes: hovering shows that day's real values + the date; leaving reverts to today
// + "7-day avg". The heroes reuse the SAME smoothedSeries getter the chart uses — no
// second smoothing. Split bar is the existing BodyComposition, reused as-is.
//
// terracotta stays RESERVED here: the chart's body-fat line/axis, the today dot and the
// goal zone carry it — the hero numbers are ink (a 44px terracotta number would be a
// repaint, not a rare accent). Body-fat-hero colour is an easy owner tweak if wanted.

// The default (unscrubbed) hero = the latest daily value + its 7-day smoothed average.
function heroFrom(series) {
  const last = series.length ? series[series.length - 1] : null;
  return last ? { raw: last.raw, smoothed: last.smoothed } : null;
}

export default function BodyCompositionBlock({
  weightRows, bodyFatRows, splitComp, weightGoal, today, windowStart, windowEnd,
}) {
  const [scrub, setScrub] = useState(null);

  const wDefault = heroFrom(smoothedSeries(weightRows, { smooth: 7 }));
  const fDefault = heroFrom(smoothedSeries(bodyFatRows, { smooth: 7, withBand: false }));

  const wRaw = scrub ? scrub.weightRaw : wDefault?.raw;
  const wAvg = scrub ? scrub.weightSmoothed : wDefault?.smoothed;
  const fRaw = scrub ? (scrub.bodyFatRaw ?? scrub.bodyFatSmoothed) : fDefault?.raw;
  const fAvg = scrub ? scrub.bodyFatSmoothed : fDefault?.smoothed;

  const cap = (metric, avg) => {
    if (scrub) return humanDayLong(scrub.ymd);
    return Number.isFinite(avg) ? `7-day avg ${fmtFull(metric, avg)}` : "no data yet";
  };

  return (
    <div className="bcb">
      <div className="bcb-heroes">
        <div className="bcb-hero">
          <span className="bcb-hero-num">{Number.isFinite(wRaw) ? fmtFull("weight", wRaw) : "—"}</span>
          <span className="bcb-hero-cap"><b>weight</b> · {cap("weight", wAvg)}</span>
        </div>
        <div className="bcb-hero">
          <span className="bcb-hero-num">{Number.isFinite(fRaw) ? fmtFull("body_fat", fRaw) : "—"}</span>
          <span className="bcb-hero-cap"><b>body fat</b> · {cap("body_fat", fAvg)}</span>
        </div>
      </div>

      <BodyCompositionChart
        weightRows={weightRows} bodyFatRows={bodyFatRows}
        windowStart={windowStart} windowEnd={windowEnd}
        weightGoal={weightGoal} today={today} onScrub={setScrub}
      />

      <div className="bcb-split">
        <span className="bcb-split-label">fat / lean split</span>
        <BodyComposition comp={splitComp} />
      </div>
    </div>
  );
}
