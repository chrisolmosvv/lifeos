// LifeOS — Food → cook schedule (V2 P7 + 3c-i, PURE, compute-on-read). Turns steps with durations
// (+ optional dependencies + hold_tolerance) into per-step timing. DEP-READY but HONEST: with NO
// dependency data it degrades to a SEQUENTIAL timeline (each step after the last), inventing no
// overlaps. With deps it runs a forward pass (earliest start/end) and a backward pass (latest start
// so short branches land just-in-time), and now SURFACES both plus float — 3c-i stopped discarding
// the forward pass. Nothing here models resource contention yet (one pair of hands = 3c-ii).
//
// cookSchedule(steps) → { schedule: [{ index, duration, earliestStart, earliestEnd, latestStart,
//   latestEnd, effectiveStart, float, critical, startOffset, endOffset }], finish, workSeconds }.
//   steps: [{ index?, durationSeconds|null, deps?: number[], hold?: string }]  (offsets in seconds)
//   • finish = the scheduled SPAN (critical-path length) — "how long the cook runs".
//   • workSeconds = the SUM of all durations — "total work". They differ when steps overlap.
//   • effectiveStart = where we PLAN to start it: 'indefinite' hold → earliest (may sit early);
//     everything else ('immediate' / 'short' / null) → latest (just-in-time). startOffset aliases
//     effectiveStart for older callers (bandRows, RecipeOverview).

function build(list, dur, es, ee, ls) {
  return list.map((s, i) => {
    const earliestStart = es[i], earliestEnd = ee[i], latestStart = ls[i];
    const float = Math.max(0, latestStart - earliestStart); // never negative
    const effectiveStart = s?.hold === "indefinite" ? earliestStart : latestStart;
    return {
      index: i, duration: dur[i],
      earliestStart, earliestEnd, latestStart, latestEnd: latestStart + dur[i],
      effectiveStart, float, critical: float === 0,
      startOffset: effectiveStart, endOffset: effectiveStart + dur[i], // back-compat aliases
    };
  });
}

export function cookSchedule(steps) {
  const list = steps || [];
  const dur = list.map((s) => Math.max(0, Number(s?.durationSeconds) || 0));
  const workSeconds = dur.reduce((a, b) => a + b, 0);
  const hasDeps = list.some((s) => Array.isArray(s?.deps) && s.deps.length);

  // ── Sequential (no dependency data → no fabricated overlaps; every step on the critical path) ──
  if (!hasDeps) {
    const es = [], ee = [];
    let t = 0;
    for (let i = 0; i < list.length; i++) { es[i] = t; t += dur[i]; ee[i] = t; }
    // latest == earliest (no slack) → float 0 everywhere.
    return { schedule: build(list, dur, es, ee, es.slice()), finish: t, workSeconds };
  }

  // ── Dependency-aware: forward pass (earliest) then backward pass (latest), both cycle-guarded ──
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
    if (seen.has(i)) return eStart[i]; // cycle → fall back to earliest
    seen.add(i);
    const lEnd = succ[i].length ? Math.min(...succ[i].map((j) => latest(j, new Set(seen)))) : finish;
    lStart[i] = lEnd - dur[i];
    return lStart[i];
  };
  for (let i = 0; i < list.length; i++) latest(i);

  return { schedule: build(list, dur, eStart, eEnd, lStart), finish, workSeconds };
}
