// LifeOS — Food → recipe-import (F8): fetch a URL + extract recipe text for Gemini. Prefers the
// page's schema.org/Recipe JSON-LD (clean structured data that most recipe sites embed); else
// strips <script>/<style> + tags to plain text. Capped to bound the Gemini prompt.
//
// TIMEOUT covers the WHOLE read — both fetch() AND res.text(). A slow site can return 200 headers
// fast then stall the body; if the timer were cleared after fetch() (covering only headers), the
// body read would hang forever (the F8 freeze). One AbortController + one timer wrap both; the
// timer is cleared only after the text is read, so a stalled body aborts and throws → a clean
// fetch_fail. Throws on any fetch/timeout/HTTP error so index.ts returns fetch_fail.

const TIMEOUT_MS = 8000;
const MAX_CHARS = 12000;
const UA = "LifeOS/1.0 (personal recipe import)";

// Pull a schema.org/Recipe node from the page's JSON-LD, if present → a compact JSON string.
// Handles arrays + @graph wrappers; skips malformed blocks.
function jsonLdRecipe(html: string): string | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1].trim());
      const nodes = Array.isArray(data) ? data : Array.isArray(data?.["@graph"]) ? data["@graph"] : [data];
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
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

// Fetch + extract → the text Gemini will parse (JSON-LD Recipe preferred, else stripped page
// text). One timer guards fetch() AND res.text(); throws (→ fetch_fail) on any failure/timeout.
export async function fetchRecipeText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: ctrl.signal,
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text(); // same timer — a stalled body read aborts too, never hangs
    if (!html || html.length < 50) throw new Error("empty body");
    return jsonLdRecipe(html) || htmlToText(html);
  } finally {
    clearTimeout(timer);
  }
}
