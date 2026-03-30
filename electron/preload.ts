import { contextBridge, ipcRenderer, shell } from 'electron'
import type { Task, DateEntry, TaskStore, Project, Note, Student, TSPProject, InventoryItem, Transaction } from '../src/types'

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

  exportData: (): Promise<{ ok: boolean; filePath?: string }> =>
    ipcRenderer.invoke('data:export'),

  exportCsv: (): Promise<{ ok: boolean; filePath?: string }> =>
    ipcRenderer.invoke('data:export-csv'),

  createNote: (body: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> =>
    ipcRenderer.invoke('notes:create', body),

  updateNote: (id: string, partial: Partial<Note>): Promise<Note> =>
    ipcRenderer.invoke('notes:update', id, partial),

  deleteNote: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('notes:delete', id),

  browseFile: (): Promise<string | null> =>
    ipcRenderer.invoke('file:browse'),

  openFile: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('file:open', filePath),

  createStudent: (body: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> =>
    ipcRenderer.invoke('students:create', body),

  updateStudent: (id: string, updated: Student): Promise<Student> =>
    ipcRenderer.invoke('students:update', id, updated),

  deleteStudent: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('students:delete', id),

  // TSP
  createTSPProject: (data: Omit<TSPProject, 'id' | 'createdAt' | 'updatedAt' | 'slug'>): Promise<TSPProject> =>
    ipcRenderer.invoke('tsp:projects:create', data),

  updateTSPProject: (id: string, data: Partial<TSPProject>): Promise<TSPProject> =>
    ipcRenderer.invoke('tsp:projects:update', id, data),

  deleteTSPProject: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('tsp:projects:delete', id),

  createTSPTask: (body: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> =>
    ipcRenderer.invoke('tsp:tasks:create', body),

  updateTSPTask: (id: string, partial: Partial<Task>): Promise<Task> =>
    ipcRenderer.invoke('tsp:tasks:update', id, partial),

  deleteTSPTask: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('tsp:tasks:delete', id),

  createTSPDate: (body: Omit<DateEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DateEntry> =>
    ipcRenderer.invoke('tsp:dates:create', body),

  updateTSPDate: (id: string, partial: Partial<DateEntry>): Promise<DateEntry> =>
    ipcRenderer.invoke('tsp:dates:update', id, partial),

  deleteTSPDate: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('tsp:dates:delete', id),

  createInventoryItem: (body: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> =>
    ipcRenderer.invoke('tsp:inventory:create', body),

  updateInventoryItem: (id: string, partial: Partial<InventoryItem>): Promise<InventoryItem> =>
    ipcRenderer.invoke('tsp:inventory:update', id, partial),

  deleteInventoryItem: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('tsp:inventory:delete', id),

  importInventory: (items: InventoryItem[], txs: Transaction[]): Promise<{ ok: boolean; itemCount: number; txCount: number }> =>
    ipcRenderer.invoke('tsp:inventory:import', items, txs),

  createTransaction: (body: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> =>
    ipcRenderer.invoke('tsp:transactions:create', body),

  updateTransaction: (id: string, partial: Partial<Transaction>): Promise<Transaction> =>
    ipcRenderer.invoke('tsp:transactions:update', id, partial),

  deleteTransaction: (id: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('tsp:transactions:delete', id),
})
