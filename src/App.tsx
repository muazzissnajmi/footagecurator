import { useState } from 'react'

import { TranscriptInput } from '@/components'
import { WorkstationPage } from '@/pages/WorkstationPage'
import { EditorPage } from '@/pages/EditorPage'
import { useWorkstationStore } from '@/store/useWorkstationStore'

type Tab = 'workstation' | 'editor'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('workstation')
  const paragraphsLength = useWorkstationStore(state => state.paragraphs.length)

  return (
    <div className="min-h-screen bg-[color:var(--surface-canvas)]">
      <nav className="flex items-center gap-6 border-b border-[color:var(--border-subtle)] px-8 py-4">
        <span className="font-display text-sm font-semibold tracking-[0.28em] text-[color:var(--text-muted)] uppercase">
          Footage Curator
        </span>
        <div className="flex gap-4">
          {(['workstation', 'editor'] as Tab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-1 text-sm uppercase tracking-[0.24em] transition-colors ${
                activeTab === tab
                  ? 'border-[color:var(--accent-blue)] text-[color:var(--accent-blue)]'
                  : 'border-transparent text-[color:var(--text-muted)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </nav>
      {activeTab === 'workstation' ? <WorkstationPage /> : <EditorPage />}
      {paragraphsLength === 0 ? <TranscriptInput /> : null}
    </div>
  )
}