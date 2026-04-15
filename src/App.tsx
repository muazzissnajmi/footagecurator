import { FilePlus2 } from 'lucide-react'

import { TranscriptInput } from '@/components'
import { WorkstationPage } from '@/pages/WorkstationPage'
import { useWorkstationStore } from '@/store/useWorkstationStore'

export default function App() {
  const paragraphsLength = useWorkstationStore(state => state.paragraphs.length)
  const resetProject = useWorkstationStore(state => state.resetProject)

  const handleNewProject = () => {
    if (paragraphsLength === 0) {
      resetProject()
      return
    }
    const confirmed = window.confirm(
      'Start a new project? This will clear the current transcript, all tray clips, and cached results. This cannot be undone.'
    )
    if (confirmed) {
      resetProject()
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--surface-canvas)]">
      <nav className="flex items-center gap-6 border-b border-[color:var(--border-subtle)] px-8 py-4">
        <span className="font-display text-sm font-semibold tracking-[0.28em] text-[color:var(--text-muted)] uppercase">
          Footage Curator
        </span>
        <span className="border-b-2 border-[color:var(--accent-blue)] pb-1 text-sm uppercase tracking-[0.24em] text-[color:var(--accent-blue)]">
          Workstation
        </span>
        <button
          type="button"
          onClick={handleNewProject}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          New Project
        </button>
      </nav>
      <WorkstationPage />
      {paragraphsLength === 0 ? <TranscriptInput /> : null}
    </div>
  )
}
