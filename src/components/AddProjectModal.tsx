import { useState, useEffect, useCallback } from 'react'
import type { Project } from '@/types'

const COLOR_PRESETS = [
  '#60a5fa', '#818cf8', '#a78bfa', '#e879f9',
  '#f472b6', '#fb7185', '#f97316', '#fbbf24',
  '#4ade80', '#2dd4bf', '#38bdf8', '#94a3b8',
]

interface Props {
  project?: Project   // if provided, edit mode
  onClose: () => void
  onSaved: () => void
}

export default function AddProjectModal({ project, onClose, onSaved }: Props) {
  const [name, setName] = useState(project?.name ?? '')
  const [color, setColor] = useState(project?.color ?? COLOR_PRESETS[0])
  const [saving, setSaving] = useState(false)
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
    if (!name.trim()) return setError('Name is required')
    setError('')
    setSaving(true)
    try {
      if (project) {
        await window.api.updateProject(project.id, { name: name.trim(), color })
      } else {
        await window.api.createProject({ name: name.trim(), color })
      }
      onSaved()
      onClose()
    } catch {
      setError(project ? 'Failed to update project.' : 'Failed to create project.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a24] border border-white/15 rounded-xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden">

        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none cursor-pointer">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">

          <div className="flex flex-col gap-2">
            <label className="text-sm text-white/60 uppercase tracking-widest">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
              placeholder="Project name..."
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm text-white/60 uppercase tracking-widest">Color</label>
            <div className="flex flex-wrap gap-3">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-9 h-9 rounded-full cursor-pointer transition-transform hover:scale-110"
                  style={{
                    background: c,
                    outline: color === c ? `3px solid white` : '3px solid transparent',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span className="text-sm text-white">{name || 'Project name'}</span>
            </div>
          </div>

          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer disabled:opacity-50">
            {saving ? 'Saving…' : project ? 'Save' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  )
}
