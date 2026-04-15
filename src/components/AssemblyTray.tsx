import { useEffect, useMemo, useState } from 'react'

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
import { ChevronDown, Download, GripVertical, Undo2, X } from 'lucide-react'

import type { ParsedParagraph, ParsedSentence, TrayClip } from '@/types'
import { useWorkstationStore } from '@/store/useWorkstationStore'
import { accentBgMap } from '@/utils/accentColors'

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

function getTotalDuration(clips: TrayClip[]): string {
  const totalSeconds = clips.reduce((sum, clip) => {
    const [minutes, seconds] = clip.duration.split(':').map(Number)
    return sum + minutes * 60 + seconds
  }, 0)

  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function SortableClipCard({
  clip,
  onRemove,
}: {
  clip: TrayClip
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : ('auto' as const),
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative cursor-grab overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] active:cursor-grabbing ${
        isDragging ? 'ring-2 ring-[color:var(--accent-blue)]/40' : ''
      }`}
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
        <button
          type="button"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => {
            e.stopPropagation()
            onRemove(clip.id)
          }}
          aria-label="Remove clip"
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-[color:var(--text-dim)] opacity-0 transition-opacity hover:text-[color:var(--text-primary)] group-hover:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="px-3 py-2.5">
        <p className="truncate text-[13px] leading-5 text-[color:var(--text-primary)]">
          {clip.title}
        </p>
        <p className="font-mono mt-1 text-[11px] text-[color:var(--text-dim)]">
          {clip.duration}
        </p>
      </div>
    </article>
  )
}

export function AssemblyTray() {
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
  const removeFromTray = useWorkstationStore(state => state.removeFromTray)
  const reorderTray = useWorkstationStore(state => state.reorderTray)
  const isDownloading = useWorkstationStore(state => state.isDownloading)
  const downloadAll = useWorkstationStore(state => state.downloadAll)
  const lastRemovedClip = useWorkstationStore(state => state.lastRemovedClip)
  const undoRemoveFromTray = useWorkstationStore(state => state.undoRemoveFromTray)
  const dismissLastRemoved = useWorkstationStore(state => state.dismissLastRemoved)

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

  // Build nested paragraph → sentence → clips structure in script order.
  const paragraphGroups: ParagraphGroup[] = useMemo(() => {
    const sentenceMeta = new Map<
      string,
      { sentence: ParsedSentence; paragraphId: string; sentenceOrder: number }
    >()
    const paragraphMeta = new Map<
      string,
      { paragraph: ParsedParagraph; order: number }
    >()

    paragraphs.forEach((paragraph, pIdx) => {
      paragraphMeta.set(paragraph.id, { paragraph, order: pIdx })
      paragraph.sentences.forEach(sentence => {
        sentenceMeta.set(sentence.id, {
          sentence,
          paragraphId: paragraph.id,
          sentenceOrder: sentence.index,
        })
      })
    })

    // Bucket clips by paragraphId → sentenceId
    const buckets = new Map<string, Map<string, TrayClip[]>>()
    const ORPHAN_PARAGRAPH = '__orphan__'

    for (const clip of trayClips) {
      const meta = sentenceMeta.get(clip.sentenceId)
      const pId = meta?.paragraphId ?? ORPHAN_PARAGRAPH
      let paraBucket = buckets.get(pId)
      if (!paraBucket) {
        paraBucket = new Map()
        buckets.set(pId, paraBucket)
      }
      const existing = paraBucket.get(clip.sentenceId) ?? []
      existing.push(clip)
      paraBucket.set(clip.sentenceId, existing)
    }

    const ORPHAN = Number.MAX_SAFE_INTEGER

    const result: ParagraphGroup[] = []
    for (const [pId, sentenceBucket] of buckets.entries()) {
      const pMeta = paragraphMeta.get(pId)
      const sentenceGroups: SentenceGroup[] = Array.from(sentenceBucket.entries())
        .map(([sId, clips]) => ({
          sentence: sentenceMeta.get(sId)?.sentence ?? null,
          clips,
          _order: sentenceMeta.get(sId)?.sentenceOrder ?? ORPHAN,
        }))
        .sort((a, b) => a._order - b._order)
        .map(({ sentence, clips }) => ({ sentence, clips }))

      result.push({
        paragraph: pMeta?.paragraph ?? null,
        paragraphIndex: pMeta?.order ?? ORPHAN,
        sentenceGroups,
        totalClips: sentenceGroups.reduce((n, g) => n + g.clips.length, 0),
      })
    }

    result.sort((a, b) => a.paragraphIndex - b.paragraphIndex)
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
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-dim)]">
            Assembly
          </p>
          <p className="mt-1.5 text-sm text-[color:var(--text-muted)]">
            {trayClips.length} clips • {getTotalDuration(trayClips)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 self-start lg:mt-2">
          <button
            type="button"
            onClick={() => void handleDownloadAll()}
            disabled={isDownloading || trayClips.length === 0}
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[radial-gradient(circle_at_top,#8cb0ff_0%,#6d92fb_30%,#5476e1_65%,#3c5ccd_100%)] px-5 py-3 text-sm font-medium text-white shadow-[0_10px_24px_rgba(59,130,246,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloadLabel}
          </button>
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

      {trayClips.length === 0 ? (
        <div className="mt-5 flex min-h-[120px] items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)]/40 text-sm text-[color:var(--text-muted)]">
          No clips yet. Click <span className="mx-1 text-[color:var(--text-primary)]">Add to assembly</span> on any candidate above.
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

                return (
                  <div
                    key={pId}
                    className="overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]/50"
                  >
                    {/* Paragraph header */}
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
                      <span className="font-mono rounded-full bg-[color:var(--surface-raised)] px-2 py-0.5 text-[10px] text-[color:var(--text-muted)]">
                        {pGroup.totalClips} {pGroup.totalClips === 1 ? 'clip' : 'clips'}
                      </span>
                    </button>

                    {/* Nested sentences */}
                    {!isParagraphCollapsed ? (
                      <div className="space-y-3 border-t border-[color:var(--border-subtle)] px-3 py-3">
                        {pGroup.sentenceGroups.map(sGroup => {
                          const sId = sGroup.sentence?.id ?? `${pId}-orphan`
                          const sNumber = (sGroup.sentence?.index ?? 0) + 1
                          const isSentenceCollapsed = collapsedSentences.has(sId)
                          const label = sGroup.sentence
                            ? `P${pNumber}-S${sNumber}`
                            : `P${pNumber}-?`

                          return (
                            <div key={sId}>
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
                                <p className="line-clamp-1 flex-1 text-[12px] text-[color:var(--text-muted)]">
                                  {sGroup.sentence?.text ?? 'Unlinked clips'}
                                </p>
                                <span className="font-mono rounded-full bg-[color:var(--surface-raised)] px-2 py-0.5 text-[10px] text-[color:var(--text-muted)]">
                                  {sGroup.clips.length}
                                </span>
                              </button>

                              {!isSentenceCollapsed ? (
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                                  {sGroup.clips.map(clip => (
                                    <SortableClipCard
                                      key={clip.id}
                                      clip={clip}
                                      onRemove={removeFromTray}
                                    />
                                  ))}
                                </div>
                              ) : null}
                            </div>
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
