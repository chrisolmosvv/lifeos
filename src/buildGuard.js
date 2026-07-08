// Build-time guard: fails the build if desktop/ and mobile/ trees cross-contaminate.
// Files under spine/ are allowed in both bundles.

export default function buildGuard() {
  return {
    name: 'lifeos-bundle-guard',
    generateBundle(_, bundle) {
      // Collect all chunks and their module sources.
      const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')

      for (const chunk of chunks) {
        const mods = Object.keys(chunk.modules || {})
        const hasDesktop = mods.some((m) => m.includes('/src/desktop/'))
        const hasMobile = mods.some((m) => m.includes('/src/mobile/'))

        // A single chunk must never contain modules from BOTH trees.
        if (hasDesktop && hasMobile) {
          const desktopMods = mods.filter((m) => m.includes('/src/desktop/'))
          const mobileMods = mods.filter((m) => m.includes('/src/mobile/'))
          this.error(
            `BUNDLE GUARD: chunk "${chunk.fileName}" mixes desktop and mobile modules!\n` +
            `  Desktop modules:\n${desktopMods.map((m) => `    ${m}`).join('\n')}\n` +
            `  Mobile modules:\n${mobileMods.map((m) => `    ${m}`).join('\n')}`
          )
        }
      }

      // Now check the transitive chunk closure for each dynamic entry.
      // The mobile entry's reachable chunks must not include any chunk with desktop modules,
      // and vice versa.
      const dynamicEntries = chunks.filter((c) => c.isDynamicEntry)

      for (const entry of dynamicEntries) {
        // Walk the chunk import graph.
        const visited = new Set()
        const queue = [entry.fileName]
        while (queue.length) {
          const name = queue.pop()
          if (visited.has(name)) continue
          visited.add(name)
          const c = bundle[name]
          if (!c || c.type !== 'chunk') continue
          for (const dep of (c.imports || [])) queue.push(dep)
        }

        // Union all source modules across reachable chunks.
        const allMods = []
        for (const name of visited) {
          const c = bundle[name]
          if (c && c.type === 'chunk' && c.modules) {
            allMods.push(...Object.keys(c.modules))
          }
        }

        const entryMods = Object.keys(entry.modules || {})
        const isMobileEntry = entryMods.some((m) => m.includes('/src/mobile/'))
        const isDesktopEntry = entryMods.some((m) => m.includes('/src/desktop/'))

        if (isMobileEntry) {
          const violations = allMods.filter((m) => m.includes('/src/desktop/'))
          if (violations.length) {
            this.error(
              `BUNDLE GUARD: mobile tree's chunk closure pulls in desktop file(s):\n` +
              violations.map((v) => `  ${v}`).join('\n')
            )
          }
        }

        if (isDesktopEntry) {
          const violations = allMods.filter((m) => m.includes('/src/mobile/'))
          if (violations.length) {
            this.error(
              `BUNDLE GUARD: desktop tree's chunk closure pulls in mobile file(s):\n` +
              violations.map((v) => `  ${v}`).join('\n')
            )
          }
        }
      }
    },
  }
}
