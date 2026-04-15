import { useEffect, useMemo, useRef, useState } from 'react'

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Check,
  ChevronDown,
  Download,
  GripVertical,
  Play,
  Scissors,
  SkipForward,
  Undo2,
  X,
} from 'lucide-react'

import type { CandidateClip, ParsedParagraph, ParsedSentence, TrayClip } from '@/types'
import { useWorkstationStore } from '@/store/useWorkstationStore'
import { accentBgMap } from '@/utils/accentColors'
import {
  MAX_CLIPS_PER_SENTENCE,
  getAssemblyProgress,
  getParagraphProgress,
} from '@/utils/progress'

const CLIP_DRAG_MIME = 'application/x-footage-clip'

type SentenceGroup = {
  sentence: ParsedSentence | null
  clips: TrayClip[]
}

type ParagraphGroup = {
  paragraph: ParsedParagraph | null
  paragraphIndex: number
  sentenceGroups: SentenceGroup[]
  totalClips: number
}

interface AssemblyTrayProps {
  onOpenPlayer: () => void
}

function durationToSeconds(duration: string): number {
  const [m, s] = duration.split(':').map(Number)
  return (m || 0) * 60 + (s || 0)
}

function getTotalDuration(clips: TrayClip[]): string {
  const totalSeconds = clips.reduce((sum, clip) => {
    const full = durationToSeconds(clip.duration)
    const start = clip.trimStart ?? 0
    const end = clip.trimEnd ?? full
    return sum + Math.max(0, end - start)
  }, 0)

  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (Math.round(totalSeconds) % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function TrimEditor({
  clip,
  onClose,
}: {
  clip: TrayClip
  onClose: () => void
}) {
  const setClipTrim = useWorkstationStore(state => state.setClipTrim)
  const fullDuration = durationToSeconds(clip.duration)
  const [start, setStart] = useState(clip.trimStart ?? 0)
  const [end, setEnd] = useState(clip.trimEnd ?? fullDuration)

  const clampedStart = Math.max(0, Math.min(start, fullDuration))
  const clampedEnd = Math.max(clampedStart, Math.min(end, fullDuration))
  const segmentLen = Math.max(0, clampedEnd - clampedStart)
  const usingFull = clampedStart === 0 && clampedEnd === fullDuration

  const save = () => {
    setClipTrim(
      clip.id,
      clampedStart > 0 ? clampedStart : undefined,
      clampedEnd < fullDuration ? clampedEnd : undefined
    )
    onClose()
  }

  const reset = () => {
    setStart(0)
    setEnd(fullDuration)
    setClipTrim(clip.id, undefined, undefined)
  }

  return (
    <div className="space-y-2 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)]/80 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <label className="flex flex-1 items-center gap-1 text-[10px] text-[color:var(--text-muted)]">
          IN
          <input
            type="number"
            min={0}
            max={fullDuration}
            step="0.1"
            value={start}
            onChange={e => setStart(Number(e.target.value))}
            className="font-mono w-full rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)] px-1.5 py-0.5 text-[11px] text-[color:var(--text-primary)]"
          />
        </label>
        <label className="flex flex-1 items-center gap-1 text-[10px] text-[color:var(--text-muted)]">
          OUT
          <input
            type="number"
            min={0}
            max={fullDuration}
            step="0.1"
            value={end}
            onChange={e => setEnd(Number(e.target.value))}
            className="font-mono w-full rounded border border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)] px-1.5 py-0.5 text-[11px] text-[color:var(--text-primary)]"
          />
        </label>
      </div>
      <p className="font-mono text-[10px] text-[color:var(--text-dim)]">
        {segmentLen.toFixed(1)}s of {fullDuration}s
        {usingFull ? ' (full clip)' : ''}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          className="flex-1 rounded-[var(--radius-control)] border border-[color:var(--accent-blue)]/30 bg-[color:var(--accent-blue)]/15 px-2 py-1 text-[11px] text-[color:var(--accent-blue)]"
        >
          Save
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] px-2 py-1 text-[11px] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[var(--radius-control)] px-2 py-1 text-[11px] text-[color:var(--text-dim)] hover:text-[color:var(--text-primary)]"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function SortableClipCard({
  clip,
  onRemove,
}: {
  clip: TrayClip
  onRemove: (id: string) => void
}) {
  const [trimOpen, setTrimOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : ('auto' as const),
  }

  const hasTrim = clip.trimStart != null || clip.trimEnd != null
  const fullDuration = durationToSeconds(clip.duration)
  const start = clip.trimStart ?? 0
  const end = clip.trimEnd ?? fullDuration
  const segmentLen = Math.max(0, end - start)

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] ${
        trimOpen ? '' : 'cursor-grab active:cursor-grabbing'
      } ${isDragging ? 'ring-2 ring-[color:var(--accent-blue)]/40' : ''}`}
    >
      <div className="relative h-20">
        <img
          src={clip.thumbnail}
          alt={clip.title}
          className="h-full w-full object-cover"
        />
        <div className={`absolute inset-y-0 left-0 w-1 ${clip.sentenceAccent}`} />
        <div className="pointer-events-none absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-[color:var(--text-dim)] opacity-0 transition-opacity group-hover:opacity-100">
          <GripVertical className="h-3 w-3" />
        </div>
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              setTrimOpen(v => !v)
            }}
            aria-label={hasTrim ? 'Edit trim' : 'Trim clip'}
            className={`flex h-5 w-5 items-center justify-center rounded-full ${
              hasTrim
                ? 'bg-[color:var(--accent-blue)]/80 text-white'
                : 'bg-black/55 text-[color:var(--text-dim)] hover:text-[color:var(--text-primary)]'
            }`}
          >
            <Scissors className="h-3 w-3" />
          </button>
          <button
            type="button"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation()
              onRemove(clip.id)
            }}
            aria-label="Remove clip"
            className="flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-[color:var(--text-dim)] hover:text-[color:var(--text-primary)]"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-[13px] leading-5 text-[color:var(--text-primary)]">
          {clip.title}
        </p>
        <p className="font-mono mt-1 flex items-center gap-1.5 text-[11px] text-[color:var(--text-dim)]">
          {hasTrim ? (
            <>
              <Scissors className="h-2.5 w-2.5 text-[color:var(--accent-blue)]" />
              <span className="text-[color:var(--accent-blue)]">
                {segmentLen.toFixed(1)}s
              </span>
              <span>/ {clip.duration}</span>
            </>
          ) : (
            clip.duration
          )}
        </p>
      </div>
      {trimOpen ? (
        <TrimEditor clip={clip} onClose={() => setTrimOpen(false)} />
      ) : null}
    </article>
  )
}

function SentenceDropZone({
  sentenceId,
  disabled,
  children,
}: {
  sentenceId: string
  disabled: boolean
  children: (state: { isDragOver: boolean }) => React.ReactNode
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const addClipToSentence = useWorkstationStore(
    state => state.addClipToSentence
  )

  if (disabled) {
    return <>{children({ isDragOver: false })}</>
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    const payload = event.dataTransfer.getData(CLIP_DRAG_MIME)
    if (!payload) return
    try {
      const clip = JSON.parse(payload) as CandidateClip
      addClipToSentence(clip, sentenceId)
    } catch {
      // ignore
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    if (event.dataTransfer.types.includes(CLIP_DRAG_MIME)) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
      setIsDragOver(true)
    }
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
    >
      {children({ isDragOver })}
    </div>
  )
}

export function AssemblyTray({ onOpenPlayer }: AssemblyTrayProps) {
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [downloadState, setDownloadState] = useState<'idle' | 'loading' | 'done'>(
    'idle'
  )
  const [collapsedParagraphs, setCollapsedParagraphs] = useState<Set<string>>(
    new Set()
  )
  const [collapsedSentences, setCollapsedSentences] = useState<Set<string>>(
    new Set()
  )

  const trayClips = useWorkstationStore(state => state.trayClips)
  const paragraphs = useWorkstationStore(state => state.paragraphs)
  const skippedSentences = useWorkstationStore(state => state.skippedSentences)
  const activeSentenceId = useWorkstationStore(state => state.activeSentenceId)
  const removeFromTray = useWorkstationStore(state => state.removeFromTray)
  const reorderTray = useWorkstationStore(state => state.reorderTray)
  const isDownloading = useWorkstationStore(state => state.isDownloading)
  const downloadAll = useWorkstationStore(state => state.downloadAll)
  const lastRemovedClip = useWorkstationStore(state => state.lastRemovedClip)
  const undoRemoveFromTray = useWorkstationStore(state => state.undoRemoveFromTray)
  const dismissLastRemoved = useWorkstationStore(state => state.dismissLastRemoved)
  const toggleSkipSentence = useWorkstationStore(
    state => state.toggleSkipSentence
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  useEffect(() => {
    if (!lastRemovedClip) return
    const id = window.setTimeout(dismissLastRemoved, 6000)
    return () => window.clearTimeout(id)
  }, [lastRemovedClip, dismissLastRemoved])

  useEffect(() => {
    if (downloadState !== 'done') return undefined
    const timeoutId = window.setTimeout(() => {
      setDownloadState('idle')
      setDownloadProgress(0)
    }, 1800)
    return () => window.clearTimeout(timeoutId)
  }, [downloadState])

  // Auto-scroll active sentence row into view.
  const activeRowRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!activeSentenceId || !activeRowRef.current) return
    activeRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeSentenceId, trayClips.length])

  // Build nested paragraph → sentence → clips structure in script order.
  // Include every paragraph + sentence (even empty ones) so drop zones exist
  // for dragging candidates into empty sentences.
  const paragraphGroups: ParagraphGroup[] = useMemo(() => {
    const clipsBySentence = new Map<string, TrayClip[]>()
    for (const clip of trayClips) {
      const existing = clipsBySentence.get(clip.sentenceId) ?? []
      existing.push(clip)
      clipsBySentence.set(clip.sentenceId, existing)
    }

    const result: ParagraphGroup[] = paragraphs.map((paragraph, pIdx) => {
      const sentenceGroups: SentenceGroup[] = paragraph.sentences.map(
        sentence => ({
          sentence,
          clips: clipsBySentence.get(sentence.id) ?? [],
        })
      )
      const totalClips = sentenceGroups.reduce(
        (n, g) => n + g.clips.length,
        0
      )
      return {
        paragraph,
        paragraphIndex: pIdx,
        sentenceGroups,
        totalClips,
      }
    })

    // Orphan clips (sentence not in any paragraph) surface as a final group.
    const knownIds = new Set(
      paragraphs.flatMap(p => p.sentences.map(s => s.id))
    )
    const orphans = trayClips.filter(c => !knownIds.has(c.sentenceId))
    if (orphans.length > 0) {
      const orphansBySentence = new Map<string, TrayClip[]>()
      for (const clip of orphans) {
        const list = orphansBySentence.get(clip.sentenceId) ?? []
        list.push(clip)
        orphansBySentence.set(clip.sentenceId, list)
      }
      result.push({
        paragraph: null,
        paragraphIndex: Number.MAX_SAFE_INTEGER,
        sentenceGroups: Array.from(orphansBySentence.entries()).map(
          ([, clips]) => ({
            sentence: null,
            clips,
          })
        ),
        totalClips: orphans.length,
      })
    }

    return result
  }, [trayClips, paragraphs])

  async function handleDownloadAll() {
    setDownloadState('loading')
    setDownloadProgress(0)
    await downloadAll(completed => setDownloadProgress(completed))
    setDownloadProgress(trayClips.length)
    setDownloadState('done')
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    reorderTray(String(active.id), String(over.id))
  }

  function toggleParagraph(id: string) {
    setCollapsedParagraphs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSentence(id: string) {
    setCollapsedSentences(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const assemblyProgress = useMemo(
    () => getAssemblyProgress(paragraphs, trayClips, skippedSentences),
    [paragraphs, trayClips, skippedSentences]
  )

  const downloadPercent =
    trayClips.length > 0 ? (downloadProgress / trayClips.length) * 100 : 0
  const downloadLabel =
    downloadState === 'loading'
      ? `Downloading ${Math.min(downloadProgress, trayClips.length)}/${trayClips.length}`
      : downloadState === 'done'
        ? 'Done ✓'
        : `Download All (${trayClips.length})`

  const trayIds = trayClips.map(c => c.id)

  return (
    <section className="relative rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-5 py-5 lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-dim)]">
            Assembly
          </p>
          <p className="mt-1.5 text-sm text-[color:var(--text-muted)]">
            <span className="text-[color:var(--text-primary)]">
              {assemblyProgress.clips} / {assemblyProgress.clipTarget || 0} clips
            </span>
            <span className="mx-2 text-[color:var(--text-dim)]">•</span>
            <span>
              {assemblyProgress.completedSentences} / {assemblyProgress.totalSentences} sentences complete
            </span>
            <span className="mx-2 text-[color:var(--text-dim)]">•</span>
            <span className="font-mono text-[color:var(--text-muted)]">
              {getTotalDuration(trayClips)}
            </span>
          </p>
          {assemblyProgress.clipTarget > 0 ? (
            <div className="mt-2 h-1 max-w-md overflow-hidden rounded-full bg-[color:var(--surface-muted)]">
              <div
                className="h-full bg-[color:var(--accent-blue)] transition-[width] duration-300"
                style={{
                  width: `${(assemblyProgress.clips / assemblyProgress.clipTarget) * 100}%`,
                }}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2 self-start lg:mt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenPlayer}
              disabled={trayClips.length === 0}
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-60"
              title="Play full sequence (P)"
            >
              <Play className="h-4 w-4" />
              Play sequence
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadAll()}
              disabled={isDownloading || trayClips.length === 0}
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[radial-gradient(circle_at_top,#8cb0ff_0%,#6d92fb_30%,#5476e1_65%,#3c5ccd_100%)] px-5 py-3 text-sm font-medium text-white shadow-[0_10px_24px_rgba(59,130,246,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {downloadLabel}
            </button>
          </div>
          {downloadState === 'loading' ? (
            <div className="h-1 w-48 overflow-hidden rounded-full bg-[color:var(--surface-muted)]">
              <div
                className="h-full bg-[color:var(--accent-blue)] transition-[width] duration-300"
                style={{ width: `${downloadPercent}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {paragraphs.length === 0 ? (
        <div className="mt-5 flex min-h-[120px] items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)]/40 text-sm text-[color:var(--text-muted)]">
          No transcript loaded yet.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={trayIds} strategy={horizontalListSortingStrategy}>
            <div className="mt-5 space-y-3">
              {paragraphGroups.map(pGroup => {
                const pId = pGroup.paragraph?.id ?? 'orphan'
                const pNumber = (pGroup.paragraph?.index ?? pGroup.paragraphIndex) + 1
                const isParagraphCollapsed = collapsedParagraphs.has(pId)
                const paragraphPreview =
                  pGroup.paragraph?.sentences[0]?.text ??
                  pGroup.paragraph?.label ??
                  'Unlinked clips'

                const progress = pGroup.paragraph
                  ? getParagraphProgress(
                      pGroup.paragraph,
                      trayClips,
                      skippedSentences
                    )
                  : null
                const paragraphPercent = progress
                  ? progress.clipTarget === 0
                    ? progress.isComplete
                      ? 100
                      : 0
                    : (progress.clips / progress.clipTarget) * 100
                  : 0

                return (
                  <div
                    key={pId}
                    className={`overflow-hidden rounded-[var(--radius-card)] border bg-[color:var(--surface-muted)]/50 ${
                      progress?.isComplete
                        ? 'border-[color:var(--accent-emerald)]/35'
                        : 'border-[color:var(--border-subtle)]'
                    }`}
                  >
                    <button
                      type="button"
                      aria-expanded={!isParagraphCollapsed}
                      onClick={() => toggleParagraph(pId)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--surface-muted)]"
                    >
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-[color:var(--text-muted)] transition-transform ${
                          isParagraphCollapsed ? '-rotate-90' : ''
                        }`}
                      />
                      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
                        P{pNumber}
                      </span>
                      <p className="line-clamp-1 flex-1 text-[13px] text-[color:var(--text-primary)]">
                        {paragraphPreview}
                      </p>
                      {progress ? (
                        <>
                          <span className="font-mono hidden rounded-full bg-[color:var(--surface-raised)] px-2 py-0.5 text-[10px] text-[color:var(--text-muted)] sm:inline">
                            {progress.completedSentences}/{progress.totalSentences} sentences
                          </span>
                          <span
                            className={`font-mono rounded-full px-2 py-0.5 text-[10px] ${
                              progress.isComplete
                                ? 'bg-[color:var(--accent-emerald)]/15 text-[color:var(--accent-emerald)]'
                                : 'bg-[color:var(--surface-raised)] text-[color:var(--text-muted)]'
                            }`}
                          >
                            {progress.clips}/{progress.clipTarget} clips
                          </span>
                          {progress.isComplete ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent-emerald)]/15 px-2 py-0.5 text-[10px] text-[color:var(--accent-emerald)]">
                              <Check className="h-3 w-3" />
                              Done
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="font-mono rounded-full bg-[color:var(--surface-raised)] px-2 py-0.5 text-[10px] text-[color:var(--text-muted)]">
                          {pGroup.totalClips} {pGroup.totalClips === 1 ? 'clip' : 'clips'}
                        </span>
                      )}
                    </button>
                    {progress ? (
                      <div className="h-0.5 bg-[color:var(--surface-muted)]">
                        <div
                          className={`h-full transition-[width] duration-300 ${
                            progress.isComplete
                              ? 'bg-[color:var(--accent-emerald)]'
                              : 'bg-[color:var(--accent-blue)]'
                          }`}
                          style={{ width: `${paragraphPercent}%` }}
                        />
                      </div>
                    ) : null}

                    {!isParagraphCollapsed ? (
                      <div className="space-y-3 border-t border-[color:var(--border-subtle)] px-3 py-3">
                        {pGroup.sentenceGroups.map(sGroup => {
                          const sId = sGroup.sentence?.id ?? `${pId}-orphan`
                          const sNumber = (sGroup.sentence?.index ?? 0) + 1
                          const isSentenceCollapsed = collapsedSentences.has(sId)
                          const label = sGroup.sentence
                            ? `P${pNumber}-S${sNumber}`
                            : `P${pNumber}-?`

                          const sentenceId = sGroup.sentence?.id ?? ''
                          const isSkipped = Boolean(
                            sentenceId && skippedSentences[sentenceId]
                          )
                          const sentenceClipCount = sGroup.clips.length
                          const sentenceComplete =
                            isSkipped ||
                            sentenceClipCount >= MAX_CLIPS_PER_SENTENCE
                          const sentencePercent = isSkipped
                            ? 100
                            : (sentenceClipCount / MAX_CLIPS_PER_SENTENCE) * 100
                          const isActiveRow =
                            sentenceId && sentenceId === activeSentenceId

                          return (
                            <SentenceDropZone
                              key={sId}
                              sentenceId={sentenceId}
                              disabled={
                                !sentenceId ||
                                isSkipped ||
                                sentenceClipCount >= MAX_CLIPS_PER_SENTENCE
                              }
                            >
                              {({ isDragOver }) => (
                                <div
                                  ref={isActiveRow ? activeRowRef : undefined}
                                  className={`rounded-[var(--radius-control)] transition-colors ${
                                    isDragOver
                                      ? 'bg-[color:var(--accent-blue)]/10 ring-1 ring-[color:var(--accent-blue)]/40'
                                      : ''
                                  } ${isSkipped ? 'opacity-70' : ''}`}
                                >
                                  <button
                                    type="button"
                                    aria-expanded={!isSentenceCollapsed}
                                    onClick={() => toggleSentence(sId)}
                                    className="mb-2 flex w-full items-center gap-2 rounded-[var(--radius-control)] px-1 py-1 text-left hover:bg-[color:var(--surface-muted)]"
                                  >
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 shrink-0 text-[color:var(--text-dim)] transition-transform ${
                                        isSentenceCollapsed ? '-rotate-90' : ''
                                      }`}
                                    />
                                    {sGroup.sentence ? (
                                      <span
                                        className={`h-2 w-2 shrink-0 rounded-full ${accentBgMap[sGroup.sentence.accent]}`}
                                      />
                                    ) : null}
                                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
                                      {label}
                                    </span>
                                    <p
                                      className={`line-clamp-1 flex-1 text-[12px] text-[color:var(--text-muted)] ${
                                        isSkipped ? 'line-through' : ''
                                      }`}
                                    >
                                      {sGroup.sentence?.text ?? 'Unlinked clips'}
                                    </p>
                                    <div className="hidden h-1 w-20 shrink-0 overflow-hidden rounded-full bg-[color:var(--surface-raised)] md:block">
                                      <div
                                        className={`h-full transition-[width] duration-300 ${
                                          sentenceComplete
                                            ? isSkipped
                                              ? 'bg-[color:var(--accent-amber)]'
                                              : 'bg-[color:var(--accent-emerald)]'
                                            : 'bg-[color:var(--accent-blue)]'
                                        }`}
                                        style={{ width: `${sentencePercent}%` }}
                                      />
                                    </div>
                                    <span
                                      className={`font-mono inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                                        isSkipped
                                          ? 'bg-[color:var(--accent-amber)]/15 text-[color:var(--accent-amber)]'
                                          : sentenceComplete
                                            ? 'bg-[color:var(--accent-emerald)]/15 text-[color:var(--accent-emerald)]'
                                            : 'bg-[color:var(--surface-raised)] text-[color:var(--text-muted)]'
                                      }`}
                                    >
                                      {isSkipped ? (
                                        'Skipped'
                                      ) : (
                                        <>
                                          {sentenceComplete ? (
                                            <Check className="h-2.5 w-2.5" />
                                          ) : null}
                                          {sentenceClipCount}/{MAX_CLIPS_PER_SENTENCE}
                                        </>
                                      )}
                                    </span>
                                    {sentenceId ? (
                                      <span
                                        role="button"
                                        tabIndex={0}
                                        aria-label={
                                          isSkipped
                                            ? 'Unskip sentence'
                                            : 'Skip sentence'
                                        }
                                        onClick={event => {
                                          event.stopPropagation()
                                          toggleSkipSentence(sentenceId)
                                        }}
                                        onKeyDown={event => {
                                          if (
                                            event.key === 'Enter' ||
                                            event.key === ' '
                                          ) {
                                            event.preventDefault()
                                            event.stopPropagation()
                                            toggleSkipSentence(sentenceId)
                                          }
                                        }}
                                        className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border ${
                                          isSkipped
                                            ? 'border-[color:var(--accent-amber)]/40 text-[color:var(--accent-amber)]'
                                            : 'border-[color:var(--border-subtle)] text-[color:var(--text-dim)] hover:text-[color:var(--text-primary)]'
                                        }`}
                                      >
                                        <SkipForward className="h-2.5 w-2.5" />
                                      </span>
                                    ) : null}
                                  </button>

                                  {!isSentenceCollapsed ? (
                                    sGroup.clips.length > 0 ? (
                                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                                        {sGroup.clips.map(clip => (
                                          <SortableClipCard
                                            key={clip.id}
                                            clip={clip}
                                            onRemove={removeFromTray}
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <div
                                        className={`flex min-h-[56px] items-center justify-center rounded-[var(--radius-control)] border border-dashed px-4 py-2 text-[11px] ${
                                          isDragOver
                                            ? 'border-[color:var(--accent-blue)]/50 text-[color:var(--accent-blue)]'
                                            : 'border-[color:var(--border-subtle)] text-[color:var(--text-dim)]'
                                        }`}
                                      >
                                        {isSkipped
                                          ? 'Marked as no footage needed'
                                          : 'Drop candidate clips here'}
                                      </div>
                                    )
                                  ) : null}
                                </div>
                              )}
                            </SentenceDropZone>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {lastRemovedClip ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] px-4 py-3 text-sm text-[color:var(--text-primary)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        >
          <span className="text-[color:var(--text-muted)]">Removed clip</span>
          <button
            type="button"
            onClick={undoRemoveFromTray}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[color:var(--accent-blue)]/30 bg-[color:var(--accent-blue)]/15 px-2.5 py-1 text-[color:var(--accent-blue)]"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={dismissLastRemoved}
            aria-label="Dismiss"
            className="text-[color:var(--text-dim)] hover:text-[color:var(--text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </section>
  )
}
