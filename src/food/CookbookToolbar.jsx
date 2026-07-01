// CookbookToolbar (V2 P6) — the library controls: sort tabs (Added/Cooked/A–Z/Favourites), the
// All/Recipes/Meals filter (a DERIVED cut via recipeKind), a search icon that expands to a field on
// tap, a grid⇄list toggle, and Import / + New. Pure chrome — the consumer holds the state.
const SORTS = [["added", "Added"], ["cooked", "Cooked"], ["az", "A–Z"], ["fav", "Favourites"]];
const FILTERS = [["all", "All"], ["recipe", "Recipes"], ["meal", "Meals"]];

export default function CookbookToolbar({ sort, onSort, filter, onFilter, viewMode, onToggleView, searchOpen, onToggleSearch, query, onQuery, onSearchKey, onImport, onNew }) {
  return (
    <div className="cb-head">
      <div className="cb-sorts" role="tablist" aria-label="Sort recipes">
        {SORTS.map(([id, label]) => (
          <button key={id} type="button" className={id === sort ? "cb-sort is-active" : "cb-sort"} aria-selected={id === sort} onClick={() => onSort(id)}>{label}</button>
        ))}
      </div>
      <div className="cb-filters">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" className={id === filter ? "cb-filter is-on" : "cb-filter"} onClick={() => onFilter(id)}>{label}</button>
        ))}
      </div>
      <div className="cb-head-actions">
        {searchOpen ? (
          <input className="cb-search" type="text" placeholder="Search recipes…" value={query} autoFocus onChange={(e) => onQuery(e.target.value)} onKeyDown={onSearchKey} />
        ) : (
          <button type="button" className="cb-icon" aria-label="Search" onClick={onToggleSearch}>⌕</button>
        )}
        <button type="button" className="cb-icon" aria-label={viewMode === "grid" ? "List view" : "Grid view"} onClick={onToggleView}>{viewMode === "grid" ? "☰" : "▦"}</button>
        <button type="button" className="cb-import-btn" onClick={onImport}>Import</button>
        <button type="button" className="cb-new" onClick={onNew}>+ New</button>
      </div>
    </div>
  );
}
