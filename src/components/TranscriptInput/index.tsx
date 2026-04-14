import { FileUp, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import { sampleTranscript } from '@/data/sampleTranscript'
import { useWorkstationStore } from '@/store/useWorkstationStore'

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
      <div className="w-full max-w-4xl rounded-[32px] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,#101618_0%,#0d1113_100%)] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.42)] lg:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-[11px] uppercase tracking-[0.32em] text-[color:var(--text-dim)]">
                Transcript Input
              </p>
              <h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.03em] text-[color:var(--text-primary)]">
                Load a narration to begin curation
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-muted)]">
                Paste your documentary script below or start with the sample narration.
              </p>
            </div>
            <div className="hidden h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] text-[color:var(--accent-blue)] lg:flex">
              <FileUp className="h-5 w-5" />
            </div>
          </div>

          <textarea
            value={value}
            onChange={event => setValue(event.target.value)}
            placeholder="Paste transcript here..."
            className="min-h-[320px] w-full rounded-[24px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)]/72 px-5 py-4 text-sm leading-7 text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-dim)]"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => loadTranscript(sampleTranscript)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-5 py-3 text-sm text-[color:var(--text-primary)]"
            >
              <Sparkles className="h-4 w-4 text-[color:var(--accent-amber)]" />
              Load Sample
            </button>
            <button
              type="button"
              onClick={() => loadTranscript(value.trim())}
              disabled={!canParse}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-opacity ${
                canParse
                  ? 'bg-[radial-gradient(circle_at_top,#8cb0ff_0%,#6d92fb_30%,#5476e1_65%,#3c5ccd_100%)] text-white shadow-[0_14px_30px_rgba(59,130,246,0.34)]'
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