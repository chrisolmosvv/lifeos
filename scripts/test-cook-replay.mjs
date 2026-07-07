// Verification script for cookReplay.replayCookEvents — run with: node scripts/test-cook-replay.mjs
import { replayCookEvents } from "../src/food/cookReplay.js";

let passed = 0;
let failed = 0;

function assert(label, condition, detail) {
  if (condition) { console.log(`  ✓ ${label}`); passed++; }
  else { console.log(`  ✗ ${label} — ${detail}`); failed++; }
}

function ev(type, ref, payload, offsetMs) {
  return { event_type: type, target_ref: ref, payload, created_at: new Date(BASE + offsetMs).toISOString() };
}

const BASE = Date.parse("2026-07-05T10:00:00Z");

// ── TEST 1: EMPTY ──────────────────────────────────────────────────────────
console.log("\n1. EMPTY — no events");
{
  const s = replayCookEvents([], BASE + 60000);
  assert("stepStates is empty", Object.keys(s.stepStates).length === 0, JSON.stringify(s.stepStates));
  assert("tickedIngredients is empty", s.tickedIngredients.size === 0, `size=${s.tickedIngredients.size}`);
  assert("no timers", s.timers.length === 0, `timers=${s.timers.length}`);
  assert("finished is false", s.finished === false, `finished=${s.finished}`);
}

// ── TEST 2: LAST-WRITE-WINS on a step ──────────────────────────────────────
console.log("\n2. LAST-WRITE-WINS — step 0 marked active then done");
{
  const events = [
    ev("step_marked", "0", { status: "active" }, 0),
    ev("step_marked", "0", { status: "done" }, 5000),
  ];
  const s = replayCookEvents(events, BASE + 10000);
  assert("step 0 is 'done'", s.stepStates["0"] === "done", `got '${s.stepStates["0"]}'`);
}

// ── TEST 3: INGREDIENT TOGGLE ──────────────────────────────────────────────
console.log("\n3. INGREDIENT TOGGLE — 'x' ticked 3 times → ticked (odd = in)");
{
  const events = [
    ev("ingredient_ticked", "x", null, 0),
    ev("ingredient_ticked", "x", null, 1000),
    ev("ingredient_ticked", "x", null, 2000),
  ];
  const s = replayCookEvents(events, BASE + 5000);
  assert("'x' is ticked", s.tickedIngredients.has("x"), `has='${s.tickedIngredients.has("x")}'`);
}

// ── TEST 3b: INGREDIENT TOGGLE even number → unticked ──────────────────────
console.log("   3b. 'y' ticked 2 times → unticked (even = out)");
{
  const events = [
    ev("ingredient_ticked", "y", null, 0),
    ev("ingredient_ticked", "y", null, 1000),
  ];
  const s = replayCookEvents(events, BASE + 5000);
  assert("'y' is NOT ticked", !s.tickedIngredients.has("y"), `has='${s.tickedIngredients.has("y")}'`);
}

// ── TEST 4: RUNNING TIMER math ─────────────────────────────────────────────
console.log("\n4. RUNNING TIMER — 600s timer, 120s elapsed → 480s remaining");
{
  const events = [
    ev("timer_started", "2", { duration_seconds: 600 }, 0),
  ];
  const now = BASE + 120000; // 120 seconds later
  const s = replayCookEvents(events, now);
  assert("1 timer running", s.timers.length === 1, `count=${s.timers.length}`);
  assert("remaining is 480", s.timers[0].remaining === 480, `remaining=${s.timers[0]?.remaining}`);
  assert("not done", s.timers[0].done === false, `done=${s.timers[0]?.done}`);
}

// ── TEST 5: TIMER PAST ZERO ───────────────────────────────────────────────
console.log("\n5. TIMER PAST ZERO — 60s timer, 90s elapsed → remaining=0, done=true");
{
  const events = [
    ev("timer_started", "1", { duration_seconds: 60 }, 0),
  ];
  const now = BASE + 90000; // 90 seconds later
  const s = replayCookEvents(events, now);
  assert("remaining is 0 (clamped)", s.timers[0].remaining === 0, `remaining=${s.timers[0]?.remaining}`);
  assert("done is true", s.timers[0].done === true, `done=${s.timers[0]?.done}`);
}

// ── TEST 6: TIMER STOPPED ─────────────────────────────────────────────────
console.log("\n6. TIMER STOPPED — started then stopped → no running timer");
{
  const events = [
    ev("timer_started", "2", { duration_seconds: 600 }, 0),
    ev("timer_stopped", "2", null, 30000),
  ];
  const s = replayCookEvents(events, BASE + 60000);
  assert("no timers running", s.timers.length === 0, `count=${s.timers.length}`);
}

// ── TEST 7: TWO TIMERS AT ONCE ────────────────────────────────────────────
console.log("\n7. TWO TIMERS — steps 1 and 3, independent remaining");
{
  const events = [
    ev("timer_started", "1", { duration_seconds: 300 }, 0),      // 5min, started at t=0
    ev("timer_started", "3", { duration_seconds: 600 }, 60000),  // 10min, started at t=60s
  ];
  const now = BASE + 120000; // 120s after base
  const s = replayCookEvents(events, now);
  assert("2 timers running", s.timers.length === 2, `count=${s.timers.length}`);
  const t1 = s.timers.find(t => t.targetRef === "1");
  const t3 = s.timers.find(t => t.targetRef === "3");
  assert("step 1: 120s elapsed of 300 → 180s left", t1.remaining === 180, `remaining=${t1?.remaining}`);
  assert("step 3: 60s elapsed of 600 → 540s left", t3.remaining === 540, `remaining=${t3?.remaining}`);
}

// ── TEST 8: FINISHED ──────────────────────────────────────────────────────
console.log("\n8. FINISHED — finished event → finished=true");
{
  const events = [
    ev("step_marked", "0", { status: "done" }, 0),
    ev("finished", null, null, 10000),
  ];
  const s = replayCookEvents(events, BASE + 20000);
  assert("finished is true", s.finished === true, `finished=${s.finished}`);
}

// ── TEST 9: RESUME EQUIVALENCE ────────────────────────────────────────────
console.log("\n9. RESUME EQUIVALENCE — replay twice → identical; +60s → only timer changes");
{
  const events = [
    ev("step_marked", "0", { status: "done" }, 0),
    ev("step_marked", "1", { status: "active" }, 5000),
    ev("ingredient_ticked", "a", null, 1000),
    ev("ingredient_ticked", "b", null, 2000),
    ev("ingredient_ticked", "b", null, 3000), // untick b
    ev("timer_started", "1", { duration_seconds: 600 }, 10000),
  ];
  const now1 = BASE + 120000; // 120s after base
  const s1 = replayCookEvents(events, now1);
  const s2 = replayCookEvents(events, now1); // same now

  // Deep equality check (compare JSON of stepStates, tickedIngredients as arrays, timers)
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const setToArr = (s) => [...s].sort();

  assert("stepStates identical", eq(s1.stepStates, s2.stepStates),
    `s1=${JSON.stringify(s1.stepStates)} s2=${JSON.stringify(s2.stepStates)}`);
  assert("tickedIngredients identical", eq(setToArr(s1.tickedIngredients), setToArr(s2.tickedIngredients)),
    `s1=${setToArr(s1.tickedIngredients)} s2=${setToArr(s2.tickedIngredients)}`);
  assert("timers identical", eq(s1.timers, s2.timers),
    `s1=${JSON.stringify(s1.timers)} s2=${JSON.stringify(s2.timers)}`);
  assert("finished identical", s1.finished === s2.finished, "");

  // Now +60s: only the timer remaining should change
  const now2 = now1 + 60000;
  const s3 = replayCookEvents(events, now2);
  assert("stepStates unchanged at +60s", eq(s1.stepStates, s3.stepStates), "");
  assert("tickedIngredients unchanged at +60s", eq(setToArr(s1.tickedIngredients), setToArr(s3.tickedIngredients)), "");
  assert("finished unchanged at +60s", s1.finished === s3.finished, "");
  assert("timer remaining dropped ~60s", s1.timers[0].remaining - s3.timers[0].remaining === 60,
    `delta=${s1.timers[0].remaining - s3.timers[0].remaining}`);
}

// ── SUMMARY ────────────────────────────────────────────────────────────────
console.log(`\n${"═".repeat(50)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
