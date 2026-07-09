import { useState } from "react";
import { importRecipe } from "../../spine/data/importClient";
import "./cookbook.css";

// ImportScreen — paste recipe text OR a URL → Import → a calm loading state → the F7 editor
// pre-filled (the review screen). Failures KEEP what you typed: fetch_fail → "couldn't fetch, paste
// instead" (URL kept); parse_fail → "couldn't read a recipe" (text kept). Props: onImported(draft,
// itemsById), onCancel().
export default function ImportScreen({ onImported, onCancel }) {
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // 'fetch_fail' | 'parse_fail' | null

  const run = async (payload) => {
    setLoading(true);
    setError(null);
    const res = await importRecipe(payload);
    setLoading(false);
    if (res.ok) onImported(res.draft, res.itemsById);
    else setError(res.error);
  };

  if (loading) {
    return (
      <div className="imp">
        <button type="button" className="red-back" onClick={onCancel}>‹ Cookbook</button>
        <div className="food-loading imp-loading"><span className="food-spinner" aria-hidden="true" /><span>Reading the recipe…</span></div>
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

      <label className="imp-label">From a link</label>
      <div className="imp-url-row">
        <input className="imp-url" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <button type="button" className="imp-go" disabled={!url.trim()} onClick={() => run({ url: url.trim() })}>Import</button>
      </div>

      <label className="imp-label">Or paste the text</label>
      <textarea className="imp-text" rows={10} placeholder="Paste a recipe — title, ingredients, steps…" value={text} onChange={(e) => setText(e.target.value)} />
      <button type="button" className="imp-go imp-go--block" disabled={!text.trim()} onClick={() => run({ text: text.trim() })}>Import pasted text</button>
    </div>
  );
}
