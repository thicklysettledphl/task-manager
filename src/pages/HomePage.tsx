import { useState, useEffect, useCallback } from 'react'
import type { Task, DateEntry, TaskStore } from '@/types'
import type { View } from '@/App'
import ProjectSidebar from '@/components/ProjectSidebar'
import FilterBar, { type FilterStatus } from '@/components/FilterBar'
import Timeline from '@/components/Timeline'
import TaskModal from '@/components/TaskModal'
import DateModal from '@/components/DateModal'
import ImportModal from '@/components/ImportModal'

interface Props {
  onNavigate: (v: View) => void
}

export default function HomePage({ onNavigate }: Props) {
  const [store, setStore] = useState<TaskStore>({ projects: [], tasks: [], dates: [] })
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined)
  const [editDate, setEditDate] = useState<DateEntry | null | undefined>(undefined)
  const [showImport, setShowImport] = useState(false)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredTasks = store.tasks.filter((t) => filter === 'all' || t.status === filter)

  return (
    <div className="flex min-h-screen">
      <ProjectSidebar
        projects={store.projects}
        tasks={store.tasks}
        currentView={{ type: 'home' }}
        onNavigate={onNavigate}
        onReload={load}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        <div className="sticky top-0 z-20 bg-[#0f0f11]/95 border-b border-white/10 px-6 py-4 flex items-center gap-3 flex-wrap">
          <FilterBar current={filter} onChange={setFilter} />
          <div className="ml-auto flex gap-2">
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
          </div>
        </div>

        <Timeline
          tasks={filteredTasks}
          dates={store.dates}
          projects={store.projects}
          onTaskClick={setEditTask}
          onDateClick={setEditDate}
        />
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
      {showImport && (
        <ImportModal projects={store.projects} onClose={() => setShowImport(false)} onSaved={load} />
      )}
    </div>
  )
}
