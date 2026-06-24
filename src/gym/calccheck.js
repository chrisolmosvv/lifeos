// THROWAWAY — G7 Commit A calc-check harness. NOT wired into the app shell.
// Removed in Commit B. Lets the owner eyeball the calc numbers against a session
// they know, plus a hand-computable synthetic sanity block.

import { loadGymData } from "./gymLoad.js";
import * as C from "./gymCalc.js";

const out = document.getElementById("out");
const lines = [];
const log = (s = "") => lines.push(s);
const kg = (n) => (n == null ? "—" : `${Math.round(n).toLocaleString()} kg`);
const r1 = (n) => (n == null ? "—" : Math.round(n).toLocaleString());

function sanity() {
  log("─── SANITY (synthetic, hand-computable) ───");
  const sets = [
    { set_type: "warmup", weight_kg: 40, reps: 10 }, // warm-up → in volume, NOT in 1RM/PR
    { set_type: "normal", weight_kg: 80, reps: 5 },
    { set_type: "normal", weight_kg: 100, reps: 3 },
    { set_type: null, weight_kg: 60, reps: 8 },       // unknown tag → counts as WORKING
    { set_type: "normal", weight_kg: null, reps: 12 }, // bodyweight → 0 volume, no 1RM
  ];
  const v = C.sumVolume(sets);     // 400+400+300+480+0 = 1580
  const pr = C.prWeight(sets);     // 100
  const t = C.topSet(sets);        // 100 × 3
  const e = C.best1RM(sets);       // 100×(1+3/30)=110
  log(`volume      = ${v}      (expect 1580)`);
  log(`PR (heavy)  = ${pr}       (expect 100)`);
  log(`top set     = ${t?.weight_kg} × ${t?.reps}  (expect 100 × 3)`);
  log(`est 1RM     = ${Math.round(e)}      (expect 110)`);
  log("");
}

async function run() {
  sanity();
  let data;
  try {
    data = await loadGymData();
  } catch (err) {
    log(`ERROR loading data: ${err.message}`);
    log("(Are you logged into the main app in another tab on this same localhost?)");
    out.textContent = lines.join("\n");
    return;
  }
  const { workouts, exercises, sets, templatesById } = data;
  log(`Loaded: ${workouts.length} workouts, ${exercises.length} exercises, ${sets.length} sets, ${Object.keys(templatesById).length} templates.`);
  log("");

  const built = C.buildWorkouts(workouts, exercises, sets, templatesById);
  if (built.length === 0) {
    log("No workouts found.");
    out.textContent = lines.join("\n");
    return;
  }

  // 1) Most recent workout, fully broken down (hand-check volume + each lift).
  const w = built[0];
  log("─── MOST RECENT WORKOUT (hand-check this against Hevy) ───");
  log(`"${w.title || "(untitled)"}"  —  ${new Date(w.started_at).toLocaleString()}`);
  const mins = C.workoutMinutes(w);
  log(`duration: ${mins == null ? "—" : Math.round(mins) + " min"}   total volume: ${kg(C.workoutVolume(w))}`);
  log("");
  for (const ex of w.exercises) {
    const t = C.topSet(ex.sets);
    const e = C.best1RM(ex.sets);
    const setStr = ex.sets.map((s) => `${s.weight_kg ?? "bw"}×${s.reps ?? "?"}${C.isWarmup(s) ? "(w)" : ""}`).join(", ");
    log(`• ${ex.title || "(exercise)"}  [${ex.muscle || "?"}]`);
    log(`    sets: ${setStr}`);
    log(`    volume ${kg(C.sumVolume(ex.sets))}   top set ${t ? `${t.weight_kg}×${t.reps}` : "—"}   est 1RM ${kg(e)}`);
  }
  log("");
  log("(warm-ups marked (w) — counted in volume, excluded from top set / est 1RM)");
  log("");

  // 2) Current streak + consistency.
  log("─── STREAK / CONSISTENCY ───");
  log(`distinct training days (all time): ${C.trainingDays(workouts).size}`);
  log(`current daily streak: ${C.currentStreakDays(workouts)} day(s)`);
  log(`sessions per week, last 8 weeks (this week first): [${C.lastNWeeksSessions(workouts, 8).join(", ")}]`);
  log("");

  // 3) Rolling-7-day box score (the front-page band inputs).
  log("─── LAST 7 DAYS — BOX SCORE ───");
  const box = C.boxScore(built, 7);
  log(`Volume:   ${kg(box.volume)}`);
  log(`Sessions: ${box.sessions}`);
  log(`Time:     ${Math.round(box.timeMinutes)} min`);
  log(`New PRs:  ${box.newPRs}`);
  log("");

  // 4) Body-part split (bonus — group volume + frequency by primary muscle).
  log("─── BODY-PART SPLIT (all time) ───");
  const split = C.bodyPartSplit(built);
  for (const [muscle, b] of Object.entries(split).sort((a, b) => b[1].volume - a[1].volume)) {
    log(`  ${muscle.padEnd(16)} ${kg(b.volume).padStart(12)}   ${r1(b.setCount)} sets`);
  }

  out.textContent = lines.join("\n");
}

run();
