// LifeOS — Food → meal-estimate client (V2 P5). Invokes the meal-estimate Edge Function (a typed
// description → Gemini → {kcal,P,C,F}). Returns { ok:true, estimate } or { ok:false } — on ANY
// failure (transport, quota-out, the MEAL_ESTIMATE_OFF kill-switch) the caller (EstimateMealPanel)
// falls to manual entry, so an estimate never hard-stops. Mirrors importClient.

import { supabase } from "../supabaseClient.js";

const TIMEOUT_MS = 20000; // backstop so the panel never hangs waiting on the model

export async function estimateMeal(description) {
  try {
    const res = await Promise.race([
      supabase.functions.invoke("meal-estimate", { body: { description } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("client_timeout")), TIMEOUT_MS)),
    ]);
    if (res.error || !res.data || res.data.ok !== true) return { ok: false };
    const e = res.data.estimate || {};
    return { ok: true, estimate: { kcal: e.kcal ?? 0, protein: e.protein ?? 0, carbs: e.carbs ?? 0, fat: e.fat ?? 0 } };
  } catch {
    return { ok: false }; // → the panel stays a manual 4-number form
  }
}
