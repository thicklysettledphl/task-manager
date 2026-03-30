import { useState, useEffect, useCallback } from 'react'
import type { TaskStore, DateEntry } from '@/types'
import type { View, Workspace } from '@/App'
import TSPSidebar from './TSPSidebar'
import DateModal from '@/components/DateModal'

interface Props {
  onNavigate: (v: View) => void
  onSwitchWorkspace: (ws: Workspace) => void
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]} ${parseInt(day)}, ${year}`
}

export default function TSPDatesPage({ onNavigate, onSwitchWorkspace }: Props) {
  const [store, setStore] = useState<TaskStore>({
    projects: [], tasks: [], dates: [], notes: [], students: [],
    tspProjects: [], tspTasks: [], tspDates: [], inventoryItems: [], transactions: [],
  })
  const [editDate, setEditDate] = useState<DateEntry | null | undefined>(undefined)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const tspProjects = store.tspProjects ?? []
  const tspDates = store.tspDates ?? []
  const projectsForModal = tspProjects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, color: p.color }))

  const today = new Date().toISOString().split('T')[0]
  const sorted = [...tspDates].sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = sorted.filter((d) => d.date >= today)
  const past = sorted.filter((d) => d.date < today).reverse()

  function getProjectsForDate(d: DateEntry) {
    return tspProjects.filter((p) => d.projectIds.includes(p.id))
  }

  function DateRow({ d }: { d: DateEntry }) {
    const projs = getProjectsForDate(d)
    const isPast = d.date < today
    return (
      <div
        onClick={() => setEditDate(d)}
        className={`px-5 py-3.5 flex items-center gap-4 border-b border-white/5 last:border-0 hover:bg-white/5 cursor-pointer transition-colors ${isPast ? 'opacity-50' : ''}`}
      >
        <span className="text-base leading-none text-white/40 shrink-0">◆</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate">{d.title}</div>
          {d.notes && <div className="text-xs text-white/40 truncate mt-0.5">{d.notes}</div>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {projs.map((p) => (
            <span key={p.id} className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          ))}
        </div>
        <span className="text-xs text-white/40 shrink-0 w-28 text-right">{formatDate(d.date)}</span>
        {d.repeat && <span className="text-xs text-white/30 shrink-0">↺ {d.repeat}</span>}
        {d.url && (
          <button
            onClick={(e) => { e.stopPropagation(); window.api.openUrl(d.url!) }}
            className="text-white/30 hover:text-white/70 transition-colors text-sm shrink-0 cursor-pointer"
          >
            ↗
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <TSPSidebar
        projects={tspProjects}
        currentView={{ type: 'tsp-dates' }}
        onNavigate={onNavigate}
        onReload={load}
        onSwitchWorkspace={onSwitchWorkspace}
      />

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <div className="sticky top-0 z-20 bg-[#0f0f11]/95 border-b border-white/10 px-6 py-4 flex items-center">
          <h1 className="text-base font-bold text-white">Dates &amp; Events</h1>
          <div className="ml-auto">
            <button
              onClick={() => setEditDate(null)}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
            >
              ◆ Add Date
            </button>
          </div>
        </div>

        <div className="px-6 py-6 flex flex-col gap-8">
          {tspDates.length === 0 && (
            <div className="py-20 text-center text-white/30 text-sm">
              No dates yet.{' '}
              <button onClick={() => setEditDate(null)} className="underline hover:text-white/50 cursor-pointer transition-colors">
                Add one
              </button>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">
                Upcoming · {upcoming.length}
              </div>
              <div className="border border-white/10 rounded-xl overflow-hidden">
                {upcoming.map((d) => <DateRow key={d.id} d={d} />)}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">
                Past · {past.length}
              </div>
              <div className="border border-white/10 rounded-xl overflow-hidden">
                {past.map((d) => <DateRow key={d.id} d={d} />)}
              </div>
            </div>
          )}
        </div>
      </main>

      {editDate !== undefined && (
        <DateModal
          entry={editDate}
          projects={projectsForModal}
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
