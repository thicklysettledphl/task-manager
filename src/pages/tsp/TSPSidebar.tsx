import { useState, useEffect, useRef, useCallback } from 'react'
import type { View, Workspace } from '@/App'
import type { TSPProject, PipelineStage } from '@/types'

interface Props {
  projects: TSPProject[]
  currentView: View
  onNavigate: (v: View) => void
  onReload: () => void
  onSwitchWorkspace: (ws: Workspace) => void
}

const DEFAULT_STAGES: Omit<PipelineStage, 'id'>[] = [
  { name: 'Concept', order: 0 },
  { name: 'Content Collection', order: 1 },
  { name: 'Digital Layout', order: 2 },
  { name: 'Digital Proof', order: 3 },
  { name: 'Print Text Block', order: 4 },
  { name: 'Collate', order: 5 },
  { name: 'Trim', order: 6 },
  { name: 'Cover', order: 7 },
  { name: 'Bind', order: 8 },
  { name: 'Face Trim', order: 9 },
  { name: 'Edition', order: 10 },
  { name: 'Release', order: 11 },
]

const COLORS = [
  '#60a5fa', '#a78bfa', '#f97316', '#2dd4bf', '#4ade80',
  '#f87171', '#fbbf24', '#e879f9', '#34d399', '#fb923c',
]

export default function TSPSidebar({ projects, currentView, onNavigate, onReload, onSwitchWorkspace }: Props) {
  const [showNewProject, setShowNewProject] = useState(false)
  const [searchInput, setSearchInput] = useState(
    currentView.type === 'search' ? currentView.query : ''
  )
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

  function navClass(active: boolean) {
    return `mx-2 px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors cursor-pointer ${
      active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
    }`
  }

  const isDash = currentView.type === 'tsp-dashboard'
  const isTasks = currentView.type === 'tsp-tasks'
  const isDates = currentView.type === 'tsp-dates'
  const isInventory = currentView.type === 'tsp-inventory'
  const isTransactions = currentView.type === 'tsp-transactions'

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
            className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer text-white/40 hover:text-white/70"
          >
            Work
          </button>
          <button
            className="flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer bg-white/15 text-white"
          >
            TSP
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 mb-3">
        <input
          type="text"
          placeholder="Search TSP..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full bg-white/5 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:bg-white/10 transition-colors"
        />
      </div>

      <div className="px-4 mb-1">
        <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Thickly Settled</span>
      </div>

      <button onClick={() => onNavigate({ type: 'tsp-dashboard' })} className={navClass(isDash)}>
        <span>Dashboard</span>
      </button>

      <button onClick={() => onNavigate({ type: 'tsp-tasks' })} className={navClass(isTasks)}>
        <span>Tasks</span>
      </button>

      <button onClick={() => onNavigate({ type: 'tsp-dates' })} className={navClass(isDates)}>
        <span>Dates &amp; Events</span>
      </button>

      <div className="my-2 border-t border-white/10" />

      <div className="px-4 mb-1">
        <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Projects</span>
      </div>

      {[...projects].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
        const active = currentView.type === 'tsp-project' && currentView.slug === p.slug
        return (
          <div
            key={p.id}
            className={`group mx-2 px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-sm transition-colors cursor-pointer text-left ${
              active ? 'bg-white/15 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => onNavigate({ type: 'tsp-project', slug: p.slug })}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="truncate flex-1">{p.name}</span>
          </div>
        )
      })}

      <div className="my-2 border-t border-white/10" />

      <div className="px-4 mb-1">
        <span className="text-xs font-bold tracking-widest text-white/40 uppercase">Inventory</span>
      </div>

      <button onClick={() => onNavigate({ type: 'tsp-inventory' })} className={navClass(isInventory)}>
        <span>Items</span>
      </button>

      <button onClick={() => onNavigate({ type: 'tsp-transactions' })} className={navClass(isTransactions)}>
        <span>Transactions</span>
      </button>

      <div className="mt-auto pt-4 px-2 flex flex-col gap-1">
        <button
          onClick={() => setShowNewProject(true)}
          className="w-full px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-left flex items-center gap-2"
        >
          <span className="text-base leading-none">+</span>
          <span>New Project</span>
        </button>
      </div>
    </aside>

    {showNewProject && (
      <NewTSPProjectModal
        onClose={() => setShowNewProject(false)}
        onSaved={() => { setShowNewProject(false); onReload() }}
      />
    )}
    </>
  )
}

// ── New TSP Project Modal ─────────────────────────────────────────────────────

function NewTSPProjectModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [description, setDescription] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [url, setUrl] = useState('')
  const [stages, setStages] = useState<PipelineStage[]>(
    DEFAULT_STAGES.map((s, i) => ({ ...s, id: `stage-${i}` }))
  )
  const [isPublication, setIsPublication] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) return setError('Name is required')
    setSaving(true)
    try {
      await window.api.createTSPProject({
        name: name.trim(),
        artist: artist.trim() || undefined,
        description: description.trim() || undefined,
        releaseDate: releaseDate || undefined,
        color,
        url: url.trim() || undefined,
        isPublication,
        pipelineStages: isPublication ? stages : [],
      })
      onSaved()
    } catch {
      setError('Failed to create project.')
      setSaving(false)
    }
  }

  function addStage() {
    setStages([...stages, { id: crypto.randomUUID(), name: 'New Stage', order: stages.length }])
  }

  function updateStageName(id: string, name: string) {
    setStages(stages.map((s) => s.id === id ? { ...s, name } : s))
  }

  function removeStage(id: string) {
    setStages(stages.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[#1a1a1f] border border-white/15 rounded-2xl w-full max-w-lg mx-4 p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-bold text-white">New TSP Project</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">Project Name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. lack, dead one, SEVERE PAPER 3000"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Artist / Author</label>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Optional"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder-white/20" />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder-white/20 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 block mb-1">Release Date</label>
              <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">URL</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder-white/20" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1f] scale-110' : 'hover:scale-110'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-white/5">
            <label className="text-xs text-white/50">Publication</label>
            <button
              onClick={() => setIsPublication(!isPublication)}
              className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${isPublication ? 'bg-blue-500' : 'bg-white/10'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublication ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {isPublication && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/50">Pipeline Stages</label>
                <button onClick={addStage} className="text-xs text-white/40 hover:text-white cursor-pointer transition-colors">+ Add</button>
              </div>
              <div className="flex flex-col gap-1.5">
                {stages.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input value={s.name} onChange={(e) => updateStageName(s.id, e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
                    <button onClick={() => removeStage(s.id)} className="text-white/30 hover:text-red-400 cursor-pointer transition-colors text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-red-300 text-sm">{error}</p>}

        <div className="flex gap-2 pt-1 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 cursor-pointer transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/15 hover:bg-white/25 cursor-pointer transition-colors disabled:opacity-40">
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}
