import { RefreshCcw, Search, Sparkles } from 'lucide-react'

import type { CandidateClip, ParsedSentence } from '@/types'
import { useWorkstationStore } from '@/store/useWorkstationStore'

const accentDotMap = {
  blue: 'bg-[color:var(--accent-blue)]',
  violet: 'bg-[color:var(--accent-violet)]',
  amber: 'bg-[color:var(--accent-amber)]',
  emerald: 'bg-[color:var(--accent-emerald)]',
} as const

function CandidateCard({
  clip,
  onAdd,
}: {
  clip: CandidateClip
  onAdd: (clip: CandidateClip) => void
}) {
  return (
    <article className="group overflow-hidden rounded-[22px] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,#111717_0%,#121917_100%)] shadow-[0_20px_48px_rgba(0,0,0,0.24)]">
      <div className={`relative h-36 bg-gradient-to-br ${clip.palette}`}>
        <img
          src={clip.thumbnail}
          alt={clip.title}
          className="h-full w-full object-cover opacity-92 transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="font-mono absolute right-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
          {clip.duration}
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/25 to-transparent px-3 py-2">
          <span className="rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white">
            {clip.source}
          </span>
          <span className="font-mono text-[10px] uppercase text-white/72">{clip.resolution}</span>
        </div>
      </div>
      <div className="space-y-3 p-3">
        <div>
          <p className="text-[14px] leading-5 text-[color:var(--text-primary)]">
            {clip.title}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onAdd(clip)}
          disabled={clip.added}
          className={`w-full rounded-xl border px-3 py-2 text-sm ${
            clip.added
              ? 'border-[color:var(--accent-blue)]/30 bg-[color:var(--accent-blue)]/14 text-[color:var(--accent-blue)]'
              : 'border-[color:var(--border-subtle)] bg-transparent text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)]'
          }`}
        >
          {clip.added ? 'Added to assembly' : 'Add to assembly'}
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
  const setActiveKeyword = useWorkstationStore(state => state.setActiveKeyword)
  const nextPage = useWorkstationStore(state => state.nextPage)
  const addToTray = useWorkstationStore(state => state.addToTray)

  const activeSentence: ParsedSentence | null =
    paragraphs
      .flatMap(paragraph => paragraph.sentences)
      .find(sentence => sentence.id === activeSentenceId) ?? null

  const shimmerKeywords = Array.from({ length: 4 })
  const skeletonCards = Array.from({ length: 4 })

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="rounded-[30px] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,#111516_0%,#101414_100%)] px-5 py-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] lg:px-6 lg:py-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-[30px] font-semibold tracking-[-0.03em] text-[color:var(--text-primary)]">
              Documentary Clip Finder
            </h1>
          </div>
        </div>

        <div className="mb-4 rounded-[22px] border border-[color:var(--border-subtle)] bg-black/15 px-4 py-4">
          {activeSentence ? (
            <div className="flex items-start gap-3">
              <span
                className={`mt-1.5 h-2.5 w-2.5 rounded-full ${accentDotMap[activeSentence.accent]}`}
              />
              <p className="text-[15px] leading-7 text-[color:var(--text-primary)]">
                {activeSentence.text}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[color:var(--text-muted)]">
              Click a sentence to begin
            </p>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2.5">
          {isGeneratingKeywords
            ? shimmerKeywords.map((_, index) => (
                <div
                  key={index}
                  className="h-9 w-32 animate-pulse rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]"
                />
              ))
            : keywords.map(keyword => {
                const isActive = keyword === activeKeyword

                return (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => void setActiveKeyword(keyword)}
                    className={`rounded-full border px-4 py-2 text-[12px] leading-none ${
                      isActive
                        ? 'border-[color:var(--accent-blue)]/30 bg-[radial-gradient(circle_at_top,#8cb0ff_0%,#698ef5_35%,#4f68cf_70%,#3449a1_100%)] text-white shadow-[0_0_22px_rgba(59,130,246,0.32)]'
                        : 'border-[color:var(--border-subtle)] bg-transparent text-[color:var(--text-muted)]'
                    }`}
                  >
                    {keyword}
                  </button>
                )
              })}
        </div>

        <div className="mb-5 flex items-center gap-3">
          <label className="flex flex-1 items-center gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)]/55 px-4 py-3 text-[color:var(--text-muted)]">
            <Search className="h-4 w-4" />
            <input
              readOnly
              value={activeKeyword ?? ''}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[color:var(--text-dim)]"
              placeholder="Search footage keywords"
            />
          </label>
          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-4 py-3 text-sm text-[color:var(--text-muted)]"
          >
            <Search className="h-4 w-4" />
            Cari
          </button>
        </div>

        {isLoadingCandidates ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {skeletonCards.map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[22px] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,#111717_0%,#121917_100%)]"
              >
                <div className="h-36 animate-pulse bg-[color:var(--surface-muted)]" />
                <div className="space-y-3 p-3">
                  <div className="h-5 animate-pulse rounded bg-[color:var(--surface-muted)]" />
                  <div className="h-10 animate-pulse rounded-xl bg-[color:var(--surface-muted)]" />
                </div>
              </div>
            ))}
          </div>
        ) : candidateClips.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {candidateClips.map(clip => (
              <CandidateCard key={clip.id} clip={clip} onAdd={addToTray} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[360px] items-center justify-center rounded-[30px] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]/45 px-8 text-center">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]">
                <Sparkles className="h-5 w-5 text-[color:var(--text-muted)]" />
              </div>
              <p className="mt-5 text-base text-[color:var(--text-primary)]">
                Click a sentence to find footage
              </p>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                Keyword suggestions and stock footage matches will appear here.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void nextPage()}
            disabled={!activeKeyword || isLoadingCandidates || isGeneratingKeywords}
            className="flex items-center gap-2 rounded-2xl border border-[color:var(--border-subtle)] bg-transparent px-4 py-2.5 text-sm text-[color:var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Next 4
          </button>
        </div>
      </div>
    </section>
  )
}