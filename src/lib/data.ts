import fs from 'fs'
import path from 'path'
import type { TaskStore } from '@/types'

const DATA_PATH = path.join(process.cwd(), 'data', 'tasks.json')

const DEFAULT_STORE: TaskStore = {
  projects: [
    { id: '1', name: 'Pre-Major Advising', slug: 'pre-major-advising', color: '#60a5fa' },
    { id: '2', name: 'Major and Minor Advising', slug: 'major-minor-advising', color: '#a78bfa' },
    { id: '3', name: 'Faculty Hiring', slug: 'faculty-hiring', color: '#f97316' },
    { id: '4', name: 'Course Rostering', slug: 'course-rostering', color: '#2dd4bf' },
    { id: '5', name: 'Department Budgeting', slug: 'department-budgeting', color: '#4ade80' },
    { id: '6', name: 'Curriculum Committee', slug: 'curriculum-committee', color: '#f87171' },
    { id: '7', name: 'Campus Partner Events', slug: 'campus-partner-events', color: '#fbbf24' },
  ],
  tasks: [],
}

export function readStore(): TaskStore {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8')
    return JSON.parse(raw) as TaskStore
  } catch {
    return DEFAULT_STORE
  }
}

export function writeStore(store: TaskStore): void {
  const dir = path.dirname(DATA_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), 'utf-8')
}
