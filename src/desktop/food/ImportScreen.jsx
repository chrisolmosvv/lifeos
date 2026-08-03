import { useState, useEffect } from "react";
import { importRecipe } from "../../spine/data/importClient";
import "./cookbook.css";

// A sign of life during the (up to ~90s) import so the owner can tell working from hung. The
// labels advance on a ROUGH TIME SCHEDULE per input kind — NOT a real stream (that's a later
// piece). The last label holds until the import actually returns.
const STAGES = {
  url:   ["Reading the page…", "Reading the recipe…", "Working out the timings…", "Matching the ingredients…"],
  text:  ["Reading the recipe…", "Working out the timings…", "Matching the ingredients…"],
  image: ["Reading the photo…", "Reading the recipe…", "Working out the timings…", "Matching the ingredients…"],
};
const STAGE_AT_MS = [4000, 10000, 18000]; // advance to stage 1, 2, 3 at these elapsed times

// Downscale a chosen photo in the browser BEFORE upload: a phone photo is several MB and would be
// rejected by the edge function's body limit. Longest edge 1600px + JPEG q0.8 is plenty for legible
// print (~0.3–0.8MB base64) with big headroom under the limit. Returns raw base64 (no data: prefix).
async function fileToDownscaledBase64(file, maxEdge = 1600, quality = 0.8) {
  const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", quality).split(",")[1];
}

// ImportScreen — paste recipe text, a URL, OR a photo of a printed recipe (2b) → Import → a calm
// loading state → the F7 editor pre-filled (the review screen). Failures KEEP what you typed:
// fetch_fail → "couldn't fetch, paste instead"; parse_fail → "couldn't read a recipe"; ocr_fail →
// "couldn't read that photo"; multi_recipe → "one recipe at a time". Props: onImported(draft,
// itemsById), onCancel().
export default function ImportScreen({ onImported, onCancel }) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [kind, setKind] = useState("text"); // 'url' | 'text' | 'image' — which staged labels to show
  const [stage, setStage] = useState(0);
  const [error, setError] = useState(null); // 'fetch_fail'|'parse_fail'|'ocr_fail'|'multi_recipe'|'photo_fail'|null

  // Walk the staged labels on a rough schedule while loading; reset when idle. Time-based only.
  useEffect(() => {
    if (!loading) { setStage(0); return; }
    const seq = STAGES[kind] || STAGES.text;
    const timers = STAGE_AT_MS
      .map((ms, i) => (i + 1 < seq.length ? setTimeout(() => setStage(i + 1), ms) : null))
      .filter(Boolean);
    return () => timers.forEach(clearTimeout);
  }, [loading, kind]);

  const run = async (payload) => {
    setKind(payload.url ? "url" : payload.image ? "image" : "text");
    setLoading(true);
    setError(null);
    const res = await importRecipe(payload);
    setLoading(false);
    if (res.ok) onImported(res.draft, res.itemsById);
    else setError(res.error);
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the owner re-pick the same file after a failure
    if (!file) return;
    setKind("image"); setLoading(true); setError(null);
    let image;
    try { image = await fileToDownscaledBase64(file); }
    catch { setLoading(false); setError("photo_fail"); return; }
    run({ image, imageMime: "image/jpeg" }); // keeps loading true through the import
  };

  if (loading) {
    const seq = STAGES[kind] || STAGES.text;
    return (
      <div className="imp">
        <button type="button" className="red-back" onClick={onCancel}>‹ Cookbook</button>
        <div className="food-loading imp-loading"><span className="food-spinner" aria-hidden="true" /><span>{seq[Math.min(stage, seq.length - 1)]}</span></div>
      </div>
    );
  }

  return (
    <div className="imp">
      <button type="button" className="red-back" onClick={onCancel}>‹ Cookbook</button>
      <h2 className="imp-h">Import a recipe</h2>

      {error === "unreachable" && <p className="imp-err">Couldn’t reach the import service — try again in a moment.</p>}
      {error === "fetch_fail" && <p className="imp-err">Couldn’t fetch that link — paste the recipe text below instead.</p>}
      {error === "parse_fail" && <p className="imp-err">Couldn’t read a recipe from that. Try the full text, or a different link.</p>}
      {error === "ocr_fail" && <p className="imp-err">Couldn’t read a recipe from that photo — try a clearer, straight-on shot, or paste the text.</p>}
      {error === "multi_recipe" && <p className="imp-err">That looks like more than one recipe — import one at a time (crop or paste just the one you want).</p>}
      {error === "photo_fail" && <p className="imp-err">Couldn’t open that image — try a different photo (JPEG or PNG).</p>}

      <label className="imp-label">From a link</label>
      <div className="imp-url-row">
        <input className="imp-url" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" className="imp-go" disabled={!url.trim()} onClick={() => run({ url: url.trim() })}>Import</button>
      </div>

      <label className="imp-label">Or from a photo</label>
      <input className="imp-photo" type="file" accept="image/*" onChange={onPhoto} />

      <label className="imp-label">Or paste the text</label>
      <textarea className="imp-text" rows={10} placeholder="Paste a recipe — title, ingredients, steps…" value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" className="imp-go imp-go--block" disabled={!text.trim()} onClick={() => run({ text: text.trim() })}>Import pasted text</button>
    </div>
  );
}
