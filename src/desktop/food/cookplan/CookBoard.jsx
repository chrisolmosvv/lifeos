// LifeOS — Food → cook plan BOARD (3d, mock Q). The step table — the ONLY zone that scrolls
// internally when the type is pushed past the hole. Sticky header; a hairline scrollbar. The fit
// scale is applied as the inner font-size (rows use em) so fit-to-hole and A−/A+ resize everything.
// The scroll ref/onScroll come from useFitToHole, which preserves scrollTop across the 1s ticks.

import CookBoardRow from "./CookBoardRow";

export default function CookBoard({ scrollRef, contentRef, onScroll, scale, rows }) {
  return (
    <div className="cpq-board" ref={scrollRef} onScroll={onScroll}>
      <div className="cpq-board-inner" ref={contentRef} style={{ fontSize: `${scale}em` }}>
        <div className="cpq-board-head">
          <span className="cpq-col cpq-col-block" />
          <span className="cpq-col cpq-col-step">Step</span>
          <span className="cpq-col cpq-col-startby">Start by</span>
          <span className="cpq-col cpq-col-takes">Takes</span>
        </div>
        <ol className="cpq-board-list">
          {rows.map((r) => <CookBoardRow key={r.index} {...r} />)}
        </ol>
      </div>
    </div>
  );
}
