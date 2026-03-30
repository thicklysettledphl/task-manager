import { useState, useEffect, useRef, useCallback } from 'react'
import type { Project } from '@/types'
import type { View, Workspace } from '@/App'
import AddProjectModal from './AddProjectModal'

interface Props {
  projects: Project[]
  currentView: View
  workspace: Workspace
  onNavigate: (v: View) => void
  onReload: () => void
  onSwitchWorkspace: (ws: Workspace) => void
}

export default function ProjectSidebar({ projects, currentView, workspace, onNavigate, onReload, onSwitchWorkspace }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartWidth = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartWidth.current = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width') || '260'
    )
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return
      const delta = e.clientX - dragStartX.current
      const newWidth = Math.min(400, Math.max(160, dragStartWidth.current + delta))
      document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`)
    }
    function onMouseUp() {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [searchInput, setSearchInput] = useState(
    currentView.type === 'search' ? currentView.query : ''
  )

  useEffect(() => {
    if (currentView.type !== 'search') setSearchInput('')
  }, [currentView.type])

  useEffect(() => {
    const q = searchInput.trim()
    if (!q) return
    const t = setTimeout(() => onNavigate({ type: 'search', query: q }), 350)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const isWork = workspace === 'work'
  const isTSP = workspace === 'tsp'

  // Work nav state
  const isHome = currentView.type === 'home'
  const isNotes = currentView.type === 'notes'
  const isArchive = currentView.type === 'archive'
  const isAdvising = currentView.type === 'advising'

  // TSP nav state
  const isTSPDash = currentView.type === 'tsp-dashboard'
  const isTSPTasks = currentView.type === 'tsp-tasks'
  const isTSPDates = currentView.type === 'tsp-dates'
  const isTSPInventory = currentView.type === 'tsp-inventory'
  const isTSPTransactions = currentView.type === 'tsp-transactions'

  function navClass(active: boolean) {
    return `mx-2 px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors cursor-pointer ${
      active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
    }`
  }

  return (
    <>
      <aside
        style={{ width: 'var(--sidebar-width)' }}
        className="shrink-0 border-r border-white/10 flex flex-col py-6 gap-1 h-screen sticky top-0 overflow-y-auto relative"
      >
        <div
          onMouseDown={onMouseDown}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-white/20 transition-colors z-10"
        />

        {/* Workspace switcher */}
        <div className="px-3 mb-2" style={{ paddingTop: 34 }}>
          <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5">
            <button
              onClick={() => onSwitchWorkspace('work')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                isWork ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              Work
            </button>
            <button
              onClick={() => onSwitchWorkspace('tsp')}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                isTSP ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              TSP
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 mb-3">
          <input
            type="text"
            placeholder="Search..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white/5 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:bg-white/10 transition-colors"
          />
        </div>

        {isWork && (
          <>
            <div className="px-4 mb-1">
              <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Projects</span>
            </div>

            <button onClick={() => onNavigate({ type: 'home' })} className={navClass(isHome)}>
              <span>All Tasks</span>
            </button>

            <button onClick={() => onNavigate({ type: 'notes' })} className={navClass(isNotes)}>
              <span>Notes</span>
            </button>

            <button onClick={() => onNavigate({ type: 'advising' })} className={navClass(isAdvising)}>
              <span>Advising</span>
            </button>

            <div className="my-2 border-t border-white/10" />

            {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
              const active = currentView.type === 'project' && currentView.slug === p.slug
              return (
                <div
                  key={p.id}
                  className={`group mx-2 px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-sm transition-colors cursor-pointer text-left ${
                    active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => onNavigate({ type: 'project', slug: p.slug })}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="truncate flex-1">{p.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingProject(p) }}
                    className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-opacity shrink-0 leading-none cursor-pointer"
                    title="Edit project"
                  >
                    ✎
                  </button>
                </div>
              )
            })}

            <div className="my-2 border-t border-white/10" />

            <button onClick={() => onNavigate({ type: 'archive' })} className={navClass(isArchive)}>
              <span>Archive</span>
            </button>

            <div className="mt-auto pt-4 px-2 flex flex-col gap-1">
              <button
                onClick={() => setShowAdd(true)}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left flex items-center gap-2"
              >
                <span className="text-base leading-none">+</span>
                <span>New Project</span>
              </button>
              <button
                onClick={() => window.api.exportData()}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left flex items-center gap-2"
              >
                <span className="text-base leading-none">↓</span>
                <span>Export Data</span>
              </button>
              <button
                onClick={() => window.api.exportCsv()}
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left flex items-center gap-2"
              >
                <span className="text-base leading-none">⬇</span>
                <span>Export CSV</span>
              </button>
            </div>
          </>
        )}

        {isTSP && (
          <>
            <div className="px-4 mb-1">
              <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Thickly Settled</span>
            </div>

            <button onClick={() => onNavigate({ type: 'tsp-dashboard' })} className={navClass(isTSPDash)}>
              <span>Dashboard</span>
            </button>

            <button onClick={() => onNavigate({ type: 'tsp-tasks' })} className={navClass(isTSPTasks)}>
              <span>Tasks</span>
            </button>

            <button onClick={() => onNavigate({ type: 'tsp-dates' })} className={navClass(isTSPDates)}>
              <span>Dates &amp; Events</span>
            </button>

            <div className="my-2 border-t border-white/10" />

            <div className="px-4 mb-1">
              <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Inventory</span>
            </div>

            <button onClick={() => onNavigate({ type: 'tsp-inventory' })} className={navClass(isTSPInventory)}>
              <span>Items</span>
            </button>

            <button onClick={() => onNavigate({ type: 'tsp-transactions' })} className={navClass(isTSPTransactions)}>
              <span>Transactions</span>
            </button>
          </>
        )}
      </aside>

      {showAdd && (
        <AddProjectModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); onReload() }}
        />
      )}
      {editingProject && (
        <AddProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSaved={() => { setEditingProject(null); onReload() }}
        />
      )}
    </>
  )
}
