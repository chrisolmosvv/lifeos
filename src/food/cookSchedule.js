// LifeOS — Food → cook schedule (V2 P7, PURE, compute-on-read). Turns steps with durations (+ optional
// dependencies) into per-step start/end offsets. DEP-READY but HONEST: when the steps carry NO
// dependency data — which is ALL we have today, since the import parse emits no parallelism — it
// degrades to a SEQUENTIAL timeline (each step starts when the previous ends), inventing NO overlaps.
// The finish-together critical-path branch is built + ready for when a trustworthy dep source exists.
//
// cookSchedule(steps) → { schedule: [{ index, startOffset, endOffset, duration }], finish } (seconds).
//   steps: [{ index?, durationSeconds|null, deps?: number[] }]  — deps = predecessor step indices that
//          must FINISH before this step starts.

export function cookSchedule(steps) {
  const list = steps || [];
  const dur = list.map((s) => Math.max(0, Number(s?.durationSeconds) || 0));
  const hasDeps = list.some((s) => Array.isArray(s?.deps) && s.deps.length);

  // ── Sequential (the honest default: no parallelism data → no fabricated overlaps) ──
  if (!hasDeps) {
    let t = 0;
    const schedule = list.map((_, i) => { const startOffset = t; t += dur[i]; return { index: i, startOffset, endOffset: t, duration: dur[i] }; });
    return { schedule, finish: t };
  }

  // ── Finish-together (critical-path back-calc): forward pass for earliest ends → the finish; then
  // LATEST starts so short parallel branches are DELAYED to land just in time. Cycle-guarded. ──
  const depsOf = (i) => (Array.isArray(list[i]?.deps) ? list[i].deps.filter((d) => Number.isInteger(d) && d >= 0 && d < list.length && d !== i) : []);
  const eStart = new Array(list.length).fill(0);
  const eEnd = new Array(list.length).fill(null);
  const earliest = (i, seen = new Set()) => {
    if (eEnd[i] != null) return eEnd[i];
    if (seen.has(i)) return 0; // cycle → treat as no predecessor
    seen.add(i);
    const s = Math.max(0, ...depsOf(i).map((d) => earliest(d, new Set(seen))));
    eStart[i] = s; eEnd[i] = s + dur[i];
    return eEnd[i];
  };
  for (let i = 0; i < list.length; i++) earliest(i);
  const finish = list.length ? Math.max(...eEnd) : 0;

  const succ = list.map(() => []);
  for (let i = 0; i < list.length; i++) for (const d of depsOf(i)) succ[d].push(i);
  const lStart = new Array(list.length).fill(null);
  const latest = (i, seen = new Set()) => {
    if (lStart[i] != null) return lStart[i];
    if (seen.has(i)) return eStart[i];
    seen.add(i);
    const lEnd = succ[i].length ? Math.min(...succ[i].map((j) => latest(j, new Set(seen)))) : finish;
    lStart[i] = lEnd - dur[i];
    return lStart[i];
  };
  for (let i = 0; i < list.length; i++) latest(i);

  const schedule = list.map((_, i) => ({ index: i, startOffset: lStart[i], endOffset: lStart[i] + dur[i], duration: dur[i] }));
  return { schedule, finish };
}
