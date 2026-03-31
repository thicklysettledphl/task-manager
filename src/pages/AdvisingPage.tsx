import { useState, useEffect, useCallback } from 'react'
import type { Student, StudentWorksheet, Project, AdvisingNote } from '@/types'
import type { View, Workspace } from '@/App'
import ProjectSidebar from '@/components/ProjectSidebar'
import { DEGREES, getDegree, totalSlots, type DegreeDefinition } from '@/data/degrees'

interface Props {
  onNavigate: (v: View) => void
  onSwitchWorkspace?: (ws: Workspace) => void
}

// Ensure every worksheet has an instance ID (handles data created before this field existed)
function normalizeWorksheets(student: Student): Student {
  return {
    ...student,
    worksheets: student.worksheets.map((ws, i) => ({
      ...ws,
      id: ws.id ?? `${ws.degreeId}-${i}`,
    })),
  }
}

export default function AdvisingPage({ onNavigate, onSwitchWorkspace }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Editable field local state — synced when selectedId changes
  const [nameField, setNameField] = useState('')
  const [pennIdField, setPennIdField] = useState('')
  const [gradYearField, setGradYearField] = useState('')
  const [newNoteText, setNewNoteText] = useState('')

  // Course name inputs for flexible slots — keyed by "worksheetId:slotId"
  const [courseInputs, setCourseInputs] = useState<Record<string, string>>({})

  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showAddDegree, setShowAddDegree] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  const load = useCallback(async () => {
    const store = await window.api.getTasks()
    setStudents((store.students ?? []).map(normalizeWorksheets))
    setProjects(store.projects)
  }, [])

  useEffect(() => { load() }, [load])

  const selected = students.find((s) => s.id === selectedId) ?? null

  // Sync form fields when the selected student changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const s = students.find((s) => s.id === selectedId)
    if (!s) {
      setNameField(''); setPennIdField(''); setGradYearField(''); setNewNoteText('')
      setCourseInputs({})
      return
    }
    setNameField(s.name)
    setPennIdField(s.pennId ?? '')
    setGradYearField(s.graduationYear ?? '')
    setNewNoteText('')
    const inputs: Record<string, string> = {}
    s.worksheets.forEach((ws) =>
      ws.entries.forEach((e) => {
        if (e.courseName) inputs[`${ws.id}:${e.slotId}`] = e.courseName
      })
    )
    setCourseInputs(inputs)
  }, [selectedId]) // intentionally omits `students` to avoid resetting while typing

  // ── API helpers ──────────────────────────────────────────────────────────

  async function saveStudent(updated: Student) {
    const saved = await window.api.updateStudent(updated.id, updated)
    setStudents((prev) => prev.map((s) => (s.id === saved.id ? normalizeWorksheets(saved) : s)))
  }

  async function createStudent() {
    const student = await window.api.createStudent({ name: 'New Student', worksheets: [] })
    setStudents((prev) => [...prev, normalizeWorksheets(student)])
    setSelectedId(student.id)
    setConfirmDelete(false)
  }

  async function deleteStudent() {
    if (!selected) return
    await window.api.deleteStudent(selected.id)
    setStudents((prev) => prev.filter((s) => s.id !== selected.id))
    setSelectedId(null)
    setConfirmDelete(false)
  }

  // ── Field save (on blur — name/id/year only) ─────────────────────────────

  function saveFields() {
    if (!selected) return
    saveStudent({
      ...selected,
      name: nameField.trim() || 'New Student',
      pennId: pennIdField.trim() || undefined,
      graduationYear: gradYearField.trim() || undefined,
      updatedAt: new Date().toISOString(),
    })
  }

  // ── Save a new timestamped advising note ─────────────────────────────────

  function saveNewNote() {
    if (!selected || !newNoteText.trim()) return
    const entry: AdvisingNote = {
      id: crypto.randomUUID(),
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
    }
    saveStudent({
      ...selected,
      advisingNotes: [entry, ...(selected.advisingNotes ?? [])],
      updatedAt: new Date().toISOString(),
    })
    setNewNoteText('')
  }

  function deleteNote(noteId: string) {
    if (!selected) return
    saveStudent({
      ...selected,
      advisingNotes: (selected.advisingNotes ?? []).filter((n) => n.id !== noteId),
      updatedAt: new Date().toISOString(),
    })
  }

  // ── Worksheet helpers ────────────────────────────────────────────────────

  function getEntry(ws: StudentWorksheet, slotId: string) {
    return ws.entries.find((e) => e.slotId === slotId)
  }

  function toggleSlot(wsId: string, slotId: string) {
    if (!selected) return
    const ws = selected.worksheets.find((w) => w.id === wsId)
    if (!ws) return
    const existing = getEntry(ws, slotId)
    const newEntries = existing
      ? ws.entries.map((e) => (e.slotId === slotId ? { ...e, completed: !e.completed } : e))
      : [...ws.entries, { slotId, completed: true }]
    saveStudent({
      ...selected,
      worksheets: selected.worksheets.map((w) => (w.id === wsId ? { ...w, entries: newEntries } : w)),
      updatedAt: new Date().toISOString(),
    })
  }

  function saveCourseName(wsId: string, slotId: string) {
    if (!selected) return
    const key = `${wsId}:${slotId}`
    const courseName = courseInputs[key]?.trim() || undefined
    const ws = selected.worksheets.find((w) => w.id === wsId)
    if (!ws) return
    const existing = getEntry(ws, slotId)
    const newEntries = existing
      ? ws.entries.map((e) => (e.slotId === slotId ? { ...e, courseName } : e))
      : [...ws.entries, { slotId, completed: false, courseName }]
    saveStudent({
      ...selected,
      worksheets: selected.worksheets.map((w) => (w.id === wsId ? { ...w, entries: newEntries } : w)),
      updatedAt: new Date().toISOString(),
    })
  }

  function addWorksheet(degreeId: string) {
    if (!selected) return
    const wsId = crypto.randomUUID()
    saveStudent({
      ...selected,
      worksheets: [...selected.worksheets, { id: wsId, degreeId, entries: [] }],
      updatedAt: new Date().toISOString(),
    })
    setShowAddDegree(false)
  }

  function removeWorksheet(wsId: string) {
    if (!selected) return
    saveStudent({
      ...selected,
      worksheets: selected.worksheets.filter((w) => w.id !== wsId),
      updatedAt: new Date().toISOString(),
    })
  }

  // ── Progress helpers ─────────────────────────────────────────────────────

  function wsProgress(ws: StudentWorksheet, degree: DegreeDefinition) {
    const total = totalSlots(degree)
    const done = degree.categories.reduce(
      (sum, cat) => sum + cat.slots.filter((slot) => getEntry(ws, slot.id)?.completed).length,
      0
    )
    return { done, total }
  }

  function studentSummary(student: Student) {
    if (student.worksheets.length === 0) return null
    let done = 0, total = 0
    student.worksheets.forEach((ws) => {
      const degree = getDegree(ws.degreeId)
      if (!degree) return
      const p = wsProgress(ws, degree)
      done += p.done
      total += p.total
    })
    return { done, total }
  }

  // Count how many times a degree already appears on the selected student
  function degreeCount(degreeId: string) {
    return selected?.worksheets.filter((w) => w.degreeId === degreeId).length ?? 0
  }

  const filteredStudents = search.trim()
    ? students.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.pennId ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (s.graduationYear ?? '').includes(search)
      )
    : students

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden">
      {!focusMode && (
        <ProjectSidebar
          projects={projects}
          currentView={{ type: 'advising' }}
          workspace="work"
          onNavigate={onNavigate}
          onReload={load}
          onSwitchWorkspace={onSwitchWorkspace ?? (() => {})}
        />
      )}

      {/* Student list panel */}
      {!focusMode && <div className="w-64 shrink-0 border-r border-white/10 flex flex-col h-screen">
        <div
          style={{ paddingTop: 36 }}
          className="px-4 pb-3 border-b border-white/10 flex items-center justify-between"
        >
          <span className="text-sm font-bold tracking-widest text-white/50 uppercase">Students</span>
          <button
            onClick={createStudent}
            className="w-7 h-7 flex items-center justify-center rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-xl leading-none"
            title="New student"
          >
            +
          </button>
        </div>

        <div className="px-3 py-2 border-b border-white/10">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full bg-white/5 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:bg-white/10 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {students.length === 0 && (
            <p className="text-white/30 text-sm px-4 py-4">No students yet. Click + to add one.</p>
          )}
          {students.length > 0 && filteredStudents.length === 0 && (
            <p className="text-white/30 text-sm px-4 py-4">No matches.</p>
          )}
          {filteredStudents.map((student) => {
            const summary = studentSummary(student)
            const active = student.id === selectedId
            return (
              <button
                key={student.id}
                onClick={() => { setSelectedId(student.id); setConfirmDelete(false) }}
                className={`w-full px-4 py-3 text-left transition-colors cursor-pointer border-b border-white/5 ${
                  active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="text-sm font-medium truncate">{student.name}</div>
                <div className="text-xs text-white/40 mt-0.5 flex gap-2">
                  {student.graduationYear && <span>Class of {student.graduationYear}</span>}
                  {summary && <span>{summary.done}/{summary.total} complete</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>}

      {/* Worksheet area */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-white/25 text-sm">Select a student or click + to create one</p>
          </div>
        ) : (
          <div className={`px-8 py-8 ${focusMode ? 'max-w-3xl mx-auto' : 'max-w-2xl'}`}>

            {/* Student header */}
            <div className="flex items-start gap-4 mb-5" style={{ paddingTop: focusMode ? 48 : 28 }}>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <input
                  value={nameField}
                  onChange={(e) => setNameField(e.target.value)}
                  onBlur={saveFields}
                  placeholder="Student name..."
                  className={`font-bold text-white bg-transparent outline-none border-b border-transparent hover:border-white/20 focus:border-white/40 transition-colors w-full ${focusMode ? 'text-3xl' : 'text-2xl'}`}
                />
                <div className="flex gap-4">
                  <input
                    value={pennIdField}
                    onChange={(e) => setPennIdField(e.target.value)}
                    onBlur={saveFields}
                    placeholder="Penn ID..."
                    className="text-sm text-white/60 bg-transparent outline-none border-b border-transparent hover:border-white/20 focus:border-white/40 transition-colors w-32 shrink-0"
                  />
                  <input
                    value={gradYearField}
                    onChange={(e) => setGradYearField(e.target.value)}
                    onBlur={saveFields}
                    placeholder="Grad year..."
                    className="text-sm text-white/60 bg-transparent outline-none border-b border-transparent hover:border-white/20 focus:border-white/40 transition-colors w-24 shrink-0"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-1">
                <button
                  onClick={() => { setFocusMode((f) => !f); setConfirmDelete(false) }}
                  title={focusMode ? 'Exit focus mode' : 'Focus mode'}
                  className="text-sm text-white/35 hover:text-white transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-white/8 border border-white/10 hover:border-white/25"
                >
                  {focusMode ? '← Exit Focus' : '⊙ Focus'}
                </button>
                {!focusMode && (
                  confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/50">Delete?</span>
                      <button onClick={deleteStudent} className="text-sm text-red-400 hover:text-red-300 cursor-pointer">Yes</button>
                      <button onClick={() => setConfirmDelete(false)} className="text-sm text-white/50 hover:text-white cursor-pointer">No</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="text-white/25 hover:text-red-400 transition-colors cursor-pointer text-base"
                      title="Delete student"
                    >
                      ✕
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Advising notes */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Advising Notes</span>
                <a
                  href="https://courses.upenn.edu/"
                  onClick={(e) => { e.preventDefault(); window.api.openUrl('https://courses.upenn.edu/') }}
                  className="text-xs text-white/35 hover:text-white/70 transition-colors cursor-pointer"
                >
                  Add to student file ↗
                </a>
              </div>

              {/* Compose area */}
              <div className="flex flex-col gap-2 mb-4">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNewNote() }
                  }}
                  placeholder="Type a note… ⌘↵ to save"
                  rows={3}
                  className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/25 outline-none focus:bg-white/8 transition-colors resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={saveNewNote}
                    disabled={!newNoteText.trim()}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
                  >
                    Save Note
                  </button>
                </div>
              </div>

              {/* Note log */}
              {(selected.advisingNotes ?? []).length > 0 && (
                <div className="flex flex-col gap-2">
                  {(selected.advisingNotes ?? []).map((note) => {
                    const d = new Date(note.createdAt)
                    const stamp = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                      + ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                    return (
                      <div key={note.id} className="group bg-white/5 rounded-lg px-3 py-2.5 flex gap-2 items-start">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white/35 mb-1">{stamp}</div>
                          <div className="text-sm text-white/75 whitespace-pre-wrap leading-relaxed">{note.text}</div>
                        </div>
                        {!focusMode && (
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-all cursor-pointer shrink-0 text-base leading-none mt-0.5"
                            title="Delete note"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Degree worksheets */}
            {selected.worksheets.length === 0 && (
              <p className="text-white/30 text-sm mb-6">No degree worksheets yet. Add one below.</p>
            )}

            {selected.worksheets.map((ws) => {
              const degree = getDegree(ws.degreeId)
              if (!degree) return null
              const { done, total } = wsProgress(ws, degree)
              const pct = total > 0 ? (done / total) * 100 : 0
              const dupeCount = degreeCount(ws.degreeId)

              return (
                <div key={ws.id} className="mb-10">
                  {/* Degree header */}
                  <div className="flex items-center gap-3 mb-5">
                    <h2 className="text-base font-bold text-white">
                      {degree.name}
                      {dupeCount > 1 && (
                        <span className="ml-2 text-xs font-normal text-white/30">#{selected.worksheets.filter((w) => w.degreeId === ws.degreeId).indexOf(ws) + 1}</span>
                      )}
                    </h2>
                    <span className="text-sm text-white/40">{done}/{total}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/50 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <a
                      href="https://degreeworks-prod-j.isc-seo.upenn.edu:9904/"
                      onClick={(e) => { e.preventDefault(); window.api.openUrl('https://degreeworks-prod-j.isc-seo.upenn.edu:9904/') }}
                      className="text-xs text-white/35 hover:text-white/70 transition-colors cursor-pointer mr-1"
                      title="Open DegreeWorks"
                    >
                      DegreeWorks ↗
                    </a>
                    <button
                      onClick={() => removeWorksheet(ws.id)}
                      className="text-white/20 hover:text-white/50 transition-colors cursor-pointer text-xs"
                      title="Remove this worksheet"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Categories */}
                  {degree.categories.map((cat) => {
                    const catDone = cat.slots.filter((slot) => getEntry(ws, slot.id)?.completed).length
                    return (
                      <div key={cat.id} className="mb-5">
                        <div className="flex items-center gap-2 mb-1.5 px-2">
                          <span className="text-xs font-bold uppercase tracking-widest text-white/35">
                            {cat.name}
                          </span>
                          <span className="text-xs text-white/25">{catDone}/{cat.slots.length}</span>
                        </div>

                        <div className="flex flex-col">
                          {cat.slots.map((slot) => {
                            const entry = getEntry(ws, slot.id)
                            const completed = entry?.completed ?? false
                            const inputKey = `${ws.id}:${slot.id}`

                            return (
                              <div
                                key={slot.id}
                                className={`flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors ${completed ? 'opacity-40' : ''}`}
                              >
                                <button
                                  onClick={() => toggleSlot(ws.id, slot.id)}
                                  className={`w-4 h-4 rounded shrink-0 border transition-colors cursor-pointer flex items-center justify-center ${
                                    completed
                                      ? 'bg-white/70 border-white/70'
                                      : 'border-white/30 hover:border-white/60'
                                  }`}
                                >
                                  {completed && (
                                    <span className="text-[9px] text-black font-bold leading-none">✓</span>
                                  )}
                                </button>

                                {slot.flexible ? (
                                  <input
                                    value={courseInputs[inputKey] ?? ''}
                                    onChange={(e) =>
                                      setCourseInputs((prev) => ({ ...prev, [inputKey]: e.target.value }))
                                    }
                                    onBlur={() => saveCourseName(ws.id, slot.id)}
                                    placeholder={slot.label + '...'}
                                    className={`flex-1 bg-transparent text-sm outline-none text-white/75 placeholder-white/20 ${
                                      completed ? 'line-through' : ''
                                    }`}
                                  />
                                ) : (
                                  <span className={`text-sm flex items-center gap-2 ${completed ? 'line-through' : ''}`}>
                                    {slot.courseCode && (
                                      <span className="font-mono text-xs text-white/40">{slot.courseCode}</span>
                                    )}
                                    <span className="text-white/80">{slot.label}</span>
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Add degree worksheet — all degrees always available */}
            <div className="mt-2">
              {showAddDegree ? (
                <div className="flex flex-wrap gap-2 items-center">
                  {DEGREES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => addWorksheet(d.id)}
                      className="px-3 py-1.5 rounded-lg text-sm text-white/70 bg-white/5 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      + {d.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowAddDegree(false)}
                    className="text-sm text-white/30 hover:text-white transition-colors cursor-pointer px-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddDegree(true)}
                  className="text-sm text-white/35 hover:text-white/70 transition-colors cursor-pointer"
                >
                  + Add degree worksheet
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
