import { useState, useEffect, useCallback } from 'react'
import type { Task, DateEntry, Note, TaskStore } from '@/types'
import type { View } from '@/App'
import ProjectSidebar from '@/components/ProjectSidebar'
import FilterBar, { type FilterStatus } from '@/components/FilterBar'
import Timeline from '@/components/Timeline'
import TaskModal from '@/components/TaskModal'
import DateModal from '@/components/DateModal'
import ImportModal from '@/components/ImportModal'

interface Props {
  slug: string
  onNavigate: (v: View) => void
}

export default function ProjectPage({ slug, onNavigate }: Props) {
  const [store, setStore] = useState<TaskStore>({ projects: [], tasks: [], dates: [], notes: [] })
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined)
  const [editDate, setEditDate] = useState<DateEntry | null | undefined>(undefined)
  const [showImport, setShowImport] = useState(false)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const project = store.projects.find((p) => p.slug === slug)
  const pid = project?.id ?? ''
  const q = search.toLowerCase()

  const filteredTasks = store.tasks.filter((t) => {
    if (!t.projectIds.includes(pid)) return false
    if (filter !== 'all' && filter !== 'notes' && t.status !== filter) return false
    if (q) return t.title.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q)
    return true
  })

  const filteredDates = store.dates.filter((d) => {
    if (!d.projectIds.includes(pid)) return false
    if (q) return d.title.toLowerCase().includes(q)
    return true
  })

  const projectNotes = (store.notes ?? []).filter((n) => {
    if (!n.projectIds.includes(pid)) return false
    if (q) return (
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      n.checklistItems.some((i) => i.text.toLowerCase().includes(q))
    )
    return true
  })

  async function handleNewNote() {
    const note = await window.api.createNote({
      title: '',
      body: '',
      checklistItems: [],
      projectIds: pid ? [pid] : [],
    })
    onNavigate({ type: 'notes', noteId: note.id })
  }

  function relativeDate(iso: string): string {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const taskCount = filter === 'notes' ? 0 : filteredTasks.length
  const dateCount = filter === 'notes' ? 0 : filteredDates.length

  return (
    <div className="flex min-h-screen">
      <ProjectSidebar
        projects={store.projects}
        currentView={{ type: 'project', slug }}
        onNavigate={onNavigate}
        onReload={load}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        <div className="sticky top-0 z-20 bg-[#0f0f11]/95 border-b border-white/10 px-6 py-4 flex items-center gap-3 flex-wrap">
          <FilterBar current={filter} onChange={setFilter} showNotes />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this project..."
            className="flex-1 min-w-32 bg-white/5 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:bg-white/10 transition-colors"
          />
          <div className="flex gap-2">
            {filter === 'notes' ? (
              <button
                onClick={handleNewNote}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
              >
                + New Note
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowImport(true)}
                  className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Import
                </button>
                <button
                  onClick={() => setEditDate(null)}
                  className="px-4 py-2 rounded-lg text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  ◆ Add Date
                </button>
                <button
                  onClick={() => setEditTask(null)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
                >
                  + Add Task
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
          {project && <span className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color }} />}
          <h1 className="text-lg font-bold text-white">{project?.name ?? slug}</h1>
          {project?.url && (
            <button
              onClick={() => window.api.openUrl(project.url!)}
              className="text-sm text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              title={project.url}
            >
              ↗
            </button>
          )}
          {filter !== 'notes' && (
            <span className="text-sm text-white/50">
              {taskCount} task{taskCount !== 1 ? 's' : ''}
              {dateCount > 0 ? `, ${dateCount} date${dateCount !== 1 ? 's' : ''}` : ''}
            </span>
          )}
          {filter === 'notes' && (
            <span className="text-sm text-white/50">
              {projectNotes.length} note{projectNotes.length !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => onNavigate({ type: 'home' })}
            className="ml-auto text-sm text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            ← All Tasks
          </button>
        </div>

        {filter === 'notes' ? (
          <div className="px-6 py-6">
            {projectNotes.length === 0 ? (
              <div className="py-16 text-center text-white/25 text-sm">
                No notes for this project yet.{' '}
                <button onClick={handleNewNote} className="underline hover:text-white/50 transition-colors cursor-pointer">
                  Create one
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {projectNotes
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .map((note: Note) => {
                    const preview = note.body.split('\n').find((l) => l.trim())
                      || note.checklistItems.find((i) => i.text)?.text
                      || ''
                    return (
                      <button
                        key={note.id}
                        onClick={() => onNavigate({ type: 'notes', noteId: note.id })}
                        className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-left"
                      >
                        <div className="text-sm font-medium text-white mb-1 truncate">
                          {note.title || 'Untitled Note'}
                        </div>
                        <div className="text-xs text-white/40 truncate mb-2">{preview || 'No text'}</div>
                        <div className="text-xs text-white/25">{relativeDate(note.updatedAt)}</div>
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        ) : (
          <Timeline
            tasks={filteredTasks}
            dates={filteredDates}
            projects={store.projects}
            onTaskClick={setEditTask}
            onDateClick={setEditDate}
            onReload={load}
          />
        )}
      </main>

      {editTask !== undefined && (
        <TaskModal
          task={editTask}
          projects={store.projects}
          defaultProjectIds={project ? [project.id] : undefined}
          onClose={() => setEditTask(undefined)}
          onSaved={load}
        />
      )}
      {editDate !== undefined && (
        <DateModal
          entry={editDate}
          projects={store.projects}
          defaultProjectIds={project ? [project.id] : undefined}
          onClose={() => setEditDate(undefined)}
          onSaved={load}
        />
      )}
      {showImport && (
        <ImportModal projects={store.projects} onClose={() => setShowImport(false)} onSaved={load} />
      )}
    </div>
  )
}
