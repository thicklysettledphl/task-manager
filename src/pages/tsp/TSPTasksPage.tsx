import { useState, useEffect, useCallback } from 'react'
import type { TaskStore, Task } from '@/types'
import type { View, Workspace } from '@/App'
import TSPSidebar from './TSPSidebar'
import TaskModal from '@/components/TaskModal'

interface Props {
  onNavigate: (v: View) => void
  onSwitchWorkspace: (ws: Workspace) => void
}

const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}
const STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-white/10 text-white/70',
  'in-progress': 'bg-blue-500/25 text-blue-200',
  done: 'bg-green-500/25 text-green-200',
  blocked: 'bg-red-500/25 text-red-200',
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]} ${parseInt(day)}, ${year}`
}

type FilterStatus = 'all' | 'not-started' | 'in-progress' | 'done' | 'blocked'

export default function TSPTasksPage({ onNavigate, onSwitchWorkspace }: Props) {
  const [store, setStore] = useState<TaskStore>({
    projects: [], tasks: [], dates: [], notes: [], students: [],
    tspProjects: [], tspTasks: [], tspDates: [], inventoryItems: [], transactions: [],
  })
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const tspProjects = store.tspProjects ?? []
  const tspTasks = store.tspTasks ?? []
  const projectsForModal = tspProjects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, color: p.color }))

  const filtered = tspTasks.filter((t) => filter === 'all' || t.status === filter)

  // Group by project
  const grouped: { projectId: string | null; projectName: string; color: string; tasks: Task[] }[] = []
  const seenProjects = new Set<string>()

  for (const task of filtered) {
    const firstProjectId = task.projectIds[0] ?? null
    if (!seenProjects.has(firstProjectId ?? 'none')) {
      seenProjects.add(firstProjectId ?? 'none')
      const proj = firstProjectId ? tspProjects.find((p) => p.id === firstProjectId) : null
      grouped.push({
        projectId: firstProjectId,
        projectName: proj?.name ?? 'Unassigned',
        color: proj?.color ?? '#888',
        tasks: [],
      })
    }
    grouped.find((g) => g.projectId === firstProjectId)!.tasks.push(task)
  }

  return (
    <div className="flex min-h-screen">
      <TSPSidebar
        projects={tspProjects}
        currentView={{ type: 'tsp-tasks' }}
        onNavigate={onNavigate}
        onReload={load}
        onSwitchWorkspace={onSwitchWorkspace}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="sticky top-0 z-20 bg-[#0f0f11]/95 border-b border-white/10 px-6 py-4 flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex gap-1">
            {(['all', 'not-started', 'in-progress', 'blocked', 'done'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
                  filter === f ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {f === 'all' ? 'All' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setEditTask(null)}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
            >
              + Add Task
            </button>
          </div>
        </div>

        <div className="px-6 py-6 flex flex-col gap-6">
          {filtered.length === 0 && (
            <div className="py-20 text-center text-white/30 text-sm">
              No tasks{filter !== 'all' ? ` with status "${STATUS_LABELS[filter]}"` : ''}.{' '}
              <button onClick={() => setEditTask(null)} className="underline hover:text-white/50 cursor-pointer transition-colors">
                Add one
              </button>
            </div>
          )}

          {grouped.map(({ projectId, projectName, color, tasks }) => (
            <div key={projectId ?? 'none'}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs font-bold tracking-widest text-white/40 uppercase">{projectName}</span>
                <span className="text-xs text-white/25">· {tasks.length}</span>
              </div>
              <div className="border border-white/10 rounded-xl overflow-hidden">
                {[...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setEditTask(task)}
                    className="px-5 py-3 flex items-center gap-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[task.status]}`}>
                      {STATUS_LABELS[task.status]}
                    </span>
                    <span className={`flex-1 text-sm truncate ${task.status === 'done' ? 'line-through text-white/40' : 'text-white'}`}>
                      {task.title}
                    </span>
                    {task.subtasks && task.subtasks.length > 0 && (
                      <span className="text-xs text-white/30 shrink-0">
                        {task.subtasks.filter((s) => s.checked).length}/{task.subtasks.length}
                      </span>
                    )}
                    <span className="text-xs text-white/40 shrink-0">{formatDate(task.dueDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {editTask !== undefined && (
        <TaskModal
          task={editTask}
          projects={projectsForModal}
          onClose={() => setEditTask(undefined)}
          onSaved={load}
          createTask={window.api.createTSPTask}
          updateTask={window.api.updateTSPTask}
          deleteTask={window.api.deleteTSPTask}
        />
      )}
    </div>
  )
}
