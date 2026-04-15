import clsx from 'clsx'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { CandidateClip, ParsedSentence } from '@/types'
import { useWorkstationStore } from '@/store/useWorkstationStore'
import { accentDotMap } from '@/utils/accentColors'
import {
  flattenSentences,
  getAdjacentSentenceId,
  getSentencePosition,
} from '@/utils/sentenceNavigation'

const HOVER_PLAY_DELAY = 180

function ClipCard({
  clip,
  index,
  onAdd,
}: {
  clip: CandidateClip
  index: number
  onAdd: (clip: CandidateClip) => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [justAdded, setJustAdded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let timeoutId: number | undefined
    if (isHovered && clip.videoUrl) {
      timeoutId = window.setTimeout(() => {
        setShowVideo(true)
        void videoRef.current?.play().catch(() => {})
      }, HOVER_PLAY_DELAY)
    } else {
      setShowVideo(false)
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
      }
    }
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [isHovered, clip.videoUrl])

  const handleAdd = () => {
    if (clip.added) return
    onAdd(clip)
    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 620)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleAdd()
    }
  }

  return (
    <article
      ref={articleRef}
      tabIndex={0}
      role="button"
      aria-label={`Add ${clip.title} to assembly`}
      aria-pressed={clip.added}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      style={{ animationDelay: `${Math.min(index * 40, 200)}ms` }}
      className={clsx(
        'clip-fade-in group overflow-hidden rounded-[var(--radius-card)] border bg-[linear-gradient(180deg,#141a1c_0%,#121819_100%)] transition-colors',
        clip.added
          ? 'border-[color:var(--accent-blue)]/45'
          : 'border-[color:var(--border-subtle)] hover:border-[color:var(--border-strong)]',
        justAdded && 'added-pulse'
      )}
    >
      <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${clip.palette}`}>
        <img
          src={clip.thumbnail}
          alt={clip.title}
          className={clsx(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            showVideo ? 'opacity-0' : 'opacity-100'
          )}
        />
        {clip.videoUrl ? (
          <video
            ref={videoRef}
            src={clip.videoUrl}
            className={clsx(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
              showVideo ? 'opacity-100' : 'opacity-0'
            )}
            muted
            loop
            playsInline
            preload="none"
          />
        ) : null}
        {/* Play hint */}
        {!showVideo && clip.videoUrl ? (
          <div
            className={clsx(
              'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          </div>
        ) : null}
        <span className="font-mono absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] text-white">
          {clip.duration}
        </span>
        <span className="font-mono absolute left-2 bottom-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
          {clip.resolution}
        </span>
      </div>
      <div className="space-y-3 p-3">
        <p className="truncate text-[14px] leading-5 text-[color:var(--text-primary)]">
          {clip.title}
        </p>
        <button
          type="button"
          onClick={event => {
            event.stopPropagation()
            handleAdd()
          }}
          disabled={clip.added}
          className={clsx(
            'w-full rounded-[var(--radius-control)] border px-3 py-2 text-sm transition-colors',
            clip.added
              ? 'border-[color:var(--accent-blue)]/35 bg-[color:var(--accent-blue)]/15 text-[color:var(--accent-blue)]'
              : 'border-[color:var(--border-subtle)] bg-transparent text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)]'
          )}
        >
          {clip.added ? '✓ Added to assembly' : 'Add to assembly'}
        </button>
      </div>
    </article>
  )
}

export function CandidateWorkspace() {
  const paragraphs = useWorkstationStore(state => state.paragraphs)
  const activeSentenceId = useWorkstationStore(state => state.activeSentenceId)
  const keywords = useWorkstationStore(state => state.keywords)
  const activeKeyword = useWorkstationStore(state => state.activeKeyword)
  const candidateClips = useWorkstationStore(state => state.candidateClips)
  const isGeneratingKeywords = useWorkstationStore(
    state => state.isGeneratingKeywords
  )
  const isLoadingCandidates = useWorkstationStore(
    state => state.isLoadingCandidates
  )
  const setActiveSentence = useWorkstationStore(state => state.setActiveSentence)
  const setActiveKeyword = useWorkstationStore(state => state.setActiveKeyword)
  const addCustomKeyword = useWorkstationStore(state => state.addCustomKeyword)
  const nextPage = useWorkstationStore(state => state.nextPage)
  const hasMorePages = useWorkstationStore(state => state.hasMorePages)
  const addToTray = useWorkstationStore(state => state.addToTray)
  const [searchInput, setSearchInput] = useState(activeKeyword ?? '')
  const [customKeywordInput, setCustomKeywordInput] = useState('')
  const [isAddingKeyword, setIsAddingKeyword] = useState(false)

  useEffect(() => {
    setSearchInput(activeKeyword ?? '')
  }, [activeKeyword])

  const activeSentence: ParsedSentence | null =
    flattenSentences(paragraphs).find(s => s.id === activeSentenceId) ?? null

  const position = getSentencePosition(paragraphs, activeSentenceId)
  const prevId = getAdjacentSentenceId(paragraphs, activeSentenceId, -1)
  const nextId = getAdjacentSentenceId(paragraphs, activeSentenceId, 1)

  const skeletonCards = Array.from({ length: 4 })

  const handleSearch = () => {
    const keyword = searchInput.trim()
    if (!keyword) return
    void setActiveKeyword(keyword)
  }

  const handleAddCustomKeyword = () => {
    const value = customKeywordInput.trim()
    if (!value) {
      setIsAddingKeyword(false)
      return
    }
    addCustomKeyword(value)
    setCustomKeywordInput('')
    setIsAddingKeyword(false)
  }

  const isSentenceLoading = isGeneratingKeywords || isLoadingCandidates

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-5 py-5 lg:px-6 lg:py-6">
        {/* Header + sentence position */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <h1 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
            Clip Finder
          </h1>
          {activeSentence ? (
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
              Sentence {position.current} / {position.total}
            </span>
          ) : null}
        </div>

        {/* Docked active sentence with prev/next */}
        <div
          className={clsx(
            'mb-4 rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] px-4 py-4 transition-colors',
            isSentenceLoading && 'border-[color:var(--accent-blue)]/30'
          )}
        >
          {activeSentence ? (
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => prevId && void setActiveSentence(prevId)}
                disabled={!prevId}
                aria-label="Previous sentence"
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${accentDotMap[activeSentence.accent]}`}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-dim)]">
                    S{activeSentence.index + 1}
                  </span>
                  {isSentenceLoading ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--accent-blue)]">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {isGeneratingKeywords ? 'Generating keywords…' : 'Finding footage…'}
                    </span>
                  ) : null}
                </div>
                <p className="text-[15px] leading-7 text-[color:var(--text-primary)]">
                  {activeSentence.text}
                </p>
              </div>
              <button
                type="button"
                onClick={() => nextId && void setActiveSentence(nextId)}
                disabled={!nextId}
                aria-label="Next sentence"
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">
              Click a sentence in the sidebar to begin
            </p>
          )}
        </div>

        {/* Keyword chips */}
        <div className="mb-4 flex flex-wrap gap-2.5">
          {isGeneratingKeywords ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-9 w-32 animate-pulse rounded-[var(--radius-chip)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]"
              />
            ))
          ) : keywords.length === 0 && activeSentence ? (
            <div className="flex items-center gap-3 rounded-[var(--radius-control)] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]/50 px-4 py-2.5 text-[12px] text-[color:var(--text-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[color:var(--accent-amber)]" />
              No keyword suggestions — try adding your own →
            </div>
          ) : (
            keywords.map(keyword => {
              const isActive = keyword === activeKeyword
              return (
                <button
                  key={keyword}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => void setActiveKeyword(keyword)}
                  className={clsx(
                    'rounded-[var(--radius-chip)] border px-4 py-2 text-[12px] leading-none transition-colors',
                    isActive
                      ? 'border-[color:var(--accent-blue)]/30 bg-[radial-gradient(circle_at_top,#8cb0ff_0%,#698ef5_35%,#4f68cf_70%,#3449a1_100%)] text-white'
                      : 'border-[color:var(--border-subtle)] bg-transparent text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]'
                  )}
                >
                  {keyword}
                </button>
              )
            })
          )}

          {!isGeneratingKeywords && activeSentence ? (
            isAddingKeyword ? (
              <input
                autoFocus
                value={customKeywordInput}
                onChange={event => setCustomKeywordInput(event.target.value)}
                onBlur={handleAddCustomKeyword}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAddCustomKeyword()
                  } else if (event.key === 'Escape') {
                    setCustomKeywordInput('')
                    setIsAddingKeyword(false)
                  }
                }}
                placeholder="custom keyword"
                className="min-w-[120px] rounded-[var(--radius-chip)] border border-dashed border-[color:var(--border-subtle)] bg-transparent px-4 py-2 text-[12px] leading-none text-[color:var(--text-primary)] placeholder:text-[color:var(--text-dim)]"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingKeyword(true)}
                aria-label="Add custom keyword"
                className="inline-flex items-center gap-1 rounded-[var(--radius-chip)] border border-dashed border-[color:var(--border-subtle)] px-3 py-2 text-[12px] leading-none text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
            )
          ) : null}
        </div>

        {/* Search bar */}
        <div className="mb-5 flex items-center gap-3">
          <label className="flex flex-1 items-center gap-3 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)]/55 px-4 py-3 text-[color:var(--text-muted)] focus-within:border-[color:var(--accent-blue)]/50">
            <Search className="h-4 w-4" />
            <input
              value={searchInput}
              onChange={event => setSearchInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleSearch()
                }
              }}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--text-dim)]"
              placeholder="Search footage keywords"
            />
          </label>
          <button
            type="button"
            onClick={handleSearch}
            className="flex items-center justify-center rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Clip grid */}
        {isLoadingCandidates ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {skeletonCards.map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]"
              >
                <div className="h-36 animate-pulse bg-[color:var(--surface-raised)]" />
                <div className="space-y-3 p-3">
                  <div className="h-5 animate-pulse rounded bg-[color:var(--surface-raised)]" />
                  <div className="h-10 animate-pulse rounded-[var(--radius-control)] bg-[color:var(--surface-raised)]" />
                </div>
              </div>
            ))}
          </div>
        ) : candidateClips.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {candidateClips.map((clip, index) => (
              <ClipCard key={clip.id} clip={clip} index={index} onAdd={addToTray} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)]/40 px-8 text-center">
            <div>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]">
                <Sparkles className="h-5 w-5 text-[color:var(--text-muted)]" />
              </div>
              <p className="mt-4 text-base text-[color:var(--text-primary)]">
                {activeSentence ? 'No matches yet' : 'Click a sentence to find footage'}
              </p>
              <p className="mt-1.5 text-sm text-[color:var(--text-muted)]">
                {activeSentence
                  ? 'Try a different keyword or add your own'
                  : 'Keyword suggestions and stock footage matches will appear here.'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void nextPage()}
            disabled={!activeKeyword || isLoadingCandidates || isGeneratingKeywords || !hasMorePages}
            className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-transparent px-4 py-2.5 text-sm text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCcw className="h-4 w-4" />
            Next 4
          </button>
        </div>
      </div>
    </section>
  )
}
