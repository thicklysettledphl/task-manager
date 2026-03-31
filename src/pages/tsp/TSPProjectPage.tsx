import { useState, useEffect, useCallback } from 'react'
import type { TaskStore, TSPProject, PipelineStage, Task, DateEntry, Note, Expense } from '@/types'
import type { View, Workspace } from '@/App'
import TSPSidebar from './TSPSidebar'
import Timeline from '@/components/Timeline'
import TaskModal from '@/components/TaskModal'
import DateModal from '@/components/DateModal'
import FilterBar, { type FilterStatus } from '@/components/FilterBar'
import { ExpenseModal } from './TSPInventoryDashboardPage'

interface Props {
  slug: string
  onNavigate: (v: View) => void
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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-')
  return `${MONTH_NAMES[parseInt(month) - 1]} ${parseInt(day)}, ${year}`
}

export default function TSPProjectPage({ slug, onNavigate, onSwitchWorkspace }: Props) {
  const [store, setStore] = useState<TaskStore>({
    projects: [], tasks: [], dates: [], notes: [], students: [],
    tspProjects: [], tspTasks: [], tspDates: [], tspNotes: [], tspExpenses: [], inventoryItems: [], transactions: [],
  })
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined)
  const [editDate, setEditDate] = useState<DateEntry | null | undefined>(undefined)
  const [editExpense, setEditExpense] = useState<Expense | null | undefined>(undefined)
  const [showEditProject, setShowEditProject] = useState(false)

  const load = useCallback(async () => {
    const data = await window.api.getTasks()
    setStore(data)
  }, [])

  useEffect(() => { load() }, [load])

  const tspProjects = store.tspProjects ?? []
  const project = tspProjects.find((p) => p.slug === slug)

  const pid = project?.id ?? ''
  const q = search.toLowerCase()

  const allProjectTasks = (store.tspTasks ?? []).filter((t) => t.projectIds.includes(pid))
  const allProjectDates = (store.tspDates ?? []).filter((d) => d.projectIds.includes(pid))
  const projectNotes = (store.tspNotes ?? []).filter((n) => {
    if (!n.projectIds.includes(pid)) return false
    if (q) return (
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      n.checklistItems.some((i) => i.text.toLowerCase().includes(q))
    )
    return true
  })

  const filteredTasks = allProjectTasks.filter((t) => {
    if (filter !== 'all' && filter !== 'notes' && t.status !== filter) return false
    if (q) return t.title.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q)
    return true
  })
  const filteredDates = (filter === 'all' || filter === 'notes') && !q
    ? allProjectDates
    : q
      ? allProjectDates.filter((d) => d.title.toLowerCase().includes(q))
      : []

  if (!project) {
    return (
      <div className="flex min-h-screen">
        <TSPSidebar projects={tspProjects} currentView={{ type: 'tsp-project', slug }} onNavigate={onNavigate} onReload={load} onSwitchWorkspace={onSwitchWorkspace} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-white/40">Project not found.</p>
        </main>
      </div>
    )
  }

  const stageIdx = project.pipelineStages.findIndex((s) => s.id === project.currentStageId)
  const isPublication = project.isPublication ?? true

  // TSP projects as "projects" for Timeline / modals
  const projectsForTimeline = tspProjects.map((p) => ({ id: p.id, name: p.name, slug: p.slug, color: p.color }))

  return (
    <div className="flex min-h-screen">
      <TSPSidebar
        projects={tspProjects}
        currentView={{ type: 'tsp-project', slug }}
        onNavigate={onNavigate}
        onReload={load}
        onSwitchWorkspace={onSwitchWorkspace}
      />

      <main className="flex-1 flex flex-col min-h-screen">
        {/* ── Project header ── */}
        <div className="px-8 border-b border-white/10" style={{ paddingTop: 44, paddingBottom: 20 }}>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color }} />
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            {project.url && (
              <button
                onClick={() => window.api.openUrl(project.url!)}
                className="text-sm text-white/40 hover:text-white/80 transition-colors cursor-pointer"
              >
                ↗
              </button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setEditExpense(null)}
                className="text-sm text-white/40 hover:text-white transition-colors cursor-pointer px-3 py-1 rounded-lg hover:bg-white/5"
              >
                + Expense
              </button>
              <button
                onClick={() => setShowEditProject(true)}
                className="text-sm text-white/40 hover:text-white transition-colors cursor-pointer px-3 py-1 rounded-lg hover:bg-white/5"
              >
                Edit
              </button>
            </div>
          </div>
          {project.artist && <div className="text-sm text-white/50 ml-6">{project.artist}</div>}
          {project.description && <div className="text-sm text-white/40 ml-6 mt-1">{project.description}</div>}
          {project.releaseDate && (
            <div className="text-xs text-white/30 ml-6 mt-1">Release: {formatDate(project.releaseDate)}</div>
          )}
        </div>

        {/* ── Production Pipeline (publications only) ── */}
        {isPublication && project.pipelineStages.length > 0 && (
          <div className="px-8 py-5 border-b border-white/10">
            <div className="text-xs font-bold tracking-widest text-white/40 uppercase mb-3">Production Pipeline</div>
            <div className="flex items-center gap-0">
              {project.pipelineStages.map((stage, i) => {
                const isCompleted = stageIdx > i
                const isCurrent = stageIdx === i
                return (
                  <div key={stage.id} className="flex items-center flex-1">
                    <button
                      onClick={async () => {
                        await window.api.updateTSPProject(project.id, { currentStageId: stage.id })
                        load()
                      }}
                      className={`flex-1 py-2 px-3 text-xs font-medium text-center transition-all cursor-pointer rounded-lg ${
                        isCurrent
                          ? 'text-white shadow-sm'
                          : isCompleted
                            ? 'text-white/60'
                            : 'text-white/25 hover:text-white/50'
                      }`}
                      style={isCurrent ? { background: project.color + '33', border: `1px solid ${project.color}66` } : {}}
                    >
                      {isCompleted && <span className="mr-1 text-green-400">✓</span>}
                      {stage.name}
                    </button>
                    {i < project.pipelineStages.length - 1 && (
                      <span className={`text-xs mx-0.5 shrink-0 ${isCompleted ? 'text-white/40' : 'text-white/15'}`}>›</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Sticky toolbar: filter + search + add buttons ── */}
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
                onClick={async () => {
                  const note = await window.api.createTSPNote({
                    title: '', body: '', checklistItems: [], projectIds: pid ? [pid] : [],
                  })
                  onNavigate({ type: 'tsp-notes', noteId: note.id })
                }}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer"
              >
                + New Note
              </button>
            ) : (
              <>
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

        {/* ── Notes grid (when Notes filter active) ── */}
        {filter === 'notes' ? (
          <div className="px-6 py-6">
            {projectNotes.length === 0 ? (
              <div className="py-16 text-center text-white/25 text-sm">
                No notes for this project yet.{' '}
                <button
                  onClick={async () => {
                    const note = await window.api.createTSPNote({
                      title: '', body: '', checklistItems: [], projectIds: pid ? [pid] : [],
                    })
                    onNavigate({ type: 'tsp-notes', noteId: note.id })
                  }}
                  className="underline hover:text-white/50 transition-colors cursor-pointer"
                >
                  Create one
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {[...projectNotes]
                  .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                  .map((note: Note) => {
                    const preview = note.body.split('\n').find((l) => l.trim())
                      || note.checklistItems.find((i) => i.text)?.text
                      || ''
                    const d = new Date(note.updatedAt)
                    const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
                    const relDate = diffDays === 0
                      ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                      : diffDays === 1 ? 'Yesterday'
                      : diffDays < 7 ? d.toLocaleDateString([], { weekday: 'short' })
                      : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
                    return (
                      <button
                        key={note.id}
                        onClick={() => onNavigate({ type: 'tsp-notes', noteId: note.id })}
                        className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-left"
                      >
                        <div className="text-sm font-medium text-white mb-1 truncate">
                          {note.title || 'Untitled Note'}
                        </div>
                        <div className="text-xs text-white/40 truncate mb-2">{preview || 'No text'}</div>
                        <div className="text-xs text-white/25">{relDate}</div>
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
        ) : (
          /* ── Timeline ── */
          <Timeline
            tasks={filteredTasks}
            dates={filteredDates}
            projects={projectsForTimeline}
            onTaskClick={setEditTask}
            onDateClick={setEditDate}
            onReload={load}
            updateTask={window.api.updateTSPTask}
          />
        )}
      </main>

      {editTask !== undefined && (
        <TaskModal
          task={editTask}
          projects={projectsForTimeline}
          defaultProjectIds={[project.id]}
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
          defaultProjectIds={[project.id]}
          onClose={() => setEditDate(undefined)}
          onSaved={load}
          createDate={window.api.createTSPDate}
          updateDate={window.api.updateTSPDate}
          deleteDate={window.api.deleteTSPDate}
        />
      )}
      {showEditProject && (
        <EditTSPProjectModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onSaved={() => { setShowEditProject(false); load() }}
          onDelete={async () => {
            await window.api.deleteTSPProject(project.id)
            setShowEditProject(false)
            onNavigate({ type: 'tsp-dashboard' })
          }}
        />
      )}
      {editExpense !== undefined && (
        <ExpenseModal
          expense={editExpense}
          projects={tspProjects}
          defaultProjectId={project.id}
          onClose={() => setEditExpense(undefined)}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ── Edit Project Modal ────────────────────────────────────────────────────────

function EditTSPProjectModal({ project, onClose, onSaved, onDelete }: {
  project: TSPProject
  onClose: () => void
  onSaved: () => void
  onDelete: () => void
}) {
  const [name, setName] = useState(project.name)
  const [artist, setArtist] = useState(project.artist ?? '')
  const [description, setDescription] = useState(project.description ?? '')
  const [releaseDate, setReleaseDate] = useState(project.releaseDate ?? '')
  const [color, setColor] = useState(project.color)
  const [url, setUrl] = useState(project.url ?? '')
  const [isPublication, setIsPublication] = useState(project.isPublication ?? true)
  const [stages, setStages] = useState<PipelineStage[]>(
    project.pipelineStages.length > 0
      ? project.pipelineStages
      : DEFAULT_STAGES.map((s, i) => ({ ...s, id: `stage-${i}` }))
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    await window.api.updateTSPProject(project.id, {
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
  }

  function addStage() {
    const newStage: PipelineStage = { id: crypto.randomUUID(), name: 'New Stage', order: stages.length }
    setStages([...stages, newStage])
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
        <h2 className="text-base font-bold text-white">Edit Project</h2>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">Project Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Artist / Author</label>
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Optional"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder-white/20 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 block mb-1">Release Date</label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder-white/20"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full cursor-pointer transition-transform ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1f] scale-110' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
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
                <button onClick={addStage} className="text-xs text-white/40 hover:text-white cursor-pointer transition-colors">+ Add stage</button>
              </div>
              <div className="flex flex-col gap-1.5">
                {stages.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input
                      value={s.name}
                      onChange={(e) => updateStageName(s.id, e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/30"
                    />
                    <button onClick={() => removeStage(s.id)} className="text-white/30 hover:text-red-400 cursor-pointer transition-colors text-lg leading-none">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={onDelete}
            className="text-sm text-red-400/70 hover:text-red-400 cursor-pointer transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
          >
            Delete Project
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 cursor-pointer transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/15 hover:bg-white/25 cursor-pointer transition-colors disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
