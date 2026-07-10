import { useCallback, useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import SplitPane from '../kit/SplitPane'
import Directory from './Directory'
import { listDirectory, listCircles } from '../../spine/data/peopleLoad'
import { createPerson } from '../../spine/data/peopleWrite'
import './people.css'

// PeoplePage — the Rolodex shell (D4). Two-pane broadsheet: directory on the
// left (with search + quick-add), focus panel on the right. Loads people +
// circles on mount. Quick-add creates a name-only person and reloads.
export default function PeoplePage() {
  const [people, setPeople] = useState(null) // null = loading
  const [circles, setCircles] = useState([])

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([listDirectory(), listCircles()])
      setPeople(p)
      setCircles(c)
    } catch (e) {
      console.error('Rolodex load:', e)
      setPeople([])
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(name) {
    await createPerson(name)
    await load()
  }

  const empty = people !== null && people.length === 0

  return (
    <div className="people-page">
      <div className="people-header">
        <SmallCapsLabel>Rolodex</SmallCapsLabel>
        <HairlineRule />
      </div>
      <SplitPane
        left={
          people === null ? (
            <p className="people-loading">Loading…</p>
          ) : empty ? (
            <div className="people-dir-empty">
              <div className="people-empty">
                <p className="people-empty-lead">No one in your Rolodex yet.</p>
                <p className="people-empty-hint">Add someone to start building your people file.</p>
              </div>
              <Directory people={[]} circles={[]} onCreated={handleCreate} />
            </div>
          ) : (
            <Directory people={people} circles={circles} onCreated={handleCreate} />
          )
        }
        right={
          <div className="people-focus">
            <p className="people-focus-rest">Pick someone from the directory, or search by name.</p>
          </div>
        }
      />
    </div>
  )
}
