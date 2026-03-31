import { useState } from 'react'
import type { PipelineStage } from '@/types'

const DEFAULT_STAGES: Omit<PipelineStage, 'id'>[] = [
  { name: 'Concept', order: 0 },
  { name: 'Manuscript', order: 1 },
  { name: 'Editing', order: 2 },
  { name: 'Design', order: 3 },
  { name: 'Print', order: 4 },
  { name: 'Release', order: 5 },
]

const COLORS = [
  '#60a5fa', '#a78bfa', '#f97316', '#2dd4bf', '#4ade80',
  '#f87171', '#fbbf24', '#e879f9', '#34d399', '#fb923c',
]

export default function NewTSPProjectModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [description, setDescription] = useState('')
  const [releaseDate, setReleaseDate] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [url, setUrl] = useState('')
  const [stages, setStages] = useState<PipelineStage[]>(
    DEFAULT_STAGES.map((s, i) => ({ ...s, id: `stage-${i}` }))
  )
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
        pipelineStages: stages,
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

  function updateStageName(id: string, stageName: string) {
    setStages(stages.map((s) => s.id === id ? { ...s, name: stageName } : s))
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
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. lack, dead one, SEVERE PAPER 3000"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 placeholder-white/20" />
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
        </div>
        {error && <p className="text-red-300 text-sm">{error}</p>}
        <div className="flex gap-2 pt-1 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 cursor-pointer transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/15 hover:bg-white/25 cursor-pointer transition-colors disabled:opacity-40">
            Create Project
          </button>
        </div>
      </div>
    </div>
  )
}
