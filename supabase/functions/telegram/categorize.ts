// LifeOS — Telegram bot, M6: guess a category on capture, and learn the owner's filing.
//
// On capture Marty GUESSES a category from the owner's REAL categories (never invents one)
// and shows it — an honest "Inbox" when nothing fits beats a bad guess. The guess is the
// AI's soft judgement, so it's always shown and easily corrected in words.
//
// LEARNING: corrections are logged to marty_category_learning; the guess READS them and
// only applies a learned preference once the SAME kind of correction has happened
// LEARN_THRESHOLD times — a single one-off never retrains Marty.

import { callGemini } from "../_shared/gemini.ts";
import { insert, OWNER_USER_ID, select } from "./db.ts";

// id null = Inbox (the existing capture convention — no category row).
export interface Guess { id: string | null; name: string }
const INBOX: Guess = { id: null, name: "Inbox" };

// A learned preference applies once there are >= this many matching corrections to the
// SAME category. So 1 correction is a one-off; the 2nd establishes the pattern.
export const LEARN_THRESHOLD = 2;

interface Cat { id: string; name: string }
interface Correction { item_title: string; corrected_category_id: string | null }

// The owner's real categories (active), EXCLUDING any literal "Inbox" (Inbox = null here).
async function readCategories(): Promise<Cat[]> {
  const rows = await select(`categories?user_id=eq.${OWNER_USER_ID}&archived_at=is.null&select=id,name`);
  if (!rows) return [];
  return rows
    .map((r) => ({ id: String(r.id), name: String(r.name) }))
    .filter((c) => c.name.trim().toLowerCase() !== "inbox");
}

async function readCorrections(): Promise<Correction[]> {
  const rows = await select(
    `marty_category_learning?user_id=eq.${OWNER_USER_ID}&select=item_title,corrected_category_id&order=created_at.desc&limit=200`,
  );
  if (!rows) return [];
  return rows.map((r) => ({
    item_title: String(r.item_title ?? ""),
    corrected_category_id: r.corrected_category_id ? String(r.corrected_category_id) : null,
  }));
}

const STOP = new Set(["the", "a", "an", "to", "my", "your", "for", "and", "or", "of", "on", "at", "in", "with", "this", "that", "is", "it", "please", "add", "need", "get"]);
function words(s: string): string[] {
  return [...new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w)))];
}

// Deterministic learned preference for a title: of the past corrections that SHARE a
// content word with it, the most-corrected category — but only if it reaches the
// threshold and still exists (active). null = no learned preference (fall back to the AI).
function learnedGuess(title: string, corrections: Correction[], cats: Cat[]): Guess | null {
  const w = words(title);
  if (!w.length) return null;
  const counts = new Map<string, number>();
  for (const c of corrections) {
    if (!c.corrected_category_id) continue;
    if (words(c.item_title).some((x) => w.includes(x))) {
      counts.set(c.corrected_category_id, (counts.get(c.corrected_category_id) ?? 0) + 1);
    }
  }
  let best: string | null = null, bestN = 0;
  for (const [id, n] of counts) if (n > bestN) (best = id, bestN = n);
  if (best && bestN >= LEARN_THRESHOLD) {
    const cat = cats.find((c) => c.id === best);
    if (cat) return { id: cat.id, name: cat.name };
  }
  return null;
}

// Ask Gemini to file each title into the category list (or "" = Inbox). ONE call; returns a
// category name per input title ("" where none fits / on any failure → Inbox).
async function baseGuessBatch(titles: string[], cats: Cat[]): Promise<string[]> {
  const names = cats.map((c) => c.name);
  const list = titles.map((t, i) => `${i + 1}. ${t}`).join("\n");
  const res = await callGemini({
    system:
      `You file items into the owner's EXISTING categories. For each numbered item, choose the single best-fitting category NAME from the list, or "" if none clearly fits (it then goes to Inbox). Use ONLY names from the list, spelled exactly; never invent one. Prefer "" over a weak guess.\nReturn JSON: an array of { "i": <item number>, "category": "<name or empty>" }.`,
    user: `Categories: ${names.join(", ")}\nItems:\n${list}`,
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: { type: "array", items: { type: "object", properties: { i: { type: "integer" }, category: { type: "string" } }, required: ["i", "category"] } },
    },
  });
  const out = titles.map(() => "");
  if (!res.ok) return out;
  try {
    const arr = JSON.parse(res.text);
    if (Array.isArray(arr)) {
      for (const e of arr) {
        const idx = Number(e?.i) - 1;
        const got = typeof e?.category === "string" ? e.category.trim().toLowerCase() : "";
        const match = names.find((n) => n.toLowerCase() === got);
        if (idx >= 0 && idx < out.length && match) out[idx] = match;
      }
    }
  } catch (_e) { /* leave as Inbox */ }
  return out;
}

// Guess a category per title: a MET learned preference wins; else the AI's pick; else Inbox.
export async function guessCategories(titles: string[]): Promise<Guess[]> {
  if (titles.length === 0) return [];
  const cats = await readCategories();
  if (cats.length === 0) return titles.map(() => INBOX); // no real categories → Inbox, no AI call

  const corrections = await readCorrections();
  const learned = titles.map((t) => learnedGuess(t, corrections, cats));

  const aiTitles = titles.filter((_, i) => !learned[i]);
  const aiResults = aiTitles.length ? await baseGuessBatch(aiTitles, cats) : [];

  let k = 0;
  return titles.map((_, i) => {
    if (learned[i]) return learned[i]!;
    const name = aiResults[k++] ?? "";
    const cat = name ? cats.find((c) => c.name.toLowerCase() === name.toLowerCase()) : undefined;
    return cat ? { id: cat.id, name: cat.name } : INBOX;
  });
}

// Resolve a worded category name to an existing category (for "that's Admin"). "Inbox"
// resolves to the null bucket; null = no such category.
export async function resolveCategory(name: string): Promise<Guess | null> {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  if (n === "inbox") return INBOX;
  const cats = await readCategories();
  const cat = cats.find((c) => c.name.toLowerCase() === n) ?? cats.find((c) => c.name.toLowerCase().includes(n));
  return cat ? { id: cat.id, name: cat.name } : null;
}

// Log a correction for pattern learning. Best-effort: if the table isn't set up yet this
// no-ops, so the correction itself still applies (the item is refiled regardless).
export async function logCorrection(itemTitle: string, guessedId: string | null, correctedId: string | null): Promise<void> {
  await insert("marty_category_learning", {
    user_id: OWNER_USER_ID,
    item_title: itemTitle,
    guessed_category_id: guessedId,
    corrected_category_id: correctedId,
  });
}
