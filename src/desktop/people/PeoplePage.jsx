import { useCallback, useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import SplitPane from '../kit/SplitPane'
import Directory from './Directory'
import FocusPanel from './FocusPanel'
import PersonFile from './PersonFile'
import { listDirectory, listCircles } from '../../spine/data/peopleLoad'
import { createPerson } from '../../spine/data/peopleWrite'
import './people.css'

// PeoplePage — the Rolodex shell (D6). Two internal views: 'directory' (the D3–D5
// split pane) and 'file' (a person's full dossier). State-based, no router.
export default function PeoplePage() {
  const [people, setPeople] = useState(null) // null = loading
  const [circles, setCircles] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [fileId, setFileId] = useState(null) // non-null → show the file page

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
    const created = await createPerson(name)
    await load()
    if (created?.id) setSelectedId(created.id)
  }

  function openFile(id) { setFileId(id) }
  function closeFile() { setFileId(null) }

  // File page view
  if (fileId) {
    return (
      <div className="people-page">
        <PersonFile personId={fileId} onBack={closeFile} />
      </div>
    )
  }

  // Directory view (the split pane)
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
              <Directory people={[]} circles={[]} onCreated={handleCreate} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          ) : (
            <Directory people={people} circles={circles} onCreated={handleCreate} selectedId={selectedId} onSelect={setSelectedId} />
          )
        }
        right={
          selectedId ? (
            <FocusPanel personId={selectedId} onOpenFile={() => openFile(selectedId)} />
          ) : (
            <div className="people-focus">
              <p className="people-focus-rest">Pick someone from the directory, or search by name.</p>
            </div>
          )
        }
      />
    </div>
  )
}
