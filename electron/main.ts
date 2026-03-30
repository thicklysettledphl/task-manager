import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import mammoth from 'mammoth'
import pdfParse from 'pdf-parse'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx'
import type { Task, DateEntry, TaskStore, Note, Student, TSPProject, InventoryItem, Transaction } from '../src/types'

// ── Data store ─────────────────────────────────────────────────────────────

const DATA_PATH = app.isPackaged
  ? path.join(app.getPath('userData'), 'tasks.json')
  : path.join(__dirname, '../../data/tasks.json')

const DEFAULT_STORE: TaskStore = {
  dates: [],
  notes: [],
  students: [],
  projects: [
    { id: '1', name: 'Pre-Major Advising',      slug: 'pre-major-advising',   color: '#60a5fa' },
    { id: '2', name: 'Major and Minor Advising', slug: 'major-minor-advising', color: '#a78bfa' },
    { id: '3', name: 'Faculty Hiring',           slug: 'faculty-hiring',       color: '#f97316' },
    { id: '4', name: 'Course Rostering',         slug: 'course-rostering',     color: '#2dd4bf' },
    { id: '5', name: 'Department Budgeting',     slug: 'department-budgeting', color: '#4ade80' },
    { id: '6', name: 'Curriculum Committee',     slug: 'curriculum-committee', color: '#f87171' },
    { id: '7', name: 'Campus Partner Events',    slug: 'campus-partner-events',color: '#fbbf24' },
  ],
  tasks: [],
  tspProjects: [],
  tspTasks: [],
  tspDates: [],
  inventoryItems: [],
  transactions: [],
}

function readStore(): TaskStore {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8')
    const data = JSON.parse(raw) as Record<string, unknown>

    // Migrate tasks: projectId (old) → projectIds (new)
    const tasks = ((data.tasks as unknown[]) ?? []).map((t: unknown) => {
      const task = t as Record<string, unknown>
      if ('projectId' in task && !('projectIds' in task)) {
        const { projectId, ...rest } = task
        return { ...rest, projectIds: projectId ? [projectId] : [] }
      }
      return { ...task, projectIds: task.projectIds ?? [] }
    })

    // Ensure dates exist and have projectIds
    const dates = ((data.dates as unknown[]) ?? []).map((d: unknown) => {
      const entry = d as Record<string, unknown>
      return { ...entry, projectIds: entry.projectIds ?? [] }
    })

    const notes = ((data.notes as unknown[]) ?? []) as Note[]
    const students = ((data.students as unknown[]) ?? []) as Student[]
    const tspProjects = ((data.tspProjects as unknown[]) ?? []) as TSPProject[]
    const tspTasks = ((data.tspTasks as unknown[]) ?? []).map((t: unknown) => {
      const task = t as Record<string, unknown>
      return { ...task, projectIds: task.projectIds ?? [] }
    }) as Task[]
    const tspDates = ((data.tspDates as unknown[]) ?? []).map((d: unknown) => {
      const entry = d as Record<string, unknown>
      return { ...entry, projectIds: entry.projectIds ?? [] }
    }) as import('../src/types').DateEntry[]
    const inventoryItems = ((data.inventoryItems as unknown[]) ?? []) as InventoryItem[]
    const transactions = ((data.transactions as unknown[]) ?? []) as Transaction[]

    return { ...(data as unknown as TaskStore), tasks, dates, notes, students, tspProjects, tspTasks, tspDates, inventoryItems, transactions } as TaskStore
  } catch {
    return { ...DEFAULT_STORE, tasks: [], dates: [] }
  }
}

function writeStore(store: TaskStore): void {
  const dir = path.dirname(DATA_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), 'utf-8')
}

// ── Date extraction (replaces /api/import) ─────────────────────────────────

const MONTHS: Record<string, string> = {
  january: '01', jan: '01', february: '02', feb: '02',
  march: '03', mar: '03', april: '04', apr: '04', may: '05',
  june: '06', jun: '06', july: '07', jul: '07', august: '08', aug: '08',
  september: '09', sep: '09', sept: '09', october: '10', oct: '10',
  november: '11', nov: '11', december: '12', dec: '12',
}

function normYear(y: string): string {
  return y.length === 2 ? (y < '50' ? `20${y}` : `19${y}`) : y
}

function extractLabel(text: string, matchIndex: number, matchLength: number): string {
  const before = text.slice(Math.max(0, matchIndex - 220), matchIndex)
  const after = text.slice(matchIndex + matchLength, matchIndex + matchLength + 160)

  // Take the last sentence/clause fragment before the date
  const beforeParts = before.split(/[.\n!?]+/)
  let label = (beforeParts[beforeParts.length - 1] ?? '').trim()

  // Strip trailing connectors (by, on, is, of, :, —, etc.)
  label = label.replace(/\s+(by|on|is|are|of|in|the|a|an|for|at|to)\s*$/i, '').trim()
  label = label.replace(/\s*[:\-–—,]\s*$/, '').trim()

  // If still too short, try the clause after the date
  if (label.length < 4) {
    const afterParts = after.split(/[.\n!?]/)
    label = (afterParts[0] ?? '').replace(/^[,\-–—:\s]+/, '').trim()
    label = label.replace(/^\s*(by|on|is|at)\s+/i, '').trim()
  }

  if (label.length > 62) label = label.slice(0, 59) + '…'
  return label
}

function extractDates(text: string): { date: string; label: string; context: string }[] {
  const results: { date: string; label: string; context: string }[] = []
  const seen = new Set<string>()

  const patterns = [
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan\.?|feb\.?|mar\.?|apr\.?|jun\.?|jul\.?|aug\.?|sep\.?|sept\.?|oct\.?|nov\.?|dec\.?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4}|\d{2})?\b/gi,
    /\b(\d{1,2})(?:st|nd|rd|th)\s+of\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan\.?|feb\.?|mar\.?|apr\.?|jun\.?|jul\.?|aug\.?|sep\.?|sept\.?|oct\.?|nov\.?|dec\.?)(?:\s+(\d{4}|\d{2}))?\b/gi,
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
  ]

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    pattern.lastIndex = 0
    while ((match = pattern.exec(text)) !== null) {
      const ctx = text.slice(Math.max(0, match.index - 80), match.index + match[0].length + 80).replace(/\s+/g, ' ').trim()
      let iso: string | null = null

      if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(match[0])) {
        const p = match[0].split('/')
        iso = `${normYear(p[2])}-${p[0].padStart(2, '0')}-${p[1].padStart(2, '0')}`
      } else if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(match[1] ?? '')) {
        const m = MONTHS[(match[1] ?? '').toLowerCase().replace('.', '')]
        if (!m) continue
        const year = match[3] ? normYear(match[3]) : new Date().getFullYear().toString()
        iso = `${year}-${m}-${(match[2] ?? '1').replace(/\D/g, '').padStart(2, '0')}`
      } else if (/^\d{1,2}$/.test(match[1] ?? '')) {
        const m = MONTHS[(match[2] ?? '').toLowerCase().replace('.', '')]
        if (!m) continue
        const year = match[3] ? normYear(match[3]) : new Date().getFullYear().toString()
        iso = `${year}-${m}-${(match[1] ?? '1').replace(/\D/g, '').padStart(2, '0')}`
      }

      if (!iso || isNaN(new Date(iso).getTime())) continue
      if (!seen.has(iso)) {
        seen.add(iso)
        results.push({ date: iso, label: extractLabel(text, match.index, match[0].length), context: ctx })
      }
    }
  }
  return results.sort((a, b) => a.date.localeCompare(b.date))
}

// ── Repeat / date advancement ──────────────────────────────────────────────

function advanceDate(iso: string, repeat: string): string {
  const d = new Date(iso + 'T00:00:00')
  switch (repeat) {
    case 'daily':    d.setDate(d.getDate() + 1); break
    case 'weekly':   d.setDate(d.getDate() + 7); break
    case 'biweekly': d.setDate(d.getDate() + 14); break
    case 'monthly':  d.setMonth(d.getMonth() + 1); break
    case 'yearly':   d.setFullYear(d.getFullYear() + 1); break
  }
  return d.toISOString().split('T')[0]
}

// ── IPC handlers ───────────────────────────────────────────────────────────

ipcMain.handle('tasks:get', () => readStore())

ipcMain.handle('dates:create', (_e, body: Omit<DateEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString()
  const entry: DateEntry = { ...body, id: uuidv4(), createdAt: now, updatedAt: now }
  const store = readStore()
  store.dates.push(entry)
  writeStore(store)
  return entry
})

ipcMain.handle('dates:update', (_e, id: string, partial: Partial<DateEntry>) => {
  const store = readStore()
  const idx = store.dates.findIndex((d) => d.id === id)
  if (idx === -1) throw new Error('Not found')
  store.dates[idx] = { ...store.dates[idx], ...partial, id, updatedAt: new Date().toISOString() }
  writeStore(store)
  return store.dates[idx]
})

ipcMain.handle('dates:delete', (_e, id: string) => {
  const store = readStore()
  store.dates = store.dates.filter((d) => d.id !== id)
  writeStore(store)
  return { ok: true }
})

ipcMain.handle('dates:complete', (_e, id: string) => {
  const store = readStore()
  const idx = store.dates.findIndex((d) => d.id === id)
  if (idx === -1) throw new Error('Not found')
  const entry = store.dates[idx]
  if (!entry.repeat) throw new Error('No repeat set')
  const now = new Date().toISOString()
  const next: DateEntry = {
    ...entry,
    id: uuidv4(),
    date: advanceDate(entry.date, entry.repeat),
    createdAt: now,
    updatedAt: now,
  }
  store.dates.splice(idx, 1)
  store.dates.push(next)
  writeStore(store)
  return next
})

ipcMain.handle('tasks:create', (_e, body: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString()
  const task: Task = { ...body, id: uuidv4(), createdAt: now, updatedAt: now }
  const store = readStore()
  store.tasks.push(task)
  writeStore(store)
  return task
})

ipcMain.handle('tasks:update', (_e, id: string, partial: Partial<Task>) => {
  const store = readStore()
  const idx = store.tasks.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('Not found')
  store.tasks[idx] = { ...store.tasks[idx], ...partial, id, updatedAt: new Date().toISOString() }

  // Auto-create next occurrence when marked done
  const updated = store.tasks[idx]
  if (partial.status === 'done' && updated.repeat) {
    const now = new Date().toISOString()
    const { id: _id, createdAt: _c, updatedAt: _u, status: _s, ...rest } = updated
    const next: Task = {
      ...rest,
      id: uuidv4(),
      status: 'not-started',
      dueDate: advanceDate(updated.dueDate, updated.repeat),
      startDate: updated.startDate ? advanceDate(updated.startDate, updated.repeat) : undefined,
      createdAt: now,
      updatedAt: now,
    }
    store.tasks.push(next)
  }

  writeStore(store)
  return store.tasks[idx]
})

ipcMain.handle('tasks:delete', (_e, id: string) => {
  const store = readStore()
  store.tasks = store.tasks.filter((t) => t.id !== id)
  writeStore(store)
  return { ok: true }
})

ipcMain.handle('import:file', async (_e, buffer: ArrayBuffer, filename: string) => {
  const buf = Buffer.from(buffer)
  let text = ''
  if (filename.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: buf })
    text = result.value
  } else if (filename.endsWith('.pdf')) {
    const result = await pdfParse(buf)
    text = result.text
  } else {
    text = buf.toString('utf-8')
  }
  return { text: text.slice(0, 5000), dates: extractDates(text) }
})

ipcMain.handle('import:url', async (_e, url: string) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WorkTasksApp/1.0)' },
    })
    let text = await res.text()
    // Strip scripts, styles, then all HTML tags
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return { text: text.slice(0, 5000), dates: extractDates(text) }
  } finally {
    clearTimeout(timeout)
  }
})

ipcMain.handle('projects:create', (_e, data: { name: string; color: string; url?: string }) => {
  const store = readStore()
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const project = { id: uuidv4(), name: data.name, slug, color: data.color, url: data.url || undefined }
  store.projects.push(project)
  writeStore(store)
  return project
})

ipcMain.handle('data:export', async () => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Tasks',
    defaultPath: `tasks-export-${new Date().toISOString().slice(0, 10)}.docx`,
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
  })
  if (canceled || !filePath) return { ok: false }
  const store = readStore()

  const statusLabel: Record<string, string> = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    done: 'Done',
    blocked: 'Blocked',
  }

  const priorityLabel: Record<string, string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  }

  const children: Paragraph[] = [
    new Paragraph({
      text: 'Task Export',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
    }),
    new Paragraph({
      children: [new TextRun({ text: `Exported: ${new Date().toLocaleDateString()}`, color: '888888' })],
      spacing: { after: 400 },
    }),
  ]

  // Group tasks by project
  for (const project of store.projects) {
    const projectTasks = store.tasks.filter((t) => t.projectIds.includes(project.id))
    if (projectTasks.length === 0) continue

    children.push(
      new Paragraph({ text: project.name, heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
    )

    for (const task of projectTasks) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: task.title, bold: true })],
          spacing: { before: 200 },
        })
      )

      const meta: string[] = [
        `Status: ${statusLabel[task.status] ?? task.status}`,
        `Priority: ${priorityLabel[task.priority] ?? task.priority}`,
        `Due: ${task.dueDate}`,
      ]
      if (task.startDate) meta.push(`Start: ${task.startDate}`)
      if (task.repeat) meta.push(`Repeat: ${task.repeat}`)
      if (task.url) meta.push(`URL: ${task.url}`)

      children.push(
        new Paragraph({
          children: [new TextRun({ text: meta.join('  ·  '), color: '666666', size: 20 })],
        })
      )

      if (task.notes) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: task.notes, italics: true, size: 20 })],
            spacing: { after: 100 },
          })
        )
      }
    }
  }

  // Tasks with no project
  const unassigned = store.tasks.filter((t) => t.projectIds.length === 0)
  if (unassigned.length > 0) {
    children.push(
      new Paragraph({ text: 'Unassigned', heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } })
    )
    for (const task of unassigned) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: task.title, bold: true })], spacing: { before: 200 } })
      )
      const meta = [
        `Status: ${statusLabel[task.status] ?? task.status}`,
        `Priority: ${priorityLabel[task.priority] ?? task.priority}`,
        `Due: ${task.dueDate}`,
      ]
      if (task.startDate) meta.push(`Start: ${task.startDate}`)
      children.push(
        new Paragraph({ children: [new TextRun({ text: meta.join('  ·  '), color: '666666', size: 20 })] })
      )
      if (task.notes) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: task.notes, italics: true, size: 20 })], spacing: { after: 100 } })
        )
      }
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const buffer = await Packer.toBuffer(doc)
  fs.writeFileSync(filePath, buffer)
  return { ok: true, filePath }
})

ipcMain.handle('data:export-csv', async () => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Tasks as CSV',
    defaultPath: `tasks-export-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  })
  if (canceled || !filePath) return { ok: false }
  const store = readStore()

  function csvField(s: string): string {
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"'
    }
    return s
  }

  const rows: string[] = ['Due Date,Project,Title,Status,URL,Notes']
  for (const task of store.tasks) {
    const projectNames = store.projects
      .filter((p) => task.projectIds.includes(p.id))
      .map((p) => p.name)
      .join('; ')
    rows.push([
      csvField(task.dueDate),
      csvField(projectNames),
      csvField(task.title),
      csvField(task.status),
      csvField(task.url ?? ''),
      csvField(task.notes ?? ''),
    ].join(','))
  }

  fs.writeFileSync(filePath, rows.join('\n'), 'utf-8')
  return { ok: true, filePath }
})

ipcMain.handle('notes:create', (_e, body: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString()
  const note: Note = { ...body, id: uuidv4(), createdAt: now, updatedAt: now }
  const store = readStore()
  if (!store.notes) store.notes = []
  store.notes.push(note)
  writeStore(store)
  return note
})

ipcMain.handle('notes:update', (_e, id: string, partial: Partial<Note>) => {
  const store = readStore()
  if (!store.notes) store.notes = []
  const idx = store.notes.findIndex((n) => n.id === id)
  if (idx === -1) throw new Error('Note not found')
  store.notes[idx] = { ...store.notes[idx], ...partial, id, updatedAt: new Date().toISOString() }
  writeStore(store)
  return store.notes[idx]
})

ipcMain.handle('notes:delete', (_e, id: string) => {
  const store = readStore()
  if (!store.notes) store.notes = []
  store.notes = store.notes.filter((n) => n.id !== id)
  writeStore(store)
  return { ok: true }
})

ipcMain.handle('projects:update', (_e, id: string, data: { name: string; color: string; url?: string }) => {
  const store = readStore()
  const idx = store.projects.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('Project not found')
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  store.projects[idx] = { ...store.projects[idx], name: data.name, slug, color: data.color, url: data.url || undefined }
  writeStore(store)
  return store.projects[idx]
})

// ── TSP Project handlers ────────────────────────────────────────────────────

function makeTSPSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

ipcMain.handle('tsp:projects:create', (_e, data: Omit<TSPProject, 'id' | 'createdAt' | 'updatedAt' | 'slug'>) => {
  const now = new Date().toISOString()
  const project: TSPProject = { ...data, id: uuidv4(), slug: makeTSPSlug(data.name), pipelineStages: data.pipelineStages ?? [], createdAt: now, updatedAt: now }
  const store = readStore()
  if (!store.tspProjects) store.tspProjects = []
  store.tspProjects.push(project)
  writeStore(store)
  return project
})

ipcMain.handle('tsp:projects:update', (_e, id: string, data: Partial<TSPProject>) => {
  const store = readStore()
  if (!store.tspProjects) store.tspProjects = []
  const idx = store.tspProjects.findIndex((p) => p.id === id)
  if (idx === -1) throw new Error('TSP project not found')
  const updated = { ...store.tspProjects[idx], ...data, id, updatedAt: new Date().toISOString() }
  if (data.name) updated.slug = makeTSPSlug(data.name)
  store.tspProjects[idx] = updated
  writeStore(store)
  return store.tspProjects[idx]
})

ipcMain.handle('tsp:projects:delete', (_e, id: string) => {
  const store = readStore()
  if (!store.tspProjects) store.tspProjects = []
  store.tspProjects = store.tspProjects.filter((p) => p.id !== id)
  writeStore(store)
  return { ok: true }
})

// ── TSP Task handlers ───────────────────────────────────────────────────────

ipcMain.handle('tsp:tasks:create', (_e, body: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString()
  const task: Task = { ...body, id: uuidv4(), createdAt: now, updatedAt: now }
  const store = readStore()
  if (!store.tspTasks) store.tspTasks = []
  store.tspTasks.push(task)
  writeStore(store)
  return task
})

ipcMain.handle('tsp:tasks:update', (_e, id: string, partial: Partial<Task>) => {
  const store = readStore()
  if (!store.tspTasks) store.tspTasks = []
  const idx = store.tspTasks.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('TSP task not found')
  store.tspTasks[idx] = { ...store.tspTasks[idx], ...partial, id, updatedAt: new Date().toISOString() }
  if (partial.status === 'done' && store.tspTasks[idx].repeat) {
    const updated = store.tspTasks[idx]
    const now = new Date().toISOString()
    const { id: _id, createdAt: _c, updatedAt: _u, status: _s, ...rest } = updated
    store.tspTasks.push({ ...rest, id: uuidv4(), status: 'not-started', dueDate: advanceDate(updated.dueDate, updated.repeat!), createdAt: now, updatedAt: now })
  }
  writeStore(store)
  return store.tspTasks[idx]
})

ipcMain.handle('tsp:tasks:delete', (_e, id: string) => {
  const store = readStore()
  if (!store.tspTasks) store.tspTasks = []
  store.tspTasks = store.tspTasks.filter((t) => t.id !== id)
  writeStore(store)
  return { ok: true }
})

// ── TSP Date handlers ───────────────────────────────────────────────────────

ipcMain.handle('tsp:dates:create', (_e, body: Omit<import('../src/types').DateEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString()
  const entry = { ...body, id: uuidv4(), createdAt: now, updatedAt: now }
  const store = readStore()
  if (!store.tspDates) store.tspDates = []
  store.tspDates.push(entry)
  writeStore(store)
  return entry
})

ipcMain.handle('tsp:dates:update', (_e, id: string, partial: Partial<import('../src/types').DateEntry>) => {
  const store = readStore()
  if (!store.tspDates) store.tspDates = []
  const idx = store.tspDates.findIndex((d) => d.id === id)
  if (idx === -1) throw new Error('TSP date not found')
  store.tspDates[idx] = { ...store.tspDates[idx], ...partial, id, updatedAt: new Date().toISOString() }
  writeStore(store)
  return store.tspDates[idx]
})

ipcMain.handle('tsp:dates:delete', (_e, id: string) => {
  const store = readStore()
  if (!store.tspDates) store.tspDates = []
  store.tspDates = store.tspDates.filter((d) => d.id !== id)
  writeStore(store)
  return { ok: true }
})

// ── Inventory handlers ──────────────────────────────────────────────────────

ipcMain.handle('tsp:inventory:create', (_e, body: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString()
  const item: InventoryItem = { ...body, id: uuidv4(), createdAt: now, updatedAt: now }
  const store = readStore()
  if (!store.inventoryItems) store.inventoryItems = []
  store.inventoryItems.push(item)
  writeStore(store)
  return item
})

ipcMain.handle('tsp:inventory:update', (_e, id: string, partial: Partial<InventoryItem>) => {
  const store = readStore()
  if (!store.inventoryItems) store.inventoryItems = []
  const idx = store.inventoryItems.findIndex((i) => i.id === id)
  if (idx === -1) throw new Error('Inventory item not found')
  store.inventoryItems[idx] = { ...store.inventoryItems[idx], ...partial, id, updatedAt: new Date().toISOString() }
  writeStore(store)
  return store.inventoryItems[idx]
})

ipcMain.handle('tsp:inventory:delete', (_e, id: string) => {
  const store = readStore()
  if (!store.inventoryItems) store.inventoryItems = []
  store.inventoryItems = store.inventoryItems.filter((i) => i.id !== id)
  writeStore(store)
  return { ok: true }
})

// ── Transaction handlers ────────────────────────────────────────────────────

ipcMain.handle('tsp:transactions:create', (_e, body: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString()
  const tx: Transaction = { ...body, id: uuidv4(), createdAt: now, updatedAt: now }
  const store = readStore()
  if (!store.transactions) store.transactions = []
  store.transactions.push(tx)
  writeStore(store)
  return tx
})

ipcMain.handle('tsp:transactions:update', (_e, id: string, partial: Partial<Transaction>) => {
  const store = readStore()
  if (!store.transactions) store.transactions = []
  const idx = store.transactions.findIndex((t) => t.id === id)
  if (idx === -1) throw new Error('Transaction not found')
  store.transactions[idx] = { ...store.transactions[idx], ...partial, id, updatedAt: new Date().toISOString() }
  writeStore(store)
  return store.transactions[idx]
})

ipcMain.handle('tsp:transactions:delete', (_e, id: string) => {
  const store = readStore()
  if (!store.transactions) store.transactions = []
  store.transactions = store.transactions.filter((t) => t.id !== id)
  writeStore(store)
  return { ok: true }
})

// ── TSP Inventory import (from Supabase JSON export) ───────────────────────

ipcMain.handle('tsp:inventory:import', async (_e, items: InventoryItem[], txs: Transaction[]) => {
  const store = readStore()
  if (!store.inventoryItems) store.inventoryItems = []
  if (!store.transactions) store.transactions = []
  const now = new Date().toISOString()
  // Merge by id to avoid duplicates
  const existingItemIds = new Set(store.inventoryItems.map((i) => i.id))
  const existingTxIds = new Set(store.transactions.map((t) => t.id))
  for (const item of items) {
    if (!existingItemIds.has(item.id)) {
      store.inventoryItems.push({ ...item, createdAt: item.createdAt ?? now, updatedAt: item.updatedAt ?? now })
    }
  }
  for (const tx of txs) {
    if (!existingTxIds.has(tx.id)) {
      store.transactions.push({ ...tx, createdAt: tx.createdAt ?? now, updatedAt: tx.updatedAt ?? now })
    }
  }
  writeStore(store)
  return { ok: true, itemCount: items.length, txCount: txs.length }
})

// ── Single instance lock ────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const wins = BrowserWindow.getAllWindows()
    if (wins.length > 0) {
      const win = wins[0]
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })
}

ipcMain.handle('file:browse', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'] })
  if (canceled || filePaths.length === 0) return null
  return filePaths[0]
})

ipcMain.handle('file:open', async (_e, filePath: string) => {
  const err = await shell.openPath(filePath)
  return err || null  // null on success, error string on failure
})

ipcMain.handle('students:create', (_e, body: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = new Date().toISOString()
  const student: Student = { ...body, id: uuidv4(), createdAt: now, updatedAt: now }
  const store = readStore()
  if (!store.students) store.students = []
  store.students.push(student)
  writeStore(store)
  return student
})

ipcMain.handle('students:update', (_e, id: string, updated: Student) => {
  const store = readStore()
  if (!store.students) store.students = []
  const idx = store.students.findIndex((s) => s.id === id)
  if (idx === -1) throw new Error('Student not found')
  store.students[idx] = { ...updated, id, updatedAt: new Date().toISOString() }
  writeStore(store)
  return store.students[idx]
})

ipcMain.handle('students:delete', (_e, id: string) => {
  const store = readStore()
  if (!store.students) store.students = []
  store.students = store.students.filter((s) => s.id !== id)
  writeStore(store)
  return { ok: true }
})

// ── Window ─────────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f11',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark'
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
