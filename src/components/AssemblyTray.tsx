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
import { Download, GripVertical, Undo2, X } from 'lucide-react'

import type { ParsedSentence, TrayClip } from '@/types'
import { useWorkstationStore } from '@/store/useWorkstationStore'
import { accentBgMap } from '@/utils/accentColors'

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
    opacity: isDragging ? 0.6 : 1,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-[18px] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,#161d1f_0%,#141a1c_100%)]"
    >
      <div className="relative h-20">
        <img
          src={clip.thumbnail}
          alt={clip.title}
          className="h-full w-full object-cover"
        />
        <div className={`absolute inset-y-0 left-0 w-1.5 ${clip.sentenceAccent}`} />
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="absolute left-2 top-2 flex h-5 w-5 cursor-grab items-center justify-center rounded-full bg-black/45 text-[color:var(--text-dim)] active:cursor-grabbing"
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(clip.id)}
          aria-label="Remove clip"
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-[color:var(--text-dim)]"
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
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  // Auto-dismiss undo toast after 6s
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

  // Group clips by sentence, preserving tray order within each group.
  const grouped = useMemo(() => {
    const sentenceMap = new Map<string, ParsedSentence>()
    for (const paragraph of paragraphs) {
      for (const sentence of paragraph.sentences) {
        sentenceMap.set(sentence.id, sentence)
      }
    }
    const groups: { sentence: ParsedSentence | null; clips: TrayClip[] }[] = []
    const indexByKey = new Map<string, number>()
    for (const clip of trayClips) {
      const key = clip.sentenceId
      const existing = indexByKey.get(key)
      if (existing === undefined) {
        indexByKey.set(key, groups.length)
        groups.push({
          sentence: sentenceMap.get(clip.sentenceId) ?? null,
          clips: [clip],
        })
      } else {
        groups[existing].clips.push(clip)
      }
    }
    return groups
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

  const downloadLabel =
    downloadState === 'loading'
      ? `Downloading ${Math.min(downloadProgress, trayClips.length)}/${trayClips.length}...`
      : downloadState === 'done'
        ? 'Done! ✓'
        : `Download All (${trayClips.length})`

  const trayIds = trayClips.map(c => c.id)

  return (
    <section className="relative rounded-[30px] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,#101415_0%,#0d1011_100%)] px-5 py-5 shadow-[0_28px_90px_rgba(0,0,0,0.26)] lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-dim)]">
            Assembly - Section 01
          </p>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            {trayClips.length} clips in tray • {getTotalDuration(trayClips)}
          </p>
        </div>

        <div className="flex items-center gap-4 self-start lg:mt-6">
          <label className="flex items-center gap-2 text-sm text-[color:var(--text-dim)]">
            <span className="h-3 w-3 rounded-sm border border-[color:var(--border-strong)] bg-transparent" />
            Auto-match
          </label>
          <button
            type="button"
            onClick={() => void handleDownloadAll()}
            disabled={isDownloading || trayClips.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-[radial-gradient(circle_at_top,#8cb0ff_0%,#6d92fb_30%,#5476e1_65%,#3c5ccd_100%)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(59,130,246,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {downloadLabel}
          </button>
        </div>
      </div>

      {trayClips.length === 0 ? (
        <div className="mt-5 flex min-h-[128px] items-center justify-center rounded-[18px] border border-dashed border-[color:var(--border-subtle)] bg-transparent text-sm text-[color:var(--text-dim)]">
          No clips in assembly yet. Add candidates from the workspace above.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={trayIds} strategy={horizontalListSortingStrategy}>
            <div className="mt-5 space-y-4">
              {grouped.map(group => (
                <div key={group.sentence?.id ?? 'unknown'}>
                  {group.sentence ? (
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${accentBgMap[group.sentence.accent]}`}
                      />
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
                        S{group.sentence.index + 1}
                      </p>
                      <p className="line-clamp-1 flex-1 text-[12px] text-[color:var(--text-muted)]">
                        {group.sentence.text}
                      </p>
                      <span className="font-mono text-[10px] text-[color:var(--text-dim)]">
                        {group.clips.length}
                      </span>
                    </div>
                  ) : null}
                  <div className="hide-scrollbar grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                    {group.clips.map(clip => (
                      <SortableClipCard
                        key={clip.id}
                        clip={clip}
                        onRemove={removeFromTray}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {lastRemovedClip ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-4 py-3 text-sm text-[color:var(--text-primary)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        >
          <span className="text-[color:var(--text-muted)]">Removed clip</span>
          <button
            type="button"
            onClick={undoRemoveFromTray}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--accent-blue)]/30 bg-[color:var(--accent-blue)]/14 px-2.5 py-1 text-[color:var(--accent-blue)]"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Undo
          </button>
          <button
            type="button"
            onClick={dismissLastRemoved}
            aria-label="Dismiss"
            className="text-[color:var(--text-dim)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </section>
  )
}
