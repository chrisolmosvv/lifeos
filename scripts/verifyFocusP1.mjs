// THROWAWAY — Focus module P1 getter verification against real-shaped rows.
// Imports the ACTUAL getters (never reimplements them) and runs them over a JSON
// array of focus_sessions rows (a sample fixture, or rows Chris pastes from the
// Supabase SQL editor). Deleted at P1 close.
//
// Usage: node scripts/verifyFocusP1.mjs [path/to/rows.json] ["<now ISO>"] ["<day YMD>"]
//   defaults: scripts/focus-fixtures/sessions.sample.json, now 2026-07-02T20:00:00Z, day 2026-07-02

import { readFileSync } from "node:fs";
import {
  dayFocusTotal, dayRestTotal, dayCategoryTotals, dayLedger, dayArcs,
  perTaskTotal, taskSessions,
} from "../src/focus/focusCalc.js";
import { weekRingStrip, weekVsTrailingAvg, rangeBars } from "../src/focus/focusTrend.js";
import { formatDuration, formatDurationShort, clockRange, stars, trendLine } from "../src/focus/focusFormat.js";

const path = process.argv[2] || "scripts/focus-fixtures/sessions.sample.json";
const now = new Date(process.argv[3] || "2026-07-02T20:00:00Z").getTime();
const ymd = process.argv[4] || "2026-07-02";
const rows = JSON.parse(readFileSync(path, "utf8"));

const h = (s) => `\n\x1b[1m${s}\x1b[0m`;
console.log(`rows: ${rows.length}   day: ${ymd}   now: ${new Date(now).toISOString()}`);

console.log(h("day focus / rest total"));
console.log(`  focus = ${formatDuration(dayFocusTotal(rows, ymd))}  (${dayFocusTotal(rows, ymd)}s)`);
console.log(`  rest  = ${formatDuration(dayRestTotal(rows, ymd))}  (${dayRestTotal(rows, ymd)}s)`);

console.log(h("day category totals"));
for (const [cat, b] of dayCategoryTotals(rows, ymd))
  console.log(`  ${String(cat).padEnd(8)} focus ${formatDuration(b.focus).padEnd(7)} rest ${formatDuration(b.rest)}`);

console.log(h("day ledger (newest first)"));
for (const r of dayLedger(rows, ymd))
  console.log(`  ${clockRange(r.startMin, r.endMin).padEnd(15)} ${String(r.categorySnapshot?.name ?? "—").padEnd(11)} ${String(r.taskTitle ?? "—").padEnd(15)} ${formatDuration(r.focusSeconds).padEnd(7)} ${stars(r.rating).padEnd(5)} ${r.note ? "“" + r.note + "”" : ""}`);

console.log(h("day arcs (minutes on the 0..1440 ring)"));
const arcs = dayArcs(rows, ymd);
console.log(`  focus arcs: ${arcs.focus.map((a) => `${a.startMin}-${a.endMin}[${a.categoryId}]`).join("  ")}`);
console.log(`  rest  arcs: ${arcs.rest.map((a) => `${a.startMin}-${a.endMin}[${a.categoryId}]`).join("  ") || "(none)"}`);

const sampleTask = rows.find((r) => r.task_id) || {};
const taskId = sampleTask.task_id;
console.log(h(`per-task (${taskId} = “${sampleTask.task_title_snapshot ?? "—"}”)`));
console.log(`  all-time total = ${formatDuration(perTaskTotal(rows, taskId))}  (short tag: ·${formatDurationShort(perTaskTotal(rows, taskId))})`);
for (const s of taskSessions(rows, taskId))
  console.log(`    ${s.ymd}  ${clockRange(s.startMin, s.endMin).padEnd(15)} ${formatDuration(s.focusSeconds).padEnd(7)} ${stars(s.rating)}`);

console.log(h("week ring-strip (rolling 7 days, oldest→today)"));
for (const d of weekRingStrip(rows, { now }))
  console.log(`  ${d.ymd}  ${formatDuration(d.focusSeconds)}`);

console.log(h("week vs trailing-6-wk avg"));
const t = weekVsTrailingAvg(rows, { now });
console.log(`  raw: ${JSON.stringify(t)}`);
console.log(`  line: ${JSON.stringify(trendLine(t))}`);

console.log(h("range bars — week"));
const rb = rangeBars(rows, { range: "week", now });
console.log(`  period total = ${formatDuration(rb.total)}`);
for (const d of rb.days.filter((x) => x.total > 0))
  console.log(`  ${d.ymd}  ${formatDuration(d.total).padEnd(7)} [${d.segments.map((s) => `${s.categoryId}:${formatDuration(s.focusSeconds)}`).join(", ")}]`);
