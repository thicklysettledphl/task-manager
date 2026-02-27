import { useState, useEffect, useCallback } from 'react'
import type { DateEntry, Project, Repeat } from '@/types'
import ProjectSelector from './ProjectSelector'

interface Props {
  entry?: DateEntry | null
  projects: Project[]
  defaultDate?: string
  defaultProjectIds?: string[]
  onClose: () => void
  onSaved: () => void
}

export default function DateModal({ entry, projects, defaultDate, defaultProjectIds, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(entry?.title ?? '')
  const [date, setDate] = useState(entry?.date ?? defaultDate ?? '')
  const [projectIds, setProjectIds] = useState<string[]>(
    entry?.projectIds ?? defaultProjectIds ?? []
  )
  const [repeat, setRepeat] = useState<Repeat | 'none'>(entry?.repeat ?? 'none')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')

const REPEATS: (Repeat | 'none')[] = ['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']
const REPEAT_LABELS: Record<Repeat | 'none', string> = {
  none: 'None', daily: 'Daily', weekly: 'Weekly',
  biweekly: 'Biweekly', monthly: 'Monthly', yearly: 'Yearly',
}

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
    if (!date) return setError('Date is required')
    setError('')
    setSaving(true)
    try {
      const repeatVal = repeat === 'none' ? undefined : repeat
      if (entry) {
        await window.api.updateDate(entry.id, { title: title.trim(), date, projectIds, repeat: repeatVal, notes: notes || undefined })
      } else {
        await window.api.createDate({ title: title.trim(), date, projectIds, repeat: repeatVal, notes: notes || undefined })
      }
      onSaved()
      onClose()
    } catch {
      setError('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete() {
    if (!entry) return
    setCompleting(true)
    try {
      await window.api.completeDate(entry.id)
      onSaved()
      onClose()
    } catch {
      setError('Failed to complete.')
    } finally {
      setCompleting(false)
    }
  }

  async function handleDelete() {
    if (!entry || !confirm('Delete this date?')) return
    setDeleting(true)
    try {
      await window.api.deleteDate(entry.id)
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
      <div className="bg-[#1a1a24] border border-white/15 rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">

        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">◆</span>
            <h2 className="text-lg font-bold text-white">{entry ? 'Edit Date' : 'Add Date'}</h2>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none cursor-pointer">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">Label</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              placeholder="e.g. Deadline, Meeting, Review..."
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">
              Projects <span className="normal-case text-white/30">(optional)</span>
            </label>
            <ProjectSelector projects={projects} selected={projectIds} onChange={setProjectIds} />
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
            <label className="text-sm text-white/60 uppercase tracking-widest">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional..."
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
          {entry && (
            <button onClick={handleDelete} disabled={deleting || completing}
              className="text-red-300/70 hover:text-red-300 text-sm transition-colors mr-auto cursor-pointer disabled:opacity-50">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          {entry && entry.repeat && (
            <button onClick={handleComplete} disabled={completing || deleting}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white/80 hover:text-white bg-white/5 hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-50">
              {completing ? 'Completing…' : '↻ Complete & Advance'}
            </button>
          )}
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer disabled:opacity-50">
            {saving ? 'Saving…' : entry ? 'Save' : 'Add Date'}
          </button>
        </div>
      </div>
    </div>
  )
}
