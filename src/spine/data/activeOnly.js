// The ONE shared way to say "active only" (Archive A3): hide archived rows from
// every read. Apply to every tasks/events/categories SELECT that feeds a screen,
// so the rule is uniform and never re-implemented subtly differently per screen.
export const activeOnly = (query) => query.is('archived_at', null)
