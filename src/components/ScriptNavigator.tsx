import { ChevronDown, SkipForward } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { useWorkstationStore } from '@/store/useWorkstationStore'
import { accentBorderMap, accentDotMap } from '@/utils/accentColors'
import {
  MAX_CLIPS_PER_SENTENCE,
  countClipsForSentence,
} from '@/utils/progress'

export function ScriptNavigator() {
  const paragraphs = useWorkstationStore(state => state.paragraphs)
  const activeParagraphId = useWorkstationStore(state => state.activeParagraphId)
  const activeSentenceId = useWorkstationStore(state => state.activeSentenceId)
  const trayClips = useWorkstationStore(state => state.trayClips)
  const skippedSentences = useWorkstationStore(state => state.skippedSentences)
  const setActiveParagraph = useWorkstationStore(state => state.setActiveParagraph)
  const setActiveSentence = useWorkstationStore(state => state.setActiveSentence)
  const toggleSkipSentence = useWorkstationStore(state => state.toggleSkipSentence)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeRef = useRef<HTMLButtonElement | null>(null)

  // Auto-scroll active sentence into view when it changes.
  useEffect(() => {
    if (!activeSentenceId || !activeRef.current) return
    activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeSentenceId])

  return (
    <aside className="flex h-full min-h-0 w-full flex-col px-4 py-5 lg:px-3 lg:py-6">
      <div className="mb-4 px-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[color:var(--text-dim)]">
          Script
        </p>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          {paragraphs.length} {paragraphs.length === 1 ? 'paragraph' : 'paragraphs'}
          <span className="ml-2 text-[color:var(--text-dim)]">• J/K or Alt+↑↓ • ? for help</span>
        </p>
      </div>

      <div ref={containerRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
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
                      const skipped = Boolean(skippedSentences[sentence.id])
                      return (
                        <span
                          key={sentence.id}
                          className={`h-1.5 w-1.5 rounded-full ${accentDotMap[sentence.accent]} ${
                            count > 0 || skipped ? 'opacity-100' : 'opacity-35'
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
                    const clipCount = countClipsForSentence(
                      trayClips,
                      sentence.id
                    )
                    const skipped = Boolean(skippedSentences[sentence.id])

                    return (
                      <button
                        key={sentence.id}
                        ref={isActive ? activeRef : undefined}
                        type="button"
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => void setActiveSentence(sentence.id)}
                        className={`w-full rounded-[var(--radius-control)] border-l-[3px] p-3 text-left transition-colors ${accentBorderMap[sentence.accent]} ${
                          isActive
                            ? 'bg-[color:var(--surface-raised)] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.25)]'
                            : 'bg-[color:var(--surface-muted)]/60 hover:bg-[color:var(--surface-muted)]'
                        } ${skipped ? 'opacity-60' : ''}`}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-dim)]">
                            S{sentence.index + 1}
                            {skipped ? (
                              <span className="ml-2 rounded-full bg-[color:var(--surface-raised)] px-1.5 py-0.5 text-[9px] text-[color:var(--text-muted)]">
                                SKIPPED
                              </span>
                            ) : null}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              role="button"
                              tabIndex={0}
                              aria-label={
                                skipped ? 'Unskip sentence' : 'Skip sentence'
                              }
                              onClick={event => {
                                event.stopPropagation()
                                toggleSkipSentence(sentence.id)
                              }}
                              onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  toggleSkipSentence(sentence.id)
                                }
                              }}
                              className={`mr-1 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                                skipped
                                  ? 'border-[color:var(--accent-amber)]/40 bg-[color:var(--accent-amber)]/15 text-[color:var(--accent-amber)]'
                                  : 'border-[color:var(--border-subtle)] text-[color:var(--text-dim)] hover:text-[color:var(--text-primary)]'
                              }`}
                            >
                              <SkipForward className="h-2.5 w-2.5" />
                            </span>
                            {Array.from({ length: MAX_CLIPS_PER_SENTENCE }).map(
                              (_, dotIndex) => (
                                <span
                                  key={dotIndex}
                                  className={`h-1.5 w-1.5 rounded-full ${accentDotMap[sentence.accent]} ${
                                    skipped
                                      ? 'opacity-25'
                                      : dotIndex <
                                          Math.min(
                                            clipCount,
                                            MAX_CLIPS_PER_SENTENCE
                                          )
                                        ? 'opacity-100'
                                        : 'opacity-20'
                                  }`}
                                />
                              )
                            )}
                            <span className="font-mono ml-1 text-[10px] text-[color:var(--text-dim)]">
                              {skipped ? '—' : clipCount}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`line-clamp-2 text-[13px] leading-5 text-[color:var(--text-muted)] ${
                            skipped ? 'line-through' : ''
                          }`}
                        >
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
