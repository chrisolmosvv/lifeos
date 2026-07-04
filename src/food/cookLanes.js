// LifeOS — Food → cook lanes (Piece 4, PURE, compute-on-read). Assigns each step to a parallel
// LANE based on its dependency graph. Steps with no deps start their own lane; a step with one dep
// inherits that dep's lane; a step with multiple deps (convergence) is a MERGE that spans all lanes.
// Lanes sorted by earliest start so the critical path sits left. No schema, no stored lanes.
//
// assignLanes(steps) → { lanes: number[], laneCount: number, mergeSteps: Set<number> }
//   steps: [{ depends_on?: number[]|null }]  — the raw loaded recipe steps (by position)

export function assignLanes(steps) {
  const list = steps || [];
  const lanes = new Array(list.length).fill(-1);
  const mergeSteps = new Set();
  let nextLane = 0;

  // Pass 1: assign lanes by walking the dep graph
  for (let i = 0; i < list.length; i++) {
    const deps = Array.isArray(list[i]?.depends_on) ? list[i].depends_on.filter((d) => d >= 0 && d < list.length) : [];
    if (deps.length === 0) {
      // No deps → starts a new lane
      lanes[i] = nextLane++;
    } else if (deps.length === 1) {
      // One dep → inherit that predecessor's lane
      lanes[i] = lanes[deps[0]] >= 0 ? lanes[deps[0]] : nextLane++;
    } else {
      // Multiple deps → convergence / merge step (full-width)
      mergeSteps.add(i);
      lanes[i] = lanes[deps[0]] >= 0 ? lanes[deps[0]] : nextLane++;
    }
  }

  const laneCount = Math.max(nextLane, 1);
  return { lanes, laneCount, mergeSteps };
}
