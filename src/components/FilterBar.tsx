import type { Status } from '@/types'

export type FilterStatus = Status | 'all' | 'notes'

const BASE_OPTIONS: { label: string; value: FilterStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Not Started', value: 'not-started' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Done', value: 'done' },
]

interface Props {
  current: FilterStatus
  onChange: (s: FilterStatus) => void
  showNotes?: boolean
}

export default function FilterBar({ current, onChange, showNotes }: Props) {
  const options = showNotes
    ? [...BASE_OPTIONS, { label: 'Notes', value: 'notes' as FilterStatus }]
    : BASE_OPTIONS
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            current === opt.value
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
