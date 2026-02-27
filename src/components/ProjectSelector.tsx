import type { Project } from '@/types'

interface Props {
  projects: Project[]
  selected: string[]
  onChange: (ids: string[]) => void
  required?: boolean
}

export default function ProjectSelector({ projects, selected, onChange, required }: Props) {
  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {projects.map((p) => {
        const checked = selected.includes(p.id)
        return (
          <label
            key={p.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors select-none ${
              checked ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(p.id)}
              className="w-5 h-5 rounded cursor-pointer accent-white shrink-0"
            />
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-sm text-white">{p.name}</span>
          </label>
        )
      })}
      {required && selected.length === 0 && (
        <p className="text-sm text-white/40 px-3 pt-1">Select at least one project</p>
      )}
    </div>
  )
}
