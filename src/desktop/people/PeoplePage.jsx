import { useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import SplitPane from '../kit/SplitPane'
import { listDirectory, listCircles } from '../../spine/data/peopleLoad'
import './people.css'

// PeoplePage — the Rolodex shell (D3). A two-pane broadsheet layout: directory
// on the left, focus panel on the right. Loads people + circles on mount. With
// zero people, both panes show their first-run empty states. The add flow, real
// directory rows, and focus panel contents arrive in later pieces.
export default function PeoplePage() {
  const [people, setPeople] = useState(null) // null = loading
  const [circles, setCircles] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [p, c] = await Promise.all([listDirectory(), listCircles()])
        setPeople(p)
        setCircles(c)
      } catch (e) {
        console.error('Rolodex load:', e)
        setPeople([])
      }
    }
    load()
  }, [])

  const empty = people !== null && people.length === 0

  return (
    <div className="people-page">
      <div className="people-header">
        <SmallCapsLabel>Rolodex</SmallCapsLabel>
        <HairlineRule />
      </div>
      <SplitPane
        left={
          <div className="people-dir">
            {people === null ? (
              <p className="people-loading">Loading…</p>
            ) : empty ? (
              <div className="people-empty">
                <p className="people-empty-lead">No one in your Rolodex yet.</p>
                <p className="people-empty-hint">Add someone to start building your people file.</p>
              </div>
            ) : null /* real directory rows arrive in D4 */}
          </div>
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
