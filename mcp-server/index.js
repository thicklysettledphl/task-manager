#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'

// Data paths — prefers packaged app, falls back to dev
const PACKAGED_PATH = path.join(os.homedir(), 'Library/Application Support/work-tasks/tasks.json')
const DEV_PATH = path.join(os.homedir(), 'Project/tasks/data/tasks.json')

function getDataPath() {
  if (process.env.TASKS_DATA_PATH) return process.env.TASKS_DATA_PATH
  if (fs.existsSync(PACKAGED_PATH)) return PACKAGED_PATH
  return DEV_PATH
}

function readStore() {
  try {
    const raw = fs.readFileSync(getDataPath(), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { projects: [], tasks: [], dates: [], notes: [], students: [] }
  }
}

function writeStore(store) {
  const p = getDataPath()
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(store, null, 2))
}

function now() {
  return new Date().toISOString()
}

function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

// ── Server ──────────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'task-manager', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_projects',
      description: 'List all projects in the task manager. Call this first to get project IDs before creating tasks.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'list_tasks',
      description: 'List tasks, optionally filtered by project ID or status',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Filter by project ID' },
          status: {
            type: 'string',
            enum: ['not-started', 'in-progress', 'done', 'blocked'],
            description: 'Filter by status',
          },
        },
      },
    },
    {
      name: 'create_task',
      description: 'Create a new task in the task manager',
      inputSchema: {
        type: 'object',
        required: ['title', 'dueDate'],
        properties: {
          title: { type: 'string', description: 'Task title' },
          dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
          startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format (optional)' },
          projectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of project IDs to associate this task with',
          },
          status: {
            type: 'string',
            enum: ['not-started', 'in-progress', 'done', 'blocked'],
            description: 'Task status (default: not-started)',
          },
          priority: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: 'Task priority (default: medium)',
          },
          notes: { type: 'string', description: 'Task notes' },
          url: { type: 'string', description: 'Optional URL to attach to the task' },
          repeat: {
            type: 'string',
            enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
            description: 'Repeat interval (optional)',
          },
        },
      },
    },
    {
      name: 'update_task',
      description: 'Update an existing task by ID. Only include fields you want to change.',
      inputSchema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Task ID' },
          title: { type: 'string' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD' },
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          projectIds: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['not-started', 'in-progress', 'done', 'blocked'] },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          notes: { type: 'string' },
          url: { type: 'string' },
          repeat: { type: 'string', enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'] },
        },
      },
    },
    {
      name: 'create_date',
      description: 'Create a date entry (a deadline, milestone, or important date)',
      inputSchema: {
        type: 'object',
        required: ['title', 'date'],
        properties: {
          title: { type: 'string', description: 'Date entry title' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          projectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of project IDs',
          },
          notes: { type: 'string' },
          repeat: {
            type: 'string',
            enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'],
          },
        },
      },
    },
    {
      name: 'list_notes',
      description: 'List notes, optionally filtered by project ID',
      inputSchema: {
        type: 'object',
        properties: {
          projectId: { type: 'string', description: 'Filter by project ID' },
        },
      },
    },
    {
      name: 'create_note',
      description: 'Create a note',
      inputSchema: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          body: { type: 'string', description: 'Note body text' },
          projectIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of project IDs to associate this note with',
          },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    const store = readStore()

    if (name === 'list_projects') {
      return {
        content: [{ type: 'text', text: JSON.stringify(store.projects, null, 2) }],
      }
    }

    if (name === 'list_tasks') {
      let tasks = store.tasks
      if (args?.projectId) tasks = tasks.filter((t) => t.projectIds?.includes(args.projectId))
      if (args?.status) tasks = tasks.filter((t) => t.status === args.status)
      return {
        content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }],
      }
    }

    if (name === 'create_task') {
      const task = stripUndefined({
        id: randomUUID(),
        title: args.title,
        dueDate: args.dueDate,
        startDate: args.startDate,
        projectIds: args.projectIds ?? [],
        status: args.status ?? 'not-started',
        priority: args.priority ?? 'medium',
        notes: args.notes,
        url: args.url,
        repeat: args.repeat,
        createdAt: now(),
        updatedAt: now(),
      })
      store.tasks.push(task)
      writeStore(store)

      const projectNames = (args.projectIds ?? [])
        .map((id) => store.projects.find((p) => p.id === id)?.name ?? id)
        .join(', ')

      return {
        content: [
          {
            type: 'text',
            text: `Created task "${task.title}" due ${task.dueDate}${projectNames ? ` in ${projectNames}` : ''} (ID: ${task.id})`,
          },
        ],
      }
    }

    if (name === 'update_task') {
      const idx = store.tasks.findIndex((t) => t.id === args.id)
      if (idx === -1) {
        return {
          content: [{ type: 'text', text: `Task not found: ${args.id}` }],
          isError: true,
        }
      }
      const { id, ...updates } = args
      store.tasks[idx] = { ...store.tasks[idx], ...updates, updatedAt: now() }
      writeStore(store)
      return {
        content: [{ type: 'text', text: `Updated task "${store.tasks[idx].title}"` }],
      }
    }

    if (name === 'create_date') {
      const entry = stripUndefined({
        id: randomUUID(),
        title: args.title,
        date: args.date,
        projectIds: args.projectIds ?? [],
        notes: args.notes,
        repeat: args.repeat,
        createdAt: now(),
        updatedAt: now(),
      })
      store.dates.push(entry)
      writeStore(store)

      const projectNames = (args.projectIds ?? [])
        .map((id) => store.projects.find((p) => p.id === id)?.name ?? id)
        .join(', ')

      return {
        content: [
          {
            type: 'text',
            text: `Created date "${entry.title}" on ${entry.date}${projectNames ? ` in ${projectNames}` : ''} (ID: ${entry.id})`,
          },
        ],
      }
    }

    if (name === 'list_notes') {
      let notes = store.notes
      if (args?.projectId) notes = notes.filter((n) => n.projectIds?.includes(args.projectId))
      return {
        content: [{ type: 'text', text: JSON.stringify(notes, null, 2) }],
      }
    }

    if (name === 'create_note') {
      const note = {
        id: randomUUID(),
        title: args.title,
        body: args.body ?? '',
        checklistItems: [],
        projectIds: args.projectIds ?? [],
        createdAt: now(),
        updatedAt: now(),
      }
      store.notes.push(note)
      writeStore(store)
      return {
        content: [{ type: 'text', text: `Created note "${note.title}" (ID: ${note.id})` }],
      }
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    }
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    }
  }
})

const transport = new StdioServerTransport()
await server.connect(transport)
