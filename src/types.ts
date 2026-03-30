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
  // TSP workspace
  tspProjects: TSPProject[]
  tspTasks: Task[]
  tspDates: DateEntry[]
  inventoryItems: InventoryItem[]
  transactions: Transaction[]
}

// ── TSP Types ────────────────────────────────────────────────────────────────

export interface PipelineStage {
  id: string
  name: string
  order: number
}

export interface TSPProject {
  id: string
  name: string
  slug: string
  color: string
  url?: string
  description?: string
  artist?: string
  releaseDate?: string
  isPublication?: boolean
  notes?: string
  pipelineStages: PipelineStage[]
  currentStageId?: string
  createdAt: string
  updatedAt: string
}

export type InventoryItemType = 'book' | 'print' | 'shirt' | 'other'
export type TransactionType = 'sale' | 'gift' | 'personal_copy' | 'consignment' | 'wholesale' | 'restock'
export type PaymentMethod = 'cash' | 'venmo' | 'paypal' | 'shopify' | 'square' | 'consignment_wholesale' | 'none'

export interface InventoryItem {
  id: string
  type: InventoryItemType
  year: number
  title: string
  artist: string
  description?: string
  price: number
  initialStock: number
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: string
  itemId: string
  date: string
  type: TransactionType
  paymentMethod: PaymentMethod
  quantity: number
  unitPrice: number
  notes?: string
  createdAt: string
  updatedAt: string
}
