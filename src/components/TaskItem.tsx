import type { Task, Project } from '@/types'
import { formatDate, isoToday } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
}

const STATUS_COLORS: Record<string, string> = {
  'not-started': 'bg-white/10 text-white',
  'in-progress': 'bg-blue-500/25 text-blue-200',
  done: 'bg-green-500/25 text-green-200',
  blocked: 'bg-red-500/25 text-red-200',
}

const PRIORITY_LABELS: Record<string, string> = {
  high: '↑ High',
  medium: '→ Med',
  low: '↓ Low',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-orange-300',
  medium: 'text-white/70',
  low: 'text-white/40',
}

interface Props {
  task: Task
  projects: Project[]   // all projects this task belongs to
  onClick: () => void
}

export default function TaskItem({ task, projects, onClick }: Props) {
  const today = isoToday()
  const overdue = task.status !== 'done' && task.dueDate < today

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 ${
        overdue ? 'bg-red-950/20' : ''
      }`}
    >
      {/* Project color dots */}
      <div className="flex items-center gap-1 shrink-0">
        {projects.slice(0, 3).map((p) => (
          <span key={p.id} className="w-3 h-3 rounded-full" style={{ background: p.color }} />
        ))}
        {projects.length === 0 && <span className="w-3 h-3 rounded-full bg-white/20" />}
      </div>

      {/* Project name(s) */}
      <span className="text-sm text-white/60 w-44 shrink-0 truncate">
        {projects.length === 0
          ? '—'
          : projects.length === 1
          ? projects[0].name
          : `${projects[0].name} +${projects.length - 1}`}
      </span>

      {/* Title */}
      <span className={`flex-1 text-base ${task.status === 'done' ? 'line-through text-white/40' : 'text-white'}`}>
        {task.title}
        {task.repeat && <span className="ml-2 text-white/30 text-sm">↻</span>}
        {task.url && (
          <span
            role="button"
            title={task.url}
            onClick={(e) => { e.stopPropagation(); window.api.openUrl(task.url!) }}
            className="ml-2 text-white/30 hover:text-blue-300 text-sm transition-colors cursor-pointer"
          >
            ↗
          </span>
        )}
      </span>

      {/* Due date */}
      <span className={`text-sm w-36 text-right shrink-0 ${overdue ? 'text-red-300' : 'text-white/70'}`}>
        {formatDate(task.dueDate)}
      </span>

      {/* Status badge */}
      <span className={`text-sm font-medium px-3 py-1 rounded-full w-36 text-center shrink-0 ${STATUS_COLORS[task.status]}`}>
        {STATUS_LABELS[task.status]}
      </span>

      {/* Priority */}
      <span className={`text-sm font-medium w-20 text-right shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
        {PRIORITY_LABELS[task.priority]}
      </span>
    </button>
  )
}
