# Task Manager

A desktop task management app built with Electron, React, and Tailwind CSS. Designed for managing work tasks across multiple projects with due dates, priorities, statuses, and repeating schedules.

![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Electron](https://img.shields.io/badge/electron-34-blue)
![React](https://img.shields.io/badge/react-19-blue)

## Features

- **Projects** — organize tasks across color-coded projects
- **Tasks** — title, due date, start date, status, priority, repeat schedule, notes, and URL link
- **Date entries** — track important dates separately from tasks
- **Timeline view** — visualize tasks and dates on a calendar
- **Repeating tasks** — auto-generates the next occurrence when marked done
- **Import** — extract dates from `.docx`, `.pdf`, `.txt`, or a URL
- **Filtering** — filter by project, status, priority, and date range

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [npm](https://www.npmjs.com/) 9+
- macOS (arm64 or x64)

## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build a local app bundle (outputs to release/mac-arm64)
npm run pack

# Build a distributable .dmg
npm run dist
```

## Project Structure

```
src/
  components/    # React UI components
  pages/         # Page-level views
  lib/           # Utility functions
  types.ts       # Shared TypeScript types
electron/
  main.ts        # Electron main process & IPC handlers
  preload.ts     # Context bridge (exposes API to renderer)
data/
  tasks.json     # Local data store (gitignored)
```

## Data Storage

All data is stored locally in `data/tasks.json` during development, or in the app's user data directory when running as a packaged app. No data is sent to any server.

## Tech Stack

- [Electron](https://www.electronjs.org/) — desktop shell
- [electron-vite](https://electron-vite.org/) — build tooling
- [React 19](https://react.dev/) — UI
- [Tailwind CSS v4](https://tailwindcss.com/) — styling
- [TypeScript](https://www.typescriptlang.org/) — type safety
