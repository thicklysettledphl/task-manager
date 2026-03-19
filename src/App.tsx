'use client'

import { useState } from 'react'
import HomePage from './pages/HomePage'
import ProjectPage from './pages/ProjectPage'
import NotesPage from './pages/NotesPage'
import SearchPage from './pages/SearchPage'
import ArchivePage from './pages/ArchivePage'

export type View =
  | { type: 'home' }
  | { type: 'project'; slug: string }
  | { type: 'notes'; noteId?: string }
  | { type: 'search'; query: string }
  | { type: 'archive' }

export default function App() {
  const [view, setView] = useState<View>({ type: 'home' })

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div style={{ WebkitAppRegion: 'drag', height: 28, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 } as any} />
      {view.type === 'notes'
        ? <NotesPage onNavigate={setView} initialNoteId={view.noteId} />
        : view.type === 'search'
          ? <SearchPage query={view.query} onNavigate={setView} />
          : view.type === 'archive'
            ? <ArchivePage onNavigate={setView} />
            : view.type === 'project'
              ? <ProjectPage slug={view.slug} onNavigate={setView} />
              : <HomePage onNavigate={setView} />
      }
    </>
  )
}
