// LifeOS — Food → recipe-import (Cookbook rebuild, Piece 2b): the OCR PRE-PASS.
//
// A photo of a printed recipe (cookbook or magazine page) → the page's text, as faithfully as it
// can be read. This is NOT a new pipeline: it only turns pixels into text and hands that text to
// the EXISTING Pass 1 → Pass 2, reusing every merge/prep/terse/multi-recipe rule already built in
// 2a. It must NOT interpret, restructure, summarise or improve — that is Pass 1's job. If the
// image holds no readable recipe, it fails cleanly instead of guessing.
//
// NO IMAGE IS EVER STORED. The photo is read here and discarded; nothing goes to storage or any
// recipe row.

import { callGeminiVision } from "../_shared/gemini.ts";

const OCR_SYSTEM = `You are a faithful OCR engine for recipe pages. Read the recipe in the image and output its text EXACTLY as printed — nothing else.
Rules:
- Transcribe the title, the ingredients list, and the method/steps, in reading order.
- Preserve every quantity, unit, temperature and time EXACTLY as printed (e.g. "180°C", "1½ tsp", "8–10 minutes"). Do not convert, round, or normalise anything.
- Do NOT interpret, reorder, restructure, summarise, or improve the recipe. Do not add or infer steps or ingredients. Transcribe only what is printed.
- Keep line breaks between ingredients and between steps so the structure survives.
- If the page clearly contains two separate recipes, transcribe BOTH, each under its own title.
- If the image contains no readable recipe — it is not a recipe, or it is too blurry/dark/angled to read — output EXACTLY this single token and nothing else: NO_RECIPE`;

// A guard so a giant upload fails fast rather than mid-call. ~1.1MB image → ~1.5M base64 chars;
// the client downscales well under this (longest edge 1600px), so a value over it is a bad upload.
const MAX_IMG_B64 = 1_500_000;

// OCR a recipe photo → { ok:true, text } or { ok:false }. `base64` is the raw image bytes,
// base64-encoded, WITHOUT any "data:...;base64," prefix (the client strips it before upload).
export async function ocrRecipePhoto(
  base64: string,
  mimeType: string,
): Promise<{ ok: true; text: string } | { ok: false }> {
  if (!base64 || typeof base64 !== "string" || base64.length > MAX_IMG_B64) return { ok: false };
  // Only accept image mime types the model reads; default to jpeg (what the client sends).
  const mime = /^image\/(jpeg|png|webp|heic|heif)$/i.test(mimeType) ? mimeType : "image/jpeg";

  const res = await callGeminiVision({
    system: OCR_SYSTEM,
    prompt: "Transcribe the recipe in this image, exactly as printed.",
    base64,
    mimeType: mime,
    generationConfig: { temperature: 0 },
  });
  if (!res.ok) return { ok: false };

  const text = res.text.trim();
  // Clean fail on the sentinel, an empty read, or a scrap too short to be a recipe.
  if (!text || /^NO_RECIPE\b/im.test(text) || text.length < 20) return { ok: false };
  return { ok: true, text };
}
