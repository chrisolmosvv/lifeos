// LifeOS — Food → cook schedule (3c-ii, PURE, compute-on-read). Dependency scheduling PLUS a
// one-pair-of-hands resource pass. Order of operations:
//   1. Sequential fallback when there are NO dependencies (pre-2a recipes: untagged → all
//      hands-busy → already strictly sequential, so the two models agree, they don't fight).
//   2. Dependency CPM (forward earliest + backward latest, cycle-guarded) → float for priority.
//   3. ONE PAIR OF HANDS: hands_on / active_heat / untagged steps occupy the single cook; hands_free
//      steps do not. Order the busy steps least-float-first (protect the critical path) in a
//      dependency-consistent topological order, then CHAIN them (one busy thing at a time).
//   4. Re-run the CPM on the AUGMENTED graph (deps ∪ resource chain) so float, latest-start
//      deadlines and the span are all resource-aware — a deadline on the unconstrained schedule
//      would be a lie.
//
// cookSchedule(steps) → { schedule: [{ index, duration, earliestStart, earliestEnd, latestStart,
//   latestEnd, effectiveStart, float, critical, startOffset, endOffset }], finish, workSeconds }.
//   steps: [{ durationSeconds|null, deps?: number[], hold?: string, tag?: string }]  (seconds)
//   • finish = the resource-aware SPAN. • workSeconds = SUM of durations.

const isBusy = (tag) => tag !== "hands_free"; // untagged / hands_on / active_heat all occupy the hands

function build(list, dur, es, ee, ls) {
  return list.map((s, i) => {
    const earliestStart = es[i], earliestEnd = ee[i], latestStart = ls[i];
    const float = Math.max(0, latestStart - earliestStart);
    const effectiveStart = s?.hold === "indefinite" ? earliestStart : latestStart;
    return {
      index: i, duration: dur[i],
      earliestStart, earliestEnd, latestStart, latestEnd: latestStart + dur[i],
      effectiveStart, float, critical: float === 0,
      startOffset: effectiveStart, endOffset: effectiveStart + dur[i], // back-compat aliases
    };
  });
}

// Forward + backward CPM over a precedence function. Cycle-guarded (a revisit returns a safe
// fallback), so it always terminates. Returns earliest/latest starts, ends and the finish (span).
function cpm(n, dur, depsOf) {
  const eStart = new Array(n).fill(0), eEnd = new Array(n).fill(null);
  const earliest = (i, seen = new Set()) => {
    if (eEnd[i] != null) return eEnd[i];
    if (seen.has(i)) return 0;
    seen.add(i);
    const s = Math.max(0, ...depsOf(i).map((d) => earliest(d, new Set(seen))));
    eStart[i] = s; eEnd[i] = s + dur[i];
    return eEnd[i];
  };
  for (let i = 0; i < n; i++) earliest(i);
  const finish = n ? Math.max(...eEnd) : 0;
  const succ = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) for (const d of depsOf(i)) succ[d].push(i);
  const lStart = new Array(n).fill(null);
  const latest = (i, seen = new Set()) => {
    if (lStart[i] != null) return lStart[i];
    if (seen.has(i)) return eStart[i];
    seen.add(i);
    const lEnd = succ[i].length ? Math.min(...succ[i].map((j) => latest(j, new Set(seen)))) : finish;
    lStart[i] = lEnd - dur[i];
    return lStart[i];
  };
  for (let i = 0; i < n; i++) latest(i);
  return { eStart, eEnd, lStart, finish };
}

// GAP-FILLING serial schedule: place each step at the earliest feasible time (all deps finished;
// busy steps on the single hands-resource, FILLING idle gaps — so discretionary hands-work slots
// into a long free braise instead of queueing after it). Priority among ready steps: least float
// (protect the critical path), then earliest start, then index. A cycle falls through to the lowest
// unplaced step, so it always progresses and terminates. Returns the busy steps in the order they
// occupy the hands (by placed start), which becomes the resource precedence chain.
function handsSequence(n, dur, depsOf, floatOf, eStartOf, busy) {
  const start = new Array(n).fill(null), end = new Array(n).fill(null);
  const occ = []; // occupied hands intervals [s,e]
  const better = (a, b) => (floatOf[a] - floatOf[b]) || (eStartOf[a] - eStartOf[b]) || (a - b);
  const slot = (ready, d) => { // earliest t >= ready with [t,t+d) clear of every occupied interval
    let t = ready, changed = true;
    while (changed) { changed = false; for (const [s, e] of occ) if (s < t + d && e > t) { t = e; changed = true; } }
    return t;
  };
  for (let k = 0; k < n; k++) {
    let pick = -1;
    for (let i = 0; i < n; i++) {
      if (start[i] != null || !depsOf(i).every((d) => start[d] != null)) continue;
      if (pick < 0 || better(i, pick) < 0) pick = i;
    }
    if (pick < 0) for (let i = 0; i < n; i++) if (start[i] == null) { pick = i; break; } // cycle → progress
    const ready = Math.max(0, ...depsOf(pick).map((d) => end[d] ?? 0));
    const st = busy[pick] ? slot(ready, dur[pick]) : ready;
    start[pick] = st; end[pick] = st + dur[pick];
    if (busy[pick]) occ.push([st, end[pick]]);
  }
  return [...Array(n).keys()].filter((i) => busy[i]).sort((a, b) => (start[a] - start[b]) || (a - b));
}

export function cookSchedule(steps) {
  const list = steps || [];
  const n = list.length;
  const dur = list.map((s) => Math.max(0, Number(s?.durationSeconds) || 0));
  const workSeconds = dur.reduce((a, b) => a + b, 0);
  const hasDeps = list.some((s) => Array.isArray(s?.deps) && s.deps.length);
  const origDepsOf = (i) => (Array.isArray(list[i]?.deps) ? list[i].deps.filter((d) => Number.isInteger(d) && d >= 0 && d < n && d !== i) : []);

  // 1) No signal at all (no deps AND no hands_free tag) → sequential by position. Such recipes (the
  //    pre-2a ones) are all hands-busy, so one pair of hands already makes them sequential — the two
  //    models agree, and we keep the source order rather than reshuffling by duration.
  if (!hasDeps && !list.some((s) => s?.tag === "hands_free")) {
    const es = [], ee = []; let t = 0;
    for (let i = 0; i < n; i++) { es[i] = t; t += dur[i]; ee[i] = t; }
    return { schedule: build(list, dur, es, ee, es.slice()), finish: t, workSeconds };
  }

  // 2) Dependency-only CPM → float for the resource priority.
  const dep = cpm(n, dur, origDepsOf);
  const depFloat = dep.lStart.map((ls, i) => Math.max(0, ls - dep.eStart[i]));

  // 3) One pair of hands: gap-fill the busy steps (least-float priority); free steps stay off the
  //    resource. The order they occupy the hands becomes a precedence chain.
  const busy = list.map((s) => isBusy(s?.tag));
  const seq = handsSequence(n, dur, origDepsOf, depFloat, dep.eStart, busy);
  const resEdge = new Array(n).fill(-1); // resEdge[b] = the busy step that must finish before b starts
  for (let k = 1; k < seq.length; k++) resEdge[seq[k]] = seq[k - 1];
  const augDepsOf = (i) => (resEdge[i] >= 0 ? [...origDepsOf(i), resEdge[i]] : origDepsOf(i));

  // 4) Recompute everything on the resource-constrained graph.
  const res = cpm(n, dur, augDepsOf);
  return { schedule: build(list, dur, res.eStart, res.eEnd, res.lStart), finish: res.finish, workSeconds };
}
