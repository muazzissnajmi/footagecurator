import { ChevronDown, HelpCircle, Plus, Settings } from 'lucide-react'

import { useWorkstationStore } from '@/store/useWorkstationStore'

const accentBorderMap = {
  blue: 'border-[color:var(--accent-blue)]',
  violet: 'border-[color:var(--accent-violet)]',
  amber: 'border-[color:var(--accent-amber)]',
  emerald: 'border-[color:var(--accent-emerald)]',
} as const

const accentDotMap = {
  blue: 'bg-[color:var(--accent-blue)]',
  violet: 'bg-[color:var(--accent-violet)]',
  amber: 'bg-[color:var(--accent-amber)]',
  emerald: 'bg-[color:var(--accent-emerald)]',
} as const

export function ScriptNavigator() {
  const paragraphs = useWorkstationStore(state => state.paragraphs)
  const activeParagraphId = useWorkstationStore(state => state.activeParagraphId)
  const activeSentenceId = useWorkstationStore(state => state.activeSentenceId)
  const trayClips = useWorkstationStore(state => state.trayClips)
  const setActiveParagraph = useWorkstationStore(state => state.setActiveParagraph)
  const setActiveSentence = useWorkstationStore(state => state.setActiveSentence)

  return (
    <aside className="flex h-full min-h-0 w-full flex-col px-4 py-5 lg:px-3 lg:py-6">
      <div className="mb-4 px-2">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.28em] text-[color:var(--text-dim)]">
            Script
          </p>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">{paragraphs.length} paragraphs</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {paragraphs.map((paragraph, index) => (
          <div
            key={paragraph.id}
            className={`overflow-hidden rounded-[18px] border bg-[linear-gradient(180deg,#101010_0%,#0d1313_100%)] shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition-colors ${
              activeParagraphId === paragraph.id
                ? 'border-[color:var(--accent-blue)]/40'
                : 'border-[color:var(--border-subtle)]'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveParagraph(paragraph.id)}
              className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
                  P{index + 1}
                </p>
                <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-4 text-[color:var(--text-primary)]">
                  {paragraph.sentences[0]?.text ?? paragraph.label}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex gap-1">
                  {paragraph.sentences.slice(0, 5).map(sentence => (
                    <span
                      key={sentence.id}
                      className={`h-1.5 w-1.5 rounded-full ${accentDotMap[sentence.accent]} ${
                        sentence.id === activeSentenceId ? 'shadow-[0_0_10px_currentColor]' : 'opacity-55'
                      }`}
                    />
                  ))}
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-[color:var(--text-muted)] transition-transform ${
                    activeParagraphId === paragraph.id ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {activeParagraphId === paragraph.id ? (
              <div className="space-y-2 px-2 pb-2">
                {paragraph.sentences.map(sentence => {
                  const isActive = sentence.id === activeSentenceId
                  const clipCount = trayClips.filter(
                    clip => clip.sentenceId === sentence.id
                  ).length

                  return (
                    <button
                      key={sentence.id}
                      type="button"
                      onClick={() => void setActiveSentence(sentence.id)}
                      className={`w-full rounded-[14px] border-l-2 px-3 py-2.5 text-left transition-colors ${accentBorderMap[sentence.accent]} ${
                        isActive
                          ? 'bg-[linear-gradient(180deg,#141822_0%,#12161d_100%)] shadow-[0_0_0_1px_rgba(59,130,246,0.34),0_0_24px_rgba(59,130,246,0.14)]'
                          : 'bg-black/24'
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-dim)]">
                          S{sentence.index + 1}
                        </span>
                        <div className="flex gap-1">
                          {Array.from({ length: 4 }).map((_, dotIndex) => (
                            <span
                              key={dotIndex}
                              className={`h-1.5 w-1.5 rounded-full ${accentDotMap[sentence.accent]} ${
                                dotIndex < Math.min(clipCount, 4)
                                  ? 'opacity-100'
                                  : 'opacity-25'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="line-clamp-2 text-[12px] leading-4 text-[color:var(--text-muted)]">
                        {sentence.text}
                      </p>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <button type="button" className="toolbar-button mt-5 justify-center rounded-2xl bg-[linear-gradient(180deg,#14181d_0%,#101418_100%)] py-3 text-[13px]">
        <Plus className="h-4 w-4" />
        New Asset
      </button>

      <div className="mt-5 space-y-2 px-2">
        <button type="button" className="flex items-center gap-2 text-[13px] text-[color:var(--text-dim)]">
          <HelpCircle className="h-3.5 w-3.5" />
          Help
        </button>
        <button type="button" className="flex items-center gap-2 text-[13px] text-[color:var(--text-dim)]">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </button>
      </div>
    </aside>
  )
}