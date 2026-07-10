import { useCallback, useEffect, useState } from 'react'
import SmallCapsLabel from '../kit/SmallCapsLabel'
import HairlineRule from '../kit/HairlineRule'
import SplitPane from '../kit/SplitPane'
import Toast from '../kit/Toast'
import Directory from './Directory'
import FocusPanel from './FocusPanel'
import PersonFile from './PersonFile'
import ManageCircles from './ManageCircles'
import { listDirectory, listCircles, listArchived } from '../../spine/data/peopleLoad'
import { createPerson, archivePerson, restorePerson } from '../../spine/data/peopleWrite'
import './people.css'

// PeoplePage — the Rolodex shell (D7b). Two internal views: 'directory' (the D3–D5
// split pane) and 'file' (a person's full dossier). Archive + restore + toast.
export default function PeoplePage() {
  const [people, setPeople] = useState(null) // null = loading
  const [circles, setCircles] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [fileId, setFileId] = useState(null)
  const [toast, setToast] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [archived, setArchived] = useState([])
  const [manageView, setManageView] = useState(false)

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

  const [fileEditing, setFileEditing] = useState(false)

  async function handleCreate(name) {
    const created = await createPerson(name)
    await load()
    if (created?.id) setSelectedId(created.id)
  }

  async function handleCreateWithDetails(name) {
    const created = await createPerson(name)
    await load()
    if (created?.id) { setFileId(created.id); setFileEditing(true) }
  }

  function openFile(id) { setFileId(id); setFileEditing(false) }
  function closeFile() { setFileId(null); setFileEditing(false); load() }

  async function handleArchive(id, name) {
    await archivePerson(id)
    setFileId(null)
    setSelectedId(null)
    await load()
    setToast({ text: `Archived ${name}`, onUndo: async () => { setToast(null); await restorePerson(id); await load() } })
  }

  async function handleShowArchived() {
    const a = await listArchived()
    setArchived(a)
    setShowArchived(true)
  }

  async function handleRestore(id) {
    await restorePerson(id)
    setArchived((prev) => prev.filter((p) => p.id !== id))
    await load()
    if (archived.length <= 1) setShowArchived(false)
  }

  // Manage view
  if (manageView) {
    return (
      <div className="people-page">
        <ManageCircles circles={circles} onBack={() => { setManageView(false); load() }} onChanged={load} />
      </div>
    )
  }

  // File page view
  if (fileId) {
    return (
      <div className="people-page">
        <PersonFile personId={fileId} onBack={closeFile} startEditing={fileEditing} onArchive={handleArchive} onOpenPerson={openFile} />
        {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
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
              <Directory people={[]} circles={[]} onCreated={handleCreate} onCreatedWithDetails={handleCreateWithDetails} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          ) : (
            <>
              <Directory people={people} circles={circles} onCreated={handleCreate} onCreatedWithDetails={handleCreateWithDetails} selectedId={selectedId} onSelect={setSelectedId} />
              {showArchived ? (
                <div className="pdir-archived">
                  <button className="pdir-archived-toggle" onClick={() => setShowArchived(false)}>Hide archived</button>
                  {archived.map((p) => (
                    <div className="pdir-archived-row" key={p.id}>
                      <span className="pdir-archived-name">{p.name}</span>
                      <button className="pdir-restore-btn" onClick={() => handleRestore(p.id)}>Restore</button>
                    </div>
                  ))}
                  {archived.length === 0 && <p className="pdir-no-match">No archived people.</p>}
                </div>
              ) : (
                <button className="pdir-archived-toggle" onClick={handleShowArchived}>Show archived</button>
              )}
              <button className="pdir-archived-toggle" onClick={() => setManageView(true)}>Manage circles</button>
            </>
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
      {toast && <Toast text={toast.text} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />}
    </div>
  )
}
