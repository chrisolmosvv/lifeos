import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../spine/data/supabaseClient.js";
import { resolveColor } from "../../spine/logic/colorModel";
import { colorHex, INBOX_COLOR } from "../../spine/logic/palette";
import { fetchSessions } from "./focusLoad.js";
import { fetchGoals } from "../../spine/data/healthLoad";
import { resolveGoals } from "../../spine/logic/healthGoals";

// useFocusData — the Focus pillar's READ layer, split out of FocusPage to keep that
// file lean. Loads categories, the last ~100 days of sessions, and the focus goals;
// derives the colour / name / stable-rank helpers + the daily/weekly goal seconds; and
// refreshes when focus data changes anywhere (e.g. a Stop→Save from the header marker
// on another screen). Returns everything FocusPage + the overview need to read.
export function useFocusData() {
  const [cats, setCats] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [goals, setGoals] = useState(new Map());

  const refresh = useCallback(async () => {
    const t = Date.now();
    setRawRows(await fetchSessions(new Date(t - 100 * 86400000).toISOString(), new Date(t + 86400000).toISOString()));
  }, []);
  const refreshGoals = useCallback(async () => setGoals(resolveGoals(await fetchGoals())), []);

  useEffect(() => {
    supabase.from("categories").select("id, name, parent_id, color, sort_order").is("archived_at", null)
      .then(({ data }) => setCats(data || []));
    refresh(); refreshGoals();
  }, [refresh, refreshGoals]);

  // Keep reads fresh when focus data changes anywhere (even from another pillar).
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener("lifeos:focus-changed", h);
    return () => window.removeEventListener("lifeos:focus-changed", h);
  }, [refresh]);

  const byId = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const colorFor = useCallback((id) => {
    if (!id) return "var(--ink-muted)";
    const c = byId.get(id);
    return c ? resolveColor(c, byId) : (colorHex(INBOX_COLOR) || "#9A9384");
  }, [byId]);
  const nameFor = useCallback((id) => {
    if (!id) return "No category";
    return byId.get(id)?.name || "No category";
  }, [byId]);
  // A STABLE per-category rank (by the category's own sort position) so the chart can
  // draw each category in the same stack slot on every day. Uncategorised sorts last.
  const catRank = useMemo(() => {
    const ordered = [...cats].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.id).localeCompare(String(b.id)));
    const m = new Map(ordered.map((c, i) => [c.id, i]));
    return (id) => (id != null && m.has(id) ? m.get(id) : Number.MAX_SAFE_INTEGER);
  }, [cats]);

  const dailySeconds = goals.get("focus_daily")?.target_value ?? null;
  const weeklySeconds = goals.get("focus_weekly")?.target_value ?? null;

  return { cats, rawRows, refresh, refreshGoals, colorFor, nameFor, catRank, dailySeconds, weeklySeconds };
}
