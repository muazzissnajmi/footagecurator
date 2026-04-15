import { ChevronRight, Film, FileUp, ListChecks, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import { sampleTranscript } from '@/data/sampleTranscript'
import { useWorkstationStore } from '@/store/useWorkstationStore'

const flowSteps = [
  { icon: FileUp, label: 'Paste script' },
  { icon: ListChecks, label: 'Pick sentence' },
  { icon: Search, label: 'Find footage' },
  { icon: Film, label: 'Download' },
]

export function TranscriptInput() {
  const [value, setValue] = useState('')
  const paragraphsLength = useWorkstationStore(state => state.paragraphs.length)
  const loadTranscript = useWorkstationStore(state => state.loadTranscript)

  const canParse = useMemo(() => value.trim().length > 0, [value])

  if (paragraphsLength > 0) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)] lg:p-8">
        <div className="flex flex-col gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[color:var(--text-dim)]">
              Transcript Input
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--text-primary)]">
              Load a narration to begin curation
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
              Paste your documentary script below, or start with the sample narration.
            </p>
          </div>

          {/* Flow indicator */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {flowSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-[var(--radius-chip)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] px-3 py-1.5">
                  <step.icon className="h-3.5 w-3.5 text-[color:var(--accent-blue)]" />
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                    {step.label}
                  </span>
                </div>
                {i < flowSteps.length - 1 ? (
                  <ChevronRight className="h-3.5 w-3.5 text-[color:var(--text-dim)]" />
                ) : null}
              </div>
            ))}
          </div>

          <textarea
            value={value}
            onChange={event => setValue(event.target.value)}
            placeholder="Paste transcript here..."
            className="min-h-[280px] w-full rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)]/72 px-5 py-4 text-sm leading-7 text-[color:var(--text-primary)] placeholder:text-[color:var(--text-dim)] focus:border-[color:var(--accent-blue)]/50"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => loadTranscript(sampleTranscript)}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] px-5 py-3 text-sm text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)]"
            >
              <Sparkles className="h-4 w-4 text-[color:var(--accent-amber)]" />
              Try a sample
            </button>
            <button
              type="button"
              onClick={() => loadTranscript(value.trim())}
              disabled={!canParse}
              className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 py-3 text-sm font-medium transition-opacity ${
                canParse
                  ? 'bg-[radial-gradient(circle_at_top,#8cb0ff_0%,#6d92fb_30%,#5476e1_65%,#3c5ccd_100%)] text-white shadow-[0_10px_24px_rgba(59,130,246,0.28)]'
                  : 'cursor-not-allowed bg-[color:var(--surface-muted)] text-[color:var(--text-dim)] opacity-60'
              }`}
            >
              Parse Transcript
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
