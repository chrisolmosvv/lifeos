// LifeOS — Food → import review RAIL (4a, mock U). Three gates — Ingredients · Method & timings ·
// The plan — each with a one-line summary. Clicking switches passes. The active gate is accented;
// earlier ones read done.

const GATES = [
  { p: 1, lbl: "Ingredients" },
  { p: 2, lbl: "Method & timings" },
  { p: 3, lbl: "The plan" },
];

export default function ImportRail({ pass, subs, onGo }) {
  return (
    <div className="iv-rail">
      {GATES.map((g) => (
        <button key={g.p} type="button" className={`iv-gt${g.p === pass ? " on" : ""}${g.p < pass ? " done" : ""}`} onClick={() => onGo(g.p)}>
          <span className="num">{g.p}</span>
          <div><div className="lbl">{g.lbl}</div><div className="sub">{subs[g.p] || "—"}</div></div>
        </button>
      ))}
    </div>
  );
}
