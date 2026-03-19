export type Status = 'not-started' | 'in-progress' | 'done' | 'blocked'
export type Priority = 'high' | 'medium' | 'low'
export type Repeat = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface Project {
  id: string
  name: string
  slug: string
  color: string
  url?: string
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
  filePath?: string
  subtasks?: NoteChecklistItem[]
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

export interface NoteChecklistItem {
  id: string
  text: string
  checked: boolean
}

export interface Note {
  id: string
  title: string
  body: string
  checklistItems: NoteChecklistItem[]
  projectIds: string[]
  createdAt: string
  updatedAt: string
}

export interface WorksheetEntry {
  slotId: string
  completed: boolean
  courseName?: string
}

export interface StudentWorksheet {
  id: string       // unique instance ID — allows multiple worksheets of the same degree
  degreeId: string
  entries: WorksheetEntry[]
}

export interface Student {
  id: string
  name: string
  pennId?: string
  graduationYear?: string
  notes?: string
  worksheets: StudentWorksheet[]
  createdAt: string
  updatedAt: string
}

export interface TaskStore {
  projects: Project[]
  tasks: Task[]
  dates: DateEntry[]
  notes: Note[]
  students: Student[]
}
