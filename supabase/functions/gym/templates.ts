// LifeOS — Health → Gym: the G6 exercise-templates fill ("sync_templates" mode).
//
// Pages Hevy's read-only GET /v1/exercise_templates and UPSERTS each into
// gym_exercise_templates on (user_id, template_id) — idempotent, re-runnable. This is
// the dictionary the G7 calc layer joins to (gym_exercises.exercise_template_id →
// title + muscle group). Same defensive paging as the G3 backfill: a short delay
// between pages, ONE polite backoff on a 429 then STOP-and-report, never a tight loop.

import { fetchExerciseTemplatesPage, HEVY_PAGE_SIZE } from "./hevy.ts";
import { upsertExerciseTemplates } from "./store.ts";

const PAGE_DELAY_MS = 350;
const MAX_PAGES = 200; // ~44 pages of real data; generous headroom
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

// Map ONE raw Hevy template → our row (raw values, verbatim — no transform).
function mapTemplate(raw: Record<string, unknown>) {
  const secondary = Array.isArray(raw.secondary_muscle_groups)
    ? (raw.secondary_muscle_groups as unknown[]).filter((m): m is string => typeof m === "string")
    : [];
  return {
    template_id: str(raw.id) ?? "",
    title: str(raw.title),
    type: str(raw.type),
    primary_muscle_group: str(raw.primary_muscle_group),
    secondary_muscle_groups: secondary,
    equipment: str(raw.equipment),
    is_custom: typeof raw.is_custom === "boolean" ? raw.is_custom : null,
  };
}

export type TemplatesReport = {
  ok: boolean;
  mode: "sync_templates";
  templates_written: number;
  pages_fetched: number;
  page_size: number;
  rate_limit_429s: number;
  rate_limits_seen: Record<string, string>;
  stopped_early: boolean;
  note: string;
};

export async function runSyncTemplates(): Promise<TemplatesReport> {
  const report: TemplatesReport = {
    ok: false, mode: "sync_templates", templates_written: 0, pages_fetched: 0,
    page_size: HEVY_PAGE_SIZE, rate_limit_429s: 0, rate_limits_seen: {},
    stopped_early: false, note: "",
  };
  const stop = (note: string): TemplatesReport => {
    report.stopped_early = true;
    report.note = note;
    return report;
  };

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await sleep(PAGE_DELAY_MS);
    let res = await fetchExerciseTemplatesPage(page);

    if (!res.ok && res.status === 429) {
      report.rate_limit_429s++;
      report.rate_limits_seen = { ...report.rate_limits_seen, ...res.rate };
      const retry = Number(res.rate["retry-after"]);
      await sleep(Number.isFinite(retry) && retry > 0 ? Math.min(retry * 1000, 10000) : 2000);
      res = await fetchExerciseTemplatesPage(page);
      if (!res.ok && res.status === 429) {
        report.rate_limit_429s++;
        return stop(`Hit Hevy's rate limit (429) on templates page ${page} after one backoff — stopped cleanly. Re-run is safe (upsert).`);
      }
    }
    if (!res.ok) return stop(`Hevy returned HTTP ${res.status} on templates page ${page} — stopped. (${res.note})`);

    if (Object.keys(res.rate).length > 0) report.rate_limits_seen = { ...report.rate_limits_seen, ...res.rate };
    report.pages_fetched++;

    if (res.templates.length === 0) break; // past the end

    const rows = res.templates
      .map((t) => mapTemplate(t as Record<string, unknown>))
      .filter((r) => r.template_id); // skip any row missing an id
    const n = await upsertExerciseTemplates(rows);
    if (n === null) return stop(`Couldn't write templates on page ${page} — stopped. Re-run is safe (upsert).`);
    report.templates_written += n;

    if (res.pageCount !== null && page >= res.pageCount) break;
  }

  report.ok = true;
  report.note = report.note || `Filled ${report.templates_written} templates over ${report.pages_fetched} pages. Re-running is safe (upsert on user_id,template_id).`;
  return report;
}
