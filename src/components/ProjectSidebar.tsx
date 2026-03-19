import { useState, useEffect } from 'react'
import type { Project, Task } from '@/types'
import type { View } from '@/App'
import AddProjectModal from './AddProjectModal'

interface Props {
  projects: Project[]
  tasks: Task[]
  currentView: View
  onNavigate: (v: View) => void
  onReload: () => void
}

export default function ProjectSidebar({ projects, tasks, currentView, onNavigate, onReload }: Props) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [searchInput, setSearchInput] = useState(
    currentView.type === 'search' ? currentView.query : ''
  )

  // Clear search input when navigating away from search
  useEffect(() => {
    if (currentView.type !== 'search') setSearchInput('')
  }, [currentView.type])

  // Debounced navigate to search
  useEffect(() => {
    const q = searchInput.trim()
    if (!q) return
    const t = setTimeout(() => onNavigate({ type: 'search', query: q }), 350)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  function countFor(projectId: string) {
    return tasks.filter((t) => t.projectIds.includes(projectId) && t.status !== 'done').length
  }
  const allActive = tasks.filter((t) => t.status !== 'done').length
  const isHome = currentView.type === 'home'
  const isNotes = currentView.type === 'notes'
  const isArchive = currentView.type === 'archive'

  return (
    <>
      <aside
        style={{ width: 'var(--sidebar-width)' }}
        className="shrink-0 border-r border-white/10 flex flex-col py-6 gap-1 h-screen sticky top-0 overflow-y-auto"
      >
        <div className="px-3 mb-3" style={{ paddingTop: 34 }}>
          <input
            type="text"
            placeholder="Search everything..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white/5 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:bg-white/10 transition-colors"
          />
        </div>

        <div className="px-4 mb-1">
          <span className="text-sm font-bold tracking-widest text-white/50 uppercase">Projects</span>
        </div>

        <button
          onClick={() => onNavigate({ type: 'home' })}
          className={`mx-2 px-3 py-2.5 rounded-lg flex items-center justify-between text-sm transition-colors cursor-pointer ${
            isHome ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>All Tasks</span>
          {allActive > 0 && (
            <span className="text-sm bg-white/15 rounded-full px-2 py-0.5">{allActive}</span>
          )}
        </button>

        <button
          onClick={() => onNavigate({ type: 'notes' })}
          className={`mx-2 px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors cursor-pointer ${
            isNotes ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Notes</span>
        </button>

        <div className="my-2 border-t border-white/10" />

        {projects.map((p) => {
          const count = countFor(p.id)
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
              {count > 0 && (
                <span className="text-sm bg-white/15 rounded-full px-2 py-0.5 shrink-0">{count}</span>
              )}
            </div>
          )
        })}

        <div className="my-2 border-t border-white/10" />

        <button
          onClick={() => onNavigate({ type: 'archive' })}
          className={`mx-2 px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors cursor-pointer ${
            isArchive ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
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
