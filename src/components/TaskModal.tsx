import { useState, useEffect, useCallback } from 'react'
import type { Task, Project, Status, Priority, Repeat } from '@/types'
import ProjectSelector from './ProjectSelector'

interface Props {
  task?: Task | null
  projects: Project[]
  defaultProjectIds?: string[]
  defaultDueDate?: string
  onClose: () => void
  onSaved: () => void
}

const STATUSES: Status[] = ['not-started', 'in-progress', 'done', 'blocked']
const PRIORITIES: Priority[] = ['high', 'medium', 'low']
const REPEATS: (Repeat | 'none')[] = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']
const REPEAT_LABELS: Record<Repeat | 'none', string> = {
  none: 'None', daily: 'Daily', weekly: 'Weekly',
  biweekly: 'Biweekly', monthly: 'Monthly', yearly: 'Yearly',
}
const STATUS_LABELS: Record<Status, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}

export default function TaskModal({ task, projects, defaultProjectIds, defaultDueDate, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [projectIds, setProjectIds] = useState<string[]>(
    task?.projectIds ?? defaultProjectIds ?? (projects[0] ? [projects[0].id] : [])
  )
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaultDueDate ?? '')
  const [startDate, setStartDate] = useState(task?.startDate ?? '')
  const [status, setStatus] = useState<Status>(task?.status ?? 'not-started')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [repeat, setRepeat] = useState<Repeat | 'none'>(task?.repeat ?? 'none')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [url, setUrl] = useState(task?.url ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose]
  )
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  async function handleSave() {
    if (!title.trim()) return setError('Title is required')
    if (!dueDate) return setError('Due date is required')
    if (projectIds.length === 0) return setError('Select at least one project')
    setError('')
    setSaving(true)
    try {
      const body = {
        title: title.trim(), projectIds, dueDate,
        startDate: startDate || undefined,
        status, priority,
        repeat: repeat === 'none' ? undefined : repeat,
        notes: notes || undefined,
        url: url || undefined,
      }
      if (task) {
        await window.api.updateTask(task.id, body)
      } else {
        await window.api.createTask(body)
      }
      onSaved()
      onClose()
    } catch {
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!task || !confirm('Delete this task?')) return
    setDeleting(true)
    try {
      await window.api.deleteTask(task.id)
      onSaved()
      onClose()
    } catch {
      setError('Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a24] border border-white/15 rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">

        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none cursor-pointer">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">Title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title..."
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">Projects</label>
            <ProjectSelector projects={projects} selected={projectIds} onChange={setProjectIds} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-white/60 uppercase tracking-widest">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white focus:outline-none focus:border-white/30" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-white/60 uppercase tracking-widest">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white focus:outline-none focus:border-white/30" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    status === s ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((pr) => (
                <button key={pr} onClick={() => setPriority(pr)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors cursor-pointer ${
                    priority === pr ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}>
                  {pr}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">Repeat</label>
            <div className="flex gap-2 flex-wrap">
              {REPEATS.map((r) => (
                <button key={r} onClick={() => setRepeat(r)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    repeat === r ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}>
                  {REPEAT_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Optional notes..."
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none" />
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
          {task && (
            <button onClick={handleDelete} disabled={deleting}
              className="text-red-300/70 hover:text-red-300 text-sm transition-colors mr-auto cursor-pointer disabled:opacity-50">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer disabled:opacity-50">
            {saving ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
