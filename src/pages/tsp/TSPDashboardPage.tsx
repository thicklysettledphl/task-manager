import { useState, useEffect, useCallback } from 'react'
import type { Task, DateEntry, TaskStore } from '@/types'
import type { View, Workspace } from '@/App'
import TSPSidebar from './TSPSidebar'
import Timeline from '@/components/Timeline'
import TaskModal from '@/components/TaskModal'
import DateModal from '@/components/DateModal'
import FilterBar, { type FilterStatus } from '@/components/FilterBar'

interface Props {
  onNavigate: (v: View) => void
  onSwitchWorkspace: (ws: Workspace) => void
}

export default function TSPDashboardPage({ onNavigate, onSwitchWorkspace }: Props) {
  const [store, setStore] = useState<TaskStore>({
    projects: [], tasks: [], dates: [], notes: [], students: [],
    tspProjects: [], tspTasks: [], tspDates: [], tspNotes: [], tspExpenses: [], inventoryItems: [], transactions: [],
  })
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined)
  const [editDate, setEditDate] = useState<DateEntry | null | undefined>(undefined)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const tspProjects = store.tspProjects ?? []
  const allTspTasks = store.tspTasks ?? []
  const allTspDates = store.tspDates ?? []
  const tspTasks = allTspTasks.filter((t) => filter === 'all' || t.status === filter)
  const tspDates = filter === 'all' ? allTspDates : []

  // Map TSPProjects to the Project shape Timeline expects
  const projectsForTimeline = tspProjects.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    color: p.color,
  }))

  return (
    <div className="flex min-h-screen">
      <TSPSidebar
        projects={tspProjects}
        currentView={{ type: 'tsp-dashboard' }}
        onNavigate={onNavigate}
        onReload={load}
        onSwitchWorkspace={onSwitchWorkspace}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        <div className="sticky top-0 z-20 bg-[#0f0f11]/95 border-b border-white/10 px-6 py-4 flex items-center gap-3 flex-wrap">
          <FilterBar current={filter} onChange={setFilter} />
          <div className="ml-auto flex gap-2">
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
          </div>
        </div>

        <Timeline
          tasks={tspTasks}
          dates={tspDates}
          projects={projectsForTimeline}
          onTaskClick={setEditTask}
          onDateClick={setEditDate}
          onReload={load}
          updateTask={window.api.updateTSPTask}
        />
      </main>

      {editTask !== undefined && (
        <TaskModal
          task={editTask}
          projects={projectsForTimeline}
          onClose={() => setEditTask(undefined)}
          onSaved={load}
          createTask={window.api.createTSPTask}
          updateTask={window.api.updateTSPTask}
          deleteTask={window.api.deleteTSPTask}
        />
      )}
      {editDate !== undefined && (
        <DateModal
          entry={editDate}
          projects={projectsForTimeline}
          onClose={() => setEditDate(undefined)}
          onSaved={load}
          createDate={window.api.createTSPDate}
          updateDate={window.api.updateTSPDate}
          deleteDate={window.api.deleteTSPDate}
        />
      )}
    </div>
  )
}
