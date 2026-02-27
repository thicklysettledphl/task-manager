import type { Task, DateEntry, TaskStore, Project } from './types'

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
      createProject(data: { name: string; color: string }): Promise<Project>
      updateProject(id: string, data: { name: string; color: string }): Promise<Project>
      openUrl(url: string): Promise<void>
    }
  }
}

export {}
