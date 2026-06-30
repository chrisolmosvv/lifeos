import { useState } from "react";
import { amsClockMinutes, shiftYMD, humanDayShort } from "../gym/gymDates";
import { clockFromMin, hm } from "../health/healthFormat";

// LifeOS — Sleep rhythm: the seven-night CLOCK COLUMNS. An 18-hour vertical window,
// 18:00 (top) → 12:00 next day (bottom), cropping the dead midday hours so each night's
// block is bigger/more readable. Each night is one column; its sleep block sits at its
// TRUE clock position (later bedtime → lower, earlier wake → higher). Stages stack
// within the block. Hover a column → that night's bed · wake · total asleep.
//
// offset = minutes since 18:00; topPct = offset / 1080 (the 18h window). Hour labels
// sit on the RIGHT divider, not over the columns.
const WINDOW_MIN = 18 * 60; // 18h = 1080
const offsetOf = (t) => ((t - 18 * 60) % 1440 + 1440) % 1440;
const topOf = (t) => Math.max(0, Math.min(100, (offsetOf(t) / WINDOW_MIN) * 100));
const GRID = [
  { off: 0, label: "18:00" },
  { off: 360, label: "00:00" },
  { off: 720, label: "06:00" },
  { off: 1080, label: "12:00" },
];
const STAGE_KEYS = [
  ["deep", "deep_minutes"],
  ["core", "core_minutes"],
  ["rem", "rem_minutes"],
  ["awake", "awake_minutes"],
];

export default function SleepClockColumns({ rows, today }) {
  const [active, setActive] = useState(null);
  const slots = [];
  for (let i = 6; i >= 0; i--) {
    const ymd = shiftYMD(today, -i);
    slots.push({ ymd, row: (rows || []).find((r) => r.night_date === ymd) || null });
  }

  const act = active ? slots.find((s) => s.ymd === active)?.row : null;

  return (
    <div className="scc">
      <div className="bw-readout scc-hint">
        {act ? (
          <span>{humanDayShort(active)} · bed {clockFromMin(amsClockMinutes(act.in_bed_at))} · wake {clockFromMin(amsClockMinutes(act.woke_at))} · {hm(act.asleep_minutes)} asleep</span>
        ) : (
          <span className="sleep-muted">hover a night for bed · wake · asleep</span>
        )}
      </div>
      <div className="scc-chart">
        <div className="scc-grid" aria-hidden="true">
          {GRID.map((g, i) => (
            <span className="scc-gridline" key={i} style={{ top: `${(g.off / WINDOW_MIN) * 100}%` }}>
              <em>{g.label}</em>
            </span>
          ))}
        </div>
        <div className="scc-cols">
          {slots.map((s) => {
            const r = s.row;
            const bed = r ? amsClockMinutes(r.in_bed_at) : null;
            const wake = r ? amsClockMinutes(r.woke_at) : null;
            const bedTop = bed != null ? topOf(bed) : null;
            const wakeTop = wake != null ? topOf(wake) : null;
            const hasBlock = bedTop != null && wakeTop != null && wakeTop > bedTop;
            const stageParts = r
              ? STAGE_KEYS.map(([key, col]) => ({ key, min: r[col] })).filter((p) => Number.isFinite(p.min) && p.min > 0)
              : [];
            const stageTotal = stageParts.reduce((a, p) => a + p.min, 0) || 1;
            return (
              <button
                type="button"
                className={`scc-col ${active === s.ymd ? "is-active" : ""}`}
                key={s.ymd}
                disabled={!r}
                onMouseEnter={() => setActive(s.ymd)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(s.ymd)}
                onBlur={() => setActive(null)}
                aria-label={r ? `${humanDayShort(s.ymd)} ${clockFromMin(bed)} to ${clockFromMin(wake)}` : `${humanDayShort(s.ymd)} no data`}
              >
                {hasBlock && (
                  <span className="scc-block" style={{ top: `${bedTop}%`, height: `${wakeTop - bedTop}%` }}>
                    {stageParts.map((p) => (
                      <i key={p.key} className={`hyp-${p.key}`} style={{ height: `${(p.min / stageTotal) * 100}%` }} />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="scc-axis">
        <span>{humanDayShort(slots[0].ymd)}</span>
        <span>{humanDayShort(slots[slots.length - 1].ymd)}</span>
      </div>
    </div>
  );
}
