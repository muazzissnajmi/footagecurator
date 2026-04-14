import { TranscriptInput } from '@/components'
import { WorkstationPage } from '@/pages/WorkstationPage'
import { useWorkstationStore } from '@/store/useWorkstationStore'

export default function App() {
  const paragraphsLength = useWorkstationStore(state => state.paragraphs.length)

  return (
    <div className="min-h-screen bg-[color:var(--surface-canvas)]">
      <nav className="flex items-center gap-6 border-b border-[color:var(--border-subtle)] px-8 py-4">
        <span className="font-display text-sm font-semibold tracking-[0.28em] text-[color:var(--text-muted)] uppercase">
          Footage Curator
        </span>
        <span className="border-b-2 border-[color:var(--accent-blue)] pb-1 text-sm uppercase tracking-[0.24em] text-[color:var(--accent-blue)]">
          Workstation
        </span>
      </nav>
      <WorkstationPage />
      {paragraphsLength === 0 ? <TranscriptInput /> : null}
    </div>
  )
}