'use client'

import { useState } from 'react'
import HomePage from './pages/HomePage'
import ProjectPage from './pages/ProjectPage'

export type View = { type: 'home' } | { type: 'project'; slug: string }

export default function App() {
  const [view, setView] = useState<View>({ type: 'home' })

  return (
    <>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div style={{ WebkitAppRegion: 'drag', height: 28, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 } as any} />
      {view.type === 'project'
        ? <ProjectPage slug={view.slug} onNavigate={setView} />
        : <HomePage onNavigate={setView} />
      }
    </>
  )
}
