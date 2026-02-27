'use client'

import { useState } from 'react'
import HomePage from './pages/HomePage'
import ProjectPage from './pages/ProjectPage'

export type View = { type: 'home' } | { type: 'project'; slug: string }

export default function App() {
  const [view, setView] = useState<View>({ type: 'home' })

  if (view.type === 'project') {
    return <ProjectPage slug={view.slug} onNavigate={setView} />
  }
  return <HomePage onNavigate={setView} />
}
