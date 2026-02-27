import { useMemo } from 'react'
import type { Task, Project, DateEntry } from '@/types'
import { monthKey, formatMonthYear, formatFullDate, formatDate, isoToday } from '@/lib/utils'
import TaskItem from './TaskItem'

interface Props {
  tasks: Task[]
  dates: DateEntry[]
  projects: Project[]
  onTaskClick: (task: Task) => void
  onDateClick: (entry: DateEntry) => void
}

type TimelineItem =
  | { kind: 'task'; item: Task; sortKey: string }
  | { kind: 'date'; item: DateEntry; sortKey: string }

function groupByMonth(items: TimelineItem[]): [string, TimelineItem[]][] {
  const map = new Map<string, TimelineItem[]>()
  for (const item of items) {
    const key = monthKey(item.sortKey)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
}

export default function Timeline({ tasks, dates, projects, onTaskClick, onDateClick }: Props) {
  const today = isoToday()

  const projectMap = useMemo(() => {
    const m = new Map<string, Project>()
    projects.forEach((p) => m.set(p.id, p))
    return m
  }, [projects])

  const { upcoming, past } = useMemo(() => {
    const allItems: TimelineItem[] = [
      ...tasks.map((t): TimelineItem => ({ kind: 'task', item: t, sortKey: t.dueDate })),
      ...dates.map((d): TimelineItem => ({ kind: 'date', item: d, sortKey: d.date })),
    ]
    allItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    return {
      upcoming: allItems.filter((i) => i.sortKey >= today),
      past: allItems.filter((i) => i.sortKey < today).reverse(),
    }
  }, [tasks, dates, today])

  const upcomingGroups = useMemo(() => groupByMonth(upcoming), [upcoming])
  const pastGroups = useMemo(() => groupByMonth(past), [past])

  if (tasks.length === 0 && dates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white/50">
        <p className="text-base">No tasks or dates yet. Add one to get started.</p>
      </div>
    )
  }

  function renderItem(item: TimelineItem) {
    if (item.kind === 'task') {
      const task = item.item as Task
      const taskProjects = task.projectIds
        .map((id) => projectMap.get(id))
        .filter((p): p is Project => !!p)
      return (
        <TaskItem
          key={task.id}
          task={task}
          projects={taskProjects}
          onClick={() => onTaskClick(task)}
        />
      )
    }
    const entry = item.item as DateEntry
    return (
      <DateItem
        key={entry.id}
        entry={entry}
        projects={entry.projectIds.map((id) => projectMap.get(id)).filter((p): p is Project => !!p)}
        onClick={() => onDateClick(entry)}
      />
    )
  }

  return (
    <div className="flex flex-col">

      {/* ── TODAY HEADER ─────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#0f0f11] border-b border-white/20 px-6 py-4">
        <p className="text-xs tracking-widest text-white/50 uppercase mb-0.5">Today</p>
        <p className="text-lg font-bold text-white">{formatFullDate(today)}</p>
      </div>

      {/* ── UPCOMING ─────────────────────────────────────────── */}
      {upcomingGroups.length === 0 ? (
        <div className="px-6 py-8 text-white/40 text-sm">No upcoming items.</div>
      ) : (
        upcomingGroups.map(([key, group]) => (
          <section key={key}>
            <div className="px-6 py-3 bg-[#0f0f11]/95 border-b border-white/10 text-sm font-bold tracking-widest text-white/60 sticky top-[89px] z-10">
              {formatMonthYear(key + '-01')}
            </div>
            {group.map(renderItem)}
          </section>
        ))
      )}

      {/* ── PAST ─────────────────────────────────────────────── */}
      {pastGroups.length > 0 && (
        <>
          <div className="px-6 py-4 mt-4 border-t border-white/10 flex items-center gap-4">
            <span className="text-xs tracking-widest text-white/30 uppercase">Past</span>
            <div className="flex-1 border-t border-white/10" />
          </div>
          {pastGroups.map(([key, group]) => (
            <section key={key} className="opacity-50">
              <div className="px-6 py-3 bg-[#0f0f11]/95 border-b border-white/10 text-sm font-bold tracking-widest text-white/40">
                {formatMonthYear(key + '-01')}
              </div>
              {group.map(renderItem)}
            </section>
          ))}
        </>
      )}
    </div>
  )
}

function DateItem({ entry, projects, onClick }: { entry: DateEntry; projects: Project[]; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 bg-white/[0.02]"
    >
      <span className="text-white/60 text-base shrink-0">◆</span>
      <span className="flex-1 text-base text-white">
        {entry.title}
        {entry.repeat && <span className="ml-2 text-white/30 text-sm">↻</span>}
      </span>
      {/* Project dots */}
      {projects.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          {projects.slice(0, 3).map((p) => (
            <span key={p.id} className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          ))}
          {projects.length > 1 && (
            <span className="text-sm text-white/40 ml-1">
              {projects.length > 3 ? `+${projects.length - 3}` : ''}
            </span>
          )}
        </div>
      )}
      {entry.notes && (
        <span className="text-sm text-white/50 truncate max-w-xs hidden lg:block">{entry.notes}</span>
      )}
      <span className="text-sm text-white/70 shrink-0">{formatDate(entry.date)}</span>
    </button>
  )
}
