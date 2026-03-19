import { useState, useEffect, useCallback } from 'react'
import type { Task, DateEntry, Note, Project, TaskStore } from '@/types'
import type { View } from '@/App'
import ProjectSidebar from '@/components/ProjectSidebar'
import TaskModal from '@/components/TaskModal'
import DateModal from '@/components/DateModal'
import { formatDate } from '@/lib/utils'

interface Props {
  query: string
  onNavigate: (v: View) => void
}

const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}

export default function SearchPage({ query, onNavigate }: Props) {
  const [store, setStore] = useState<TaskStore>({ projects: [], tasks: [], dates: [], notes: [] })
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined)
  const [editDate, setEditDate] = useState<DateEntry | null | undefined>(undefined)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const q = query.toLowerCase()

  const matchingTasks = store.tasks.filter((t) =>
    t.title.toLowerCase().includes(q) ||
    (t.notes ?? '').toLowerCase().includes(q) ||
    (t.url ?? '').toLowerCase().includes(q)
  )

  const matchingDates = store.dates.filter((d) =>
    d.title.toLowerCase().includes(q) ||
    (d.notes ?? '').toLowerCase().includes(q)
  )

  const matchingNotes = (store.notes ?? []).filter((n) =>
    n.title.toLowerCase().includes(q) ||
    n.body.toLowerCase().includes(q) ||
    n.checklistItems.some((i) => i.text.toLowerCase().includes(q))
  )

  const total = matchingTasks.length + matchingDates.length + matchingNotes.length

  function getTaskProjects(task: Task): Project[] {
    return store.projects.filter((p) => task.projectIds.includes(p.id))
  }

  function getNoteProjects(note: Note): Project[] {
    return store.projects.filter((p) => note.projectIds.includes(p.id))
  }

  return (
    <div className="flex min-h-screen">
      <ProjectSidebar
        projects={store.projects}
        currentView={{ type: 'search', query }}
        onNavigate={onNavigate}
        onReload={load}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="px-6 border-b border-white/10" style={{ paddingTop: 44, paddingBottom: 20 }}>
          <h1 className="text-lg font-bold text-white">
            {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </h1>
        </div>

        <div className="px-6 py-6 flex flex-col gap-8">
          {total === 0 && (
            <div className="py-16 text-center text-white/30 text-sm">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {/* Tasks */}
          {matchingTasks.length > 0 && (
            <section>
              <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">
                Tasks · {matchingTasks.length}
              </div>
              <div className="border border-white/10 rounded-xl overflow-hidden">
                {matchingTasks.map((task) => {
                  const projs = getTaskProjects(task)
                  return (
                    <div
                      key={task.id}
                      onClick={() => setEditTask(task)}
                      className="px-5 py-3 flex items-center gap-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex gap-1 shrink-0">
                        {projs.slice(0, 3).map((p) => (
                          <span key={p.id} className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        ))}
                        {projs.length === 0 && <span className="w-2.5 h-2.5 rounded-full bg-white/20" />}
                      </div>
                      <span className="text-sm text-white/50 w-40 shrink-0 truncate">
                        {projs[0]?.name ?? '—'}
                      </span>
                      <span className={`flex-1 text-sm truncate ${task.status === 'done' ? 'line-through text-white/40' : 'text-white'}`}>
                        {task.title}
                      </span>
                      <span className="text-xs text-white/40 shrink-0">{formatDate(task.dueDate)}</span>
                      <span className="text-xs text-white/40 shrink-0 w-24 text-right">{STATUS_LABELS[task.status] ?? task.status}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Dates */}
          {matchingDates.length > 0 && (
            <section>
              <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">
                Dates · {matchingDates.length}
              </div>
              <div className="border border-white/10 rounded-xl overflow-hidden">
                {matchingDates.map((date) => (
                  <div
                    key={date.id}
                    onClick={() => setEditDate(date)}
                    className="px-5 py-3 flex items-center gap-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <span className="text-base leading-none shrink-0 text-white/50">◆</span>
                    <span className="flex-1 text-sm text-white truncate">{date.title}</span>
                    <span className="text-xs text-white/40 shrink-0">{formatDate(date.date)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          {matchingNotes.length > 0 && (
            <section>
              <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">
                Notes · {matchingNotes.length}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {matchingNotes.map((note) => {
                  const projs = getNoteProjects(note)
                  const preview = note.body.split('\n').find((l) => l.trim())
                    || note.checklistItems.find((i) => i.text)?.text
                    || ''
                  return (
                    <button
                      key={note.id}
                      onClick={() => onNavigate({ type: 'notes', noteId: note.id })}
                      className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-left"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {projs.map((p) => (
                          <span key={p.id} className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        ))}
                      </div>
                      <div className="text-sm font-medium text-white mb-1 truncate">
                        {note.title || 'Untitled Note'}
                      </div>
                      <div className="text-xs text-white/40 truncate">{preview || 'No text'}</div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      {editTask !== undefined && (
        <TaskModal
          task={editTask}
          projects={store.projects}
          onClose={() => setEditTask(undefined)}
          onSaved={load}
        />
      )}
      {editDate !== undefined && (
        <DateModal
          entry={editDate}
          projects={store.projects}
          onClose={() => setEditDate(undefined)}
          onSaved={load}
        />
      )}
    </div>
  )
}
