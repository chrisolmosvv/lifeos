// LifeOS — Health kit: a skeleton broadsheet (V2), replacing the spinner while data
// loads. Placeholder columns + blocks that gently pulse, shaped like the page that's
// coming (so the load reads as "filling in", not "waiting"). Pure presentation; the
// `cols` shape mirrors the broadsheet's column count. Decorative → aria-hidden.
export default function Skeleton({ cols = 3 }) {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: cols }).map((_, c) => (
        <div className="sk-col" key={c}>
          <span className="sk-line sk-line--kicker" />
          <span className="sk-line sk-line--big" />
          <span className="sk-block" />
          <span className="sk-line" />
          <span className="sk-line sk-line--short" />
        </div>
      ))}
    </div>
  );
}
