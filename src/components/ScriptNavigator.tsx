import { ChevronDown } from 'lucide-react'
import { useEffect } from 'react'

import { useWorkstationStore } from '@/store/useWorkstationStore'
import { accentBorderMap, accentDotMap } from '@/utils/accentColors'
import { getAdjacentSentenceId } from '@/utils/sentenceNavigation'

export function ScriptNavigator() {
  const paragraphs = useWorkstationStore(state => state.paragraphs)
  const activeParagraphId = useWorkstationStore(state => state.activeParagraphId)
  const activeSentenceId = useWorkstationStore(state => state.activeSentenceId)
  const trayClips = useWorkstationStore(state => state.trayClips)
  const setActiveParagraph = useWorkstationStore(state => state.setActiveParagraph)
  const setActiveSentence = useWorkstationStore(state => state.setActiveSentence)

  // Keyboard: Alt+Up / Alt+Down to navigate between sentences
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.altKey) return
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      const dir = event.key === 'ArrowDown' ? 1 : -1
      const next = getAdjacentSentenceId(paragraphs, activeSentenceId, dir)
      if (next) {
        event.preventDefault()
        void setActiveSentence(next)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [paragraphs, activeSentenceId, setActiveSentence])

  return (
    <aside className="flex h-full min-h-0 w-full flex-col px-4 py-5 lg:px-3 lg:py-6">
      <div className="mb-4 px-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--text-dim)]">
          Script
        </p>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          {paragraphs.length} {paragraphs.length === 1 ? 'paragraph' : 'paragraphs'}
          <span className="ml-2 text-[color:var(--text-dim)]">• Alt+↑↓ to navigate</span>
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {paragraphs.map((paragraph, index) => {
          const isParagraphActive = activeParagraphId === paragraph.id
          return (
            <div
              key={paragraph.id}
              className={`overflow-hidden rounded-[var(--radius-card)] border bg-[color:var(--surface-panel)] transition-colors ${
                isParagraphActive
                  ? 'border-[color:var(--accent-blue)]/40'
                  : 'border-[color:var(--border-subtle)]'
              }`}
            >
              <button
                type="button"
                aria-expanded={isParagraphActive}
                onClick={() => setActiveParagraph(paragraph.id)}
                className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
                    P{index + 1}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[14px] font-medium leading-5 text-[color:var(--text-primary)]">
                    {paragraph.sentences[0]?.text ?? paragraph.label}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="flex gap-1">
                    {paragraph.sentences.slice(0, 5).map(sentence => {
                      const count = trayClips.filter(
                        c => c.sentenceId === sentence.id
                      ).length
                      return (
                        <span
                          key={sentence.id}
                          className={`h-1.5 w-1.5 rounded-full ${accentDotMap[sentence.accent]} ${
                            count > 0 ? 'opacity-100' : 'opacity-35'
                          } ${
                            sentence.id === activeSentenceId
                              ? 'shadow-[0_0_8px_currentColor]'
                              : ''
                          }`}
                        />
                      )
                    })}
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-[color:var(--text-muted)] transition-transform ${
                      isParagraphActive ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {isParagraphActive ? (
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
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => void setActiveSentence(sentence.id)}
                        className={`w-full rounded-[var(--radius-control)] border-l-[3px] p-3 text-left transition-colors ${accentBorderMap[sentence.accent]} ${
                          isActive
                            ? 'bg-[color:var(--surface-raised)] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]'
                            : 'bg-[color:var(--surface-muted)]/60 hover:bg-[color:var(--surface-muted)]'
                        }`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-dim)]">
                            S{sentence.index + 1}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {Array.from({ length: 4 }).map((_, dotIndex) => (
                              <span
                                key={dotIndex}
                                className={`h-1.5 w-1.5 rounded-full ${accentDotMap[sentence.accent]} ${
                                  dotIndex < Math.min(clipCount, 4)
                                    ? 'opacity-100'
                                    : 'opacity-20'
                                }`}
                              />
                            ))}
                            <span className="font-mono ml-1 text-[10px] text-[color:var(--text-dim)]">
                              {clipCount}
                            </span>
                          </div>
                        </div>
                        <p className="line-clamp-2 text-[13px] leading-5 text-[color:var(--text-muted)]">
                          {sentence.text}
                        </p>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
