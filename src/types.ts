export type Status = 'not-started' | 'in-progress' | 'done' | 'blocked'
export type Priority = 'high' | 'medium' | 'low'
export type Repeat = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface Project {
  id: string
  name: string
  slug: string
  color: string
}

export interface Task {
  id: string
  projectIds: string[]
  title: string
  startDate?: string
  dueDate: string
  status: Status
  priority: Priority
  repeat?: Repeat
  notes?: string
  url?: string
  createdAt: string
  updatedAt: string
}

export interface DateEntry {
  id: string
  projectIds: string[]
  title: string
  date: string
  repeat?: Repeat
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TaskStore {
  projects: Project[]
  tasks: Task[]
  dates: DateEntry[]
}
