import { useState, useCallback } from 'react'
import type { Project } from '@/types'

interface ExtractedDate {
  uid: number
  date: string
  label: string
  context: string
  selected: boolean
}

interface Props {
  projects: Project[]
  onClose: () => void
  onSaved: () => void
}

type Tab = 'file' | 'url'

let uidCounter = 0

export default function ImportModal({ projects, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('file')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [extracted, setExtracted] = useState<ExtractedDate[] | null>(null)
  const [error, setError] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
    setExtracted(null)
    setError('')
  }, [])

  async function handleExtract() {
    setLoading(true)
    setError('')
    setExtracted(null)
    try {
      let data: { dates: { date: string; label: string; context: string }[] }
      if (tab === 'file') {
        if (!file) return
        data = await window.api.importFile(await file.arrayBuffer(), file.name)
      } else {
        if (!url.trim()) return
        data = await window.api.importUrl(url.trim())
      }
      setExtracted(
        data.dates.map((d) => ({ ...d, uid: ++uidCounter, selected: true }))
      )
    } catch {
      setError('Failed to parse. Check the file or URL and try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleAll() {
    if (!extracted) return
    const allSelected = extracted.every((d) => d.selected)
    setExtracted(extracted.map((d) => ({ ...d, selected: !allSelected })))
  }

  function toggle(uid: number) {
    setExtracted((prev) => prev!.map((d) => d.uid === uid ? { ...d, selected: !d.selected } : d))
  }

  function updateLabel(uid: number, label: string) {
    setExtracted((prev) => prev!.map((d) => d.uid === uid ? { ...d, label } : d))
  }

  const selected = extracted?.filter((d) => d.selected) ?? []
  const allChecked = !!extracted?.length && extracted.every((d) => d.selected)
  const someChecked = extracted?.some((d) => d.selected)

  async function importAsDates() {
    if (!selected.length) return
    setImporting(true)
    try {
      await Promise.all(
        selected.map((d) =>
          window.api.createDate({
            title: d.label.trim() || d.date,
            date: d.date,
            projectIds: projectId ? [projectId] : [],
          })
        )
      )
      onSaved()
      onClose()
    } catch {
      setError('Import failed. Try again.')
    } finally {
      setImporting(false)
    }
  }

  async function importAsTasks() {
    if (!selected.length || !projectId) return
    setImporting(true)
    try {
      await Promise.all(
        selected.map((d) =>
          window.api.createTask({
            title: d.label.trim() || d.date,
            projectIds: projectId ? [projectId] : [],
            dueDate: d.date,
            status: 'not-started',
            priority: 'medium',
          })
        )
      )
      onSaved()
      onClose()
    } catch {
      setError('Import failed. Try again.')
    } finally {
      setImporting(false)
    }
  }

  const canExtract = tab === 'file' ? !!file : !!url.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a24] border border-white/15 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-white">Import Dates</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-xl leading-none cursor-pointer">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 shrink-0">
          {(['file', 'url'] as Tab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); setExtracted(null); setError('') }}
              className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
                tab === t ? 'text-white border-b-2 border-white' : 'text-white/50 hover:text-white'
              }`}>
              {t === 'file' ? 'From File' : 'From URL'}
            </button>
          ))}
        </div>

        {/* Source input */}
        <div className="px-6 py-4 border-b border-white/10 flex gap-3 items-end shrink-0">
          {tab === 'file' ? (
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm text-white/60 uppercase tracking-widest">File (.docx, .pdf, or .txt)</label>
              <input type="file" accept=".docx,.pdf,.txt" onChange={handleFileChange}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-white/10 file:text-white file:text-sm cursor-pointer" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-sm text-white/60 uppercase tracking-widest">URL</label>
              <input type="url" value={url} onChange={(e) => { setUrl(e.target.value); setExtracted(null) }}
                placeholder="https://..."
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-white/30" />
            </div>
          )}
          <button onClick={handleExtract} disabled={!canExtract || loading}
            className="px-5 py-3 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer disabled:opacity-40 shrink-0">
            {loading ? 'Extracting…' : 'Extract Dates'}
          </button>
        </div>

        {error && <p className="px-6 py-3 text-red-300 text-sm shrink-0">{error}</p>}

        {/* Results */}
        {extracted !== null && (
          <>
            {extracted.length === 0 ? (
              <div className="px-6 py-8 text-white/50 text-sm">No dates found in the document.</div>
            ) : (
              <>
                {/* Select-all + project row */}
                <div className="px-6 py-3 border-b border-white/10 flex items-center gap-4 shrink-0">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = !allChecked && !!someChecked }}
                      onChange={toggleAll}
                      className="w-5 h-5 rounded cursor-pointer accent-white"
                    />
                    <span className="text-sm text-white">
                      {selected.length} of {extracted.length} selected
                    </span>
                  </label>

                  <div className="ml-auto flex items-center gap-2">
                    <label className="text-sm text-white/60">Project:</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 cursor-pointer"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} style={{ background: '#1a1a24' }}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date rows */}
                <div className="overflow-y-auto flex-1">
                  {extracted.map((d) => (
                    <label
                      key={d.uid}
                      className={`flex items-start gap-4 px-6 py-4 border-b border-white/5 cursor-pointer transition-colors ${
                        d.selected ? 'bg-white/[0.03]' : 'opacity-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={d.selected}
                        onChange={() => toggle(d.uid)}
                        className="w-5 h-5 rounded mt-1 cursor-pointer accent-white shrink-0"
                      />
                      <div className="flex flex-col gap-2 flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold text-white shrink-0">{d.date}</span>
                          <input
                            type="text"
                            value={d.label}
                            onChange={(e) => updateLabel(d.uid, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Add label…"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                          />
                        </div>
                        {d.context && (
                          <p className="text-sm text-white/40 leading-relaxed truncate">…{d.context}…</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {/* Import actions */}
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
                  <span className="text-sm text-white/50">
                    {selected.length} item{selected.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={importAsDates}
                      disabled={!someChecked || importing}
                      className="px-5 py-2.5 rounded-lg text-sm font-bold text-white/80 hover:text-white bg-white/5 hover:bg-white/15 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {importing ? 'Importing…' : `◆ Import as Dates`}
                    </button>
                    <button
                      onClick={importAsTasks}
                      disabled={!someChecked || !projectId || importing}
                      className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-white/15 hover:bg-white/25 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {importing ? 'Importing…' : `+ Import as Tasks`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Footer (only shown before extraction) */}
        {extracted === null && (
          <div className="px-6 py-4 border-t border-white/10 flex justify-end shrink-0">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
