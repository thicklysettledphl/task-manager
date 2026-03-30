'use client'

import { useState } from 'react'
import HomePage from './pages/HomePage'
import ProjectPage from './pages/ProjectPage'
import NotesPage from './pages/NotesPage'
import SearchPage from './pages/SearchPage'
import ArchivePage from './pages/ArchivePage'
import AdvisingPage from './pages/AdvisingPage'
import TSPDashboardPage from './pages/tsp/TSPDashboardPage'
import TSPProjectPage from './pages/tsp/TSPProjectPage'
import TSPTasksPage from './pages/tsp/TSPTasksPage'
import TSPDatesPage from './pages/tsp/TSPDatesPage'
import TSPInventoryPage from './pages/tsp/TSPInventoryPage'
import TSPTransactionsPage from './pages/tsp/TSPTransactionsPage'

export type Workspace = 'work' | 'tsp'

export type View =
  | { type: 'home' }
  | { type: 'project'; slug: string }
  | { type: 'notes'; noteId?: string }
  | { type: 'search'; query: string }
  | { type: 'archive' }
  | { type: 'advising' }
  // TSP views
  | { type: 'tsp-dashboard' }
  | { type: 'tsp-project'; slug: string }
  | { type: 'tsp-tasks' }
  | { type: 'tsp-dates' }
  | { type: 'tsp-inventory' }
  | { type: 'tsp-transactions' }

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>('work')
  const [view, setView] = useState<View>({ type: 'home' })

  function switchWorkspace(ws: Workspace) {
    setWorkspace(ws)
    setView(ws === 'tsp' ? { type: 'tsp-dashboard' } : { type: 'home' })
  }

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div style={{ WebkitAppRegion: 'drag', height: 28, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 } as any} />
      {view.type === 'notes'
        ? <NotesPage onNavigate={setView} initialNoteId={view.noteId} />
        : view.type === 'search'
          ? <SearchPage query={view.query} workspace={workspace} onNavigate={setView} onSwitchWorkspace={switchWorkspace} />
          : view.type === 'archive'
            ? <ArchivePage onNavigate={setView} />
            : view.type === 'advising'
              ? <AdvisingPage onNavigate={setView} />
              : view.type === 'project'
                ? <ProjectPage slug={view.slug} onNavigate={setView} />
                : view.type === 'tsp-dashboard'
                  ? <TSPDashboardPage onNavigate={setView} onSwitchWorkspace={switchWorkspace} />
                  : view.type === 'tsp-project'
                    ? <TSPProjectPage slug={view.slug} onNavigate={setView} onSwitchWorkspace={switchWorkspace} />
                    : view.type === 'tsp-tasks'
                      ? <TSPTasksPage onNavigate={setView} onSwitchWorkspace={switchWorkspace} />
                      : view.type === 'tsp-dates'
                        ? <TSPDatesPage onNavigate={setView} onSwitchWorkspace={switchWorkspace} />
                        : view.type === 'tsp-inventory'
                          ? <TSPInventoryPage onNavigate={setView} onSwitchWorkspace={switchWorkspace} />
                          : view.type === 'tsp-transactions'
                            ? <TSPTransactionsPage onNavigate={setView} onSwitchWorkspace={switchWorkspace} />
                            : <HomePage onNavigate={setView} onSwitchWorkspace={switchWorkspace} />
      }
    </>
  )
}
