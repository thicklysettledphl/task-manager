import { useState, useEffect, useRef, useCallback } from 'react'
import type { Note, Project, Task } from '@/types'
import type { View } from '@/App'
import ProjectSidebar from '@/components/ProjectSidebar'

interface Props {
  onNavigate: (v: View) => void
  initialNoteId?: string
}

export default function NotesPage({ onNavigate, initialNoteId }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Note | null>(null)
  const [search, setSearch] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const initialApplied = useRef(false)
  const draftRef = useRef<Note | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const checklistRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const load = useCallback(async () => {
    const store = await window.api.getTasks()
    setProjects(store.projects)
    setTasks(store.tasks)
    setNotes(store.notes ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-select note when opened from another view
  useEffect(() => {
    if (!initialNoteId || initialApplied.current || notes.length === 0) return
    const note = notes.find((n) => n.id === initialNoteId)
    if (note) {
      initialApplied.current = true
      setSelectedId(note.id)
      setDraft({ ...note })
      setTimeout(() => titleRef.current?.focus(), 50)
    }
  }, [notes, initialNoteId])

  useEffect(() => { draftRef.current = draft }, [draft])

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        if (draftRef.current) {
          window.api.updateNote(draftRef.current.id, draftRef.current)
        }
      }
    }
  }, [])

  function autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    if (bodyRef.current) autoGrow(bodyRef.current)
  }, [draft?.body])

  function scheduleSave(updated: Note) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      try {
        const saved = await window.api.updateNote(updated.id, updated)
        setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)))
      } catch (err) {
        console.error('Failed to save note:', err)
      }
    }, 600)
  }

  function updateDraft(updates: Partial<Note>) {
    if (!draft) return
    const updated = { ...draft, ...updates, updatedAt: new Date().toISOString() }
    setDraft(updated)
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
    scheduleSave(updated)
  }

  async function flushSave() {
    if (saveTimerRef.current && draftRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      const saved = await window.api.updateNote(draftRef.current.id, draftRef.current)
      setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)))
    }
  }

  async function selectNote(note: Note) {
    await flushSave()
    setSelectedId(note.id)
    setDraft({ ...note })
    setShowDeleteConfirm(false)
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  async function createNote() {
    await flushSave()
    const note = await window.api.createNote({
      title: '',
      body: '',
      checklistItems: [],
      projectIds: [],
    })
    setNotes((prev) => [note, ...prev])
    setSelectedId(note.id)
    setDraft({ ...note })
    setShowDeleteConfirm(false)
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  async function deleteNote() {
    if (!draft) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await window.api.deleteNote(draft.id)
    setNotes((prev) => prev.filter((n) => n.id !== draft.id))
    setSelectedId(null)
    setDraft(null)
    setShowDeleteConfirm(false)
  }

  function addChecklistItem(afterId?: string) {
    if (!draft) return
    const newItem = { id: crypto.randomUUID(), text: '', checked: false }
    const items = [...draft.checklistItems]
    if (afterId) {
      const idx = items.findIndex((i) => i.id === afterId)
      items.splice(idx + 1, 0, newItem)
    } else {
      items.push(newItem)
    }
    updateDraft({ checklistItems: items })
    setTimeout(() => checklistRefs.current.get(newItem.id)?.focus(), 50)
  }

  function updateChecklistItem(id: string, updates: { text?: string; checked?: boolean }) {
    if (!draft) return
    const items = draft.checklistItems.map((i) => (i.id === id ? { ...i, ...updates } : i))
    updateDraft({ checklistItems: items })
  }

  function deleteChecklistItem(id: string) {
    if (!draft) return
    const idx = draft.checklistItems.findIndex((i) => i.id === id)
    const prevId = idx > 0 ? draft.checklistItems[idx - 1].id : null
    const items = draft.checklistItems.filter((i) => i.id !== id)
    updateDraft({ checklistItems: items })
    setTimeout(() => {
      if (prevId) checklistRefs.current.get(prevId)?.focus()
      else bodyRef.current?.focus()
    }, 50)
  }

  const q = search.toLowerCase()
  const filteredNotes = notes
    .filter((n) => {
      if (!q) return true
      return (
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.checklistItems.some((i) => i.text.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  function relativeDate(iso: string): string {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  function previewText(note: Note): string {
    const line = note.body.split('\n').find((l) => l.trim())
    if (line) return line.trim()
    const item = note.checklistItems.find((i) => i.text.trim())
    if (item) return (item.checked ? '✓ ' : '○ ') + item.text
    return 'No additional text'
  }

  const doneItems = draft?.checklistItems.filter((i) => i.checked).length ?? 0
  const totalItems = draft?.checklistItems.length ?? 0

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectSidebar
        projects={projects}
        currentView={{ type: 'notes' }}
        onNavigate={onNavigate}
        onReload={load}
      />

      {/* Notes list panel */}
      <div className="w-64 shrink-0 border-r border-white/10 flex flex-col h-screen">
        <div style={{ paddingTop: 36 }} className="px-4 pb-3 border-b border-white/10 flex items-center justify-between">
          <span className="text-sm font-bold tracking-widest text-white/50 uppercase">Notes</span>
          <button
            onClick={createNote}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xl leading-none"
            title="New note"
          >
            +
          </button>
        </div>

        <div className="px-3 py-2 border-b border-white/10">
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:bg-white/10 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filteredNotes.length === 0 && (
            <div className="px-4 py-10 text-center text-white/25 text-sm">
              {search ? 'No matching notes' : 'No notes yet.\nClick + to create one.'}
            </div>
          )}
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => selectNote(note)}
              className={`w-full text-left px-4 py-3 transition-colors cursor-pointer border-b border-white/5 ${
                selectedId === note.id ? 'bg-white/15' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="text-sm font-medium text-white truncate">
                  {note.title || 'Untitled Note'}
                </span>
                <span className="text-xs text-white/30 shrink-0">{relativeDate(note.updatedAt)}</span>
              </div>
              <div className="text-xs text-white/40 truncate">{previewText(note)}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor panel */}
      <div className="flex-1 overflow-y-auto">
        {!draft ? (
          <div className="flex flex-col items-center justify-center h-full text-white/25 text-sm gap-3">
            <div className="text-5xl opacity-20">✎</div>
            <div>Select a note or click + to create one</div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-12 py-16">
            {/* Title */}
            <input
              ref={titleRef}
              type="text"
              placeholder="Title"
              value={draft.title}
              onChange={(e) => updateDraft({ title: e.target.value })}
              className="w-full bg-transparent text-3xl font-bold text-white placeholder-white/15 outline-none mb-2"
            />

            {/* Meta */}
            <div className="text-xs text-white/25 mb-8">
              {new Date(draft.updatedAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>

            {/* Body */}
            <textarea
              ref={bodyRef}
              placeholder="Start writing..."
              value={draft.body}
              onChange={(e) => {
                updateDraft({ body: e.target.value })
                autoGrow(e.target)
              }}
              className="w-full bg-transparent text-white/80 text-base leading-relaxed placeholder-white/20 outline-none resize-none overflow-hidden"
              rows={1}
              style={{ minHeight: 100 }}
            />

            {/* Checklist */}
            <div className="mt-6">
              {draft.checklistItems.length > 0 && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold tracking-widest text-white/30 uppercase">Checklist</span>
                  {totalItems > 0 && (
                    <span className="text-xs text-white/25">{doneItems}/{totalItems} done</span>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                {draft.checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5 group">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => updateChecklistItem(item.id, { checked: e.target.checked })}
                      className="w-4 h-4 rounded shrink-0 cursor-pointer"
                      style={{ accentColor: 'rgba(255,255,255,0.5)' }}
                    />
                    <input
                      ref={(el) => {
                        if (el) checklistRefs.current.set(item.id, el)
                        else checklistRefs.current.delete(item.id)
                      }}
                      type="text"
                      value={item.text}
                      placeholder="List item"
                      onChange={(e) => updateChecklistItem(item.id, { text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addChecklistItem(item.id)
                        } else if (e.key === 'Backspace' && item.text === '') {
                          e.preventDefault()
                          deleteChecklistItem(item.id)
                        }
                      }}
                      className={`flex-1 bg-transparent text-sm outline-none placeholder-white/20 ${
                        item.checked ? 'text-white/30 line-through' : 'text-white/80'
                      }`}
                    />
                    <button
                      onClick={() => deleteChecklistItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-white/60 transition-opacity cursor-pointer text-base leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addChecklistItem()}
                className="mt-3 text-sm text-white/25 hover:text-white/50 transition-colors cursor-pointer flex items-center gap-2"
              >
                <span className="text-base leading-none">☐</span>
                <span>Add checklist item</span>
              </button>
            </div>

            {/* Project associations */}
            <div className="mt-10 pt-5 border-t border-white/10">
              <div className="text-xs font-bold tracking-widest text-white/25 uppercase mb-2.5">Projects</div>
              <div className="flex flex-wrap gap-1.5">
                {projects.map((p) => {
                  const linked = draft.projectIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        const ids = linked
                          ? draft.projectIds.filter((id) => id !== p.id)
                          : [...draft.projectIds, p.id]
                        updateDraft({ projectIds: ids })
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                        linked
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-white/35 hover:bg-white/10 hover:text-white/60'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Delete */}
            <div className="mt-8 pt-4 border-t border-white/10">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/50">Delete this note?</span>
                  <button
                    onClick={deleteNote}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors cursor-pointer font-medium"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-white/25 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Delete note
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
