// LifeOS — Food → recipe-import (F8): fetch a URL + extract recipe text for Gemini. Prefers the
// page's schema.org/Recipe JSON-LD (clean structured data that most recipe sites embed); else
// strips <script>/<style> + tags to plain text. Capped to bound the Gemini prompt. Fetch has a
// hard timeout — Frankfurt → arbitrary sites can be slow (the food-search latency lesson). Throws
// on a fetch/timeout/HTTP error so index.ts returns a distinct fetch_fail.

const TIMEOUT_MS = 8000;
const MAX_CHARS = 12000;
const UA = "LifeOS/1.0 (personal recipe import)";

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: ctrl.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(t);
  }
}

// Pull a schema.org/Recipe node from the page's JSON-LD, if present → a compact JSON string. Recipe
// sites commonly embed this; it's the cleanest input for Gemini. Handles arrays + @graph wrappers.
function jsonLdRecipe(html: string): string | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1].trim());
      const nodes = Array.isArray(data)
        ? data
        : Array.isArray(data?.["@graph"]) ? data["@graph"] : [data];
      for (const node of nodes) {
        const type = node?.["@type"];
        const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
        if (isRecipe) return JSON.stringify(node).slice(0, MAX_CHARS);
      }
    } catch {
      /* a malformed JSON-LD block — skip it */
    }
  }
  return null;
}

// Strip a page to readable text: drop scripts/styles, tags → spaces, collapse whitespace, cap.
function htmlToText(html: string): string {
  const noScript = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  return noScript
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

// Fetch + extract → the text Gemini will parse (JSON-LD Recipe preferred, else stripped page text).
// Throws (→ fetch_fail) on a network/timeout/HTTP error or an empty body.
export async function fetchRecipeText(url: string): Promise<string> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (!html || html.length < 50) throw new Error("empty body");
  return jsonLdRecipe(html) || htmlToText(html);
}
