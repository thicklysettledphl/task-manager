import type { Task, DateEntry, TaskStore, Project, Note, Student } from './types'

declare global {
  interface Window {
    api: {
      getTasks(): Promise<TaskStore>
      createTask(body: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>
      updateTask(id: string, partial: Partial<Task>): Promise<Task>
      deleteTask(id: string): Promise<{ ok: boolean }>
      createDate(body: Omit<DateEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DateEntry>
      updateDate(id: string, partial: Partial<DateEntry>): Promise<DateEntry>
      deleteDate(id: string): Promise<{ ok: boolean }>
      completeDate(id: string): Promise<DateEntry>
      importFile(buffer: ArrayBuffer, filename: string): Promise<{ text: string; dates: { date: string; label: string; context: string }[] }>
      importUrl(url: string): Promise<{ text: string; dates: { date: string; label: string; context: string }[] }>
      createProject(data: { name: string; color: string; url?: string }): Promise<Project>
      updateProject(id: string, data: { name: string; color: string; url?: string }): Promise<Project>
      openUrl(url: string): Promise<void>
      exportData(): Promise<{ ok: boolean; filePath?: string }>
      exportCsv(): Promise<{ ok: boolean; filePath?: string }>
      createNote(body: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note>
      updateNote(id: string, partial: Partial<Note>): Promise<Note>
      deleteNote(id: string): Promise<{ ok: boolean }>
      browseFile(): Promise<string | null>
      openFile(filePath: string): Promise<string | null>
      createStudent(body: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student>
      updateStudent(id: string, updated: Student): Promise<Student>
      deleteStudent(id: string): Promise<{ ok: boolean }>
    }
  }
}

export {}
