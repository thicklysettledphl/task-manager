import { contextBridge, ipcRenderer, shell } from 'electron'
import type { Task, DateEntry, TaskStore, Project } from '../src/types'

contextBridge.exposeInMainWorld('api', {
  getTasks: (): Promise<TaskStore> =>
    ipcRenderer.invoke('tasks:get'),

  createTask: (body: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> =>
    ipcRenderer.invoke('tasks:create', body),

  updateTask: (id: string, partial: Partial<Task>): Promise<Task> =>
    ipcRenderer.invoke('tasks:update', id, partial),

  deleteTask: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('tasks:delete', id),

  createDate: (body: Omit<DateEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DateEntry> =>
    ipcRenderer.invoke('dates:create', body),

  updateDate: (id: string, partial: Partial<DateEntry>): Promise<DateEntry> =>
    ipcRenderer.invoke('dates:update', id, partial),

  deleteDate: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('dates:delete', id),

  completeDate: (id: string): Promise<DateEntry> =>
    ipcRenderer.invoke('dates:complete', id),

  importFile: (buffer: ArrayBuffer, filename: string): Promise<{ text: string; dates: { date: string; context: string }[] }> =>
    ipcRenderer.invoke('import:file', buffer, filename),

  importUrl: (url: string): Promise<{ text: string; dates: { date: string; context: string }[] }> =>
    ipcRenderer.invoke('import:url', url),

  createProject: (data: { name: string; color: string }): Promise<Project> =>
    ipcRenderer.invoke('projects:create', data),

  updateProject: (id: string, data: { name: string; color: string }): Promise<Project> =>
    ipcRenderer.invoke('projects:update', id, data),

  openUrl: (url: string): Promise<void> =>
    shell.openExternal(url),
})
