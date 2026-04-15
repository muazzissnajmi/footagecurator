import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { ParsedSentence, TrayClip } from '@/types'
import { useWorkstationStore } from '@/store/useWorkstationStore'
import { flattenSentences } from '@/utils/sentenceNavigation'

interface AssemblyPlayerProps {
  open: boolean
  onClose: () => void
}

export function AssemblyPlayer({ open, onClose }: AssemblyPlayerProps) {
  const trayClips = useWorkstationStore(state => state.trayClips)
  const paragraphs = useWorkstationStore(state => state.paragraphs)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Order clips in script order (same ordering used elsewhere).
  const ordered = orderClipsByScript(trayClips, paragraphs)
  const sentenceLookup = new Map<string, ParsedSentence>()
  for (const sentence of flattenSentences(paragraphs)) {
    sentenceLookup.set(sentence.id, sentence)
  }

  const clip = ordered[index]

  useEffect(() => {
    if (!open) return
    setIndex(0)
    setPlaying(true)
  }, [open])

  useEffect(() => {
    if (!open || !clip || !videoRef.current) return
    const video = videoRef.current
    video.currentTime = clip.trimStart ?? 0
    if (playing) video.play().catch(() => {})
    else video.pause()
  }, [open, clip, playing])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === ' ') {
        event.preventDefault()
        setPlaying(p => !p)
      } else if (event.key === 'ArrowRight') {
        setIndex(i => Math.min(i + 1, ordered.length - 1))
      } else if (event.key === 'ArrowLeft') {
        setIndex(i => Math.max(i - 1, 0))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, ordered.length])

  if (!open) return null

  if (!clip) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6">
        <div className="rounded-[var(--radius-card)] bg-[color:var(--surface-panel)] p-8 text-center">
          <p className="text-sm text-[color:var(--text-primary)]">
            No clips in the assembly yet.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] px-4 py-2 text-sm text-[color:var(--text-muted)]"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const sentence = sentenceLookup.get(clip.sentenceId) ?? null
  const handleEnded = () => {
    if (index + 1 < ordered.length) setIndex(index + 1)
    else setPlaying(false)
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    if (clip.trimEnd != null && video.currentTime >= clip.trimEnd) {
      if (index + 1 < ordered.length) setIndex(index + 1)
      else {
        video.pause()
        setPlaying(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/92 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-dim)]">
            Sequence Preview
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Clip {index + 1} of {ordered.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mx-auto mt-4 flex w-full max-w-5xl flex-1 items-center justify-center">
        <video
          ref={videoRef}
          src={clip.videoUrl}
          className="max-h-full w-full rounded-[var(--radius-card)] bg-black object-contain shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
          autoPlay
          playsInline
          controls={false}
          onEnded={handleEnded}
          onTimeUpdate={handleTimeUpdate}
        />
      </div>

      {sentence ? (
        <div className="mx-auto mt-4 max-w-3xl rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]/90 px-5 py-3 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
            S{sentence.index + 1}
          </p>
          <p className="mt-1 text-[14px] leading-6 text-[color:var(--text-primary)]">
            {sentence.text}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setIndex(i => Math.max(i - 1, 0))}
          disabled={index === 0}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] disabled:opacity-30"
          aria-label="Previous clip"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setPlaying(p => !p)}
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--accent-blue)] text-white shadow-[0_8px_24px_rgba(59,130,246,0.35)]"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </button>
        <button
          type="button"
          onClick={() =>
            setIndex(i => Math.min(i + 1, ordered.length - 1))
          }
          disabled={index === ordered.length - 1}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] disabled:opacity-30"
          aria-label="Next clip"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function orderClipsByScript(
  clips: TrayClip[],
  paragraphs: { id: string; sentences: { id: string; index: number }[] }[]
): TrayClip[] {
  const order = new Map<string, number>()
  let pIndex = 0
  for (const paragraph of paragraphs) {
    for (const sentence of paragraph.sentences) {
      order.set(sentence.id, pIndex * 1000 + sentence.index)
    }
    pIndex++
  }
  const ORPHAN = Number.MAX_SAFE_INTEGER
  return [...clips].sort((a, b) => {
    const aKey = order.get(a.sentenceId) ?? ORPHAN
    const bKey = order.get(b.sentenceId) ?? ORPHAN
    if (aKey !== bKey) return aKey - bKey
    return a.order - b.order
  })
}
