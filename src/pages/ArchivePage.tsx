import { useState, useEffect, useCallback } from 'react'
import type { Task, TaskStore } from '@/types'
import type { View } from '@/App'
import ProjectSidebar from '@/components/ProjectSidebar'
import TaskModal from '@/components/TaskModal'
import { formatDate } from '@/lib/utils'

interface Props {
  onNavigate: (v: View) => void
}

const STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-white/10 text-white',
  'in-progress': 'bg-blue-500/25 text-blue-200',
  done: 'bg-green-500/25 text-green-200',
  blocked: 'bg-red-500/25 text-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}

export default function ArchivePage({ onNavigate }: Props) {
  const [store, setStore] = useState<TaskStore>({ projects: [], tasks: [], dates: [], notes: [] })
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const doneTasks = store.tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))

  // Group by first project (or "Unassigned")
  const groups: { label: string; color: string; tasks: Task[] }[] = []
  const seen = new Set<string>()

  for (const task of doneTasks) {
    const proj = store.projects.find((p) => task.projectIds.includes(p.id))
    const key = proj?.id ?? '__none__'
    if (!seen.has(key)) {
      seen.add(key)
      groups.push({
        label: proj?.name ?? 'Unassigned',
        color: proj?.color ?? 'rgba(255,255,255,0.2)',
        tasks: [],
      })
    }
    groups.find((g) => g.label === (proj?.name ?? 'Unassigned'))!.tasks.push(task)
  }

  return (
    <div className="flex min-h-screen">
      <ProjectSidebar
        projects={store.projects}
        currentView={{ type: 'archive' }}
        onNavigate={onNavigate}
        onReload={load}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="px-6 border-b border-white/10" style={{ paddingTop: 44, paddingBottom: 20 }}>
          <h1 className="text-lg font-bold text-white">
            Archive
            <span className="ml-3 text-sm font-normal text-white/40">{doneTasks.length} completed task{doneTasks.length !== 1 ? 's' : ''}</span>
          </h1>
        </div>

        {doneTasks.length === 0 ? (
          <div className="py-24 text-center text-white/25 text-sm">
            No completed tasks yet.
          </div>
        ) : (
          <div className="px-6 py-6 flex flex-col gap-8">
            {groups.map((group) => (
              <section key={group.label}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: group.color }} />
                  <span className="text-xs font-bold tracking-widest text-white/40 uppercase">{group.label}</span>
                  <span className="text-xs text-white/25">{group.tasks.length}</span>
                </div>
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  {group.tasks.map((task) => {
                    const projs = store.projects.filter((p) => task.projectIds.includes(p.id))
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
                        <span className="flex-1 text-sm line-through text-white/40 truncate">
                          {task.title}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span className="ml-2 no-underline not-italic text-white/25 text-xs">
                              {task.subtasks.filter((s) => s.checked).length}/{task.subtasks.length}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-white/30 shrink-0">{formatDate(task.dueDate)}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[task.status]}`}>
                          {STATUS_LABELS[task.status] ?? task.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {editTask !== undefined && (
        <TaskModal
          task={editTask}
          projects={store.projects}
          onClose={() => setEditTask(undefined)}
          onSaved={load}
        />
      )}
    </div>
  )
}
