import clsx from 'clsx'
import {
  Pause,
  Play,
  RotateCcw,
  Scissors,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { TrayClip } from '@/types'
import { useWorkstationStore } from '@/store/useWorkstationStore'

const FRAME = 1 / 30 // ~33ms, reasonable for 30fps stock footage
const QUICK_GRAB = 3 // seconds the "Grab 3s" helper produces

function parseDuration(d: string): number {
  const [m, s] = d.split(':').map(Number)
  return (m || 0) * 60 + (s || 0)
}

/** MM:SS.FFF for precise pro-style readouts */
function formatTimecode(seconds: number): string {
  const safe = Math.max(0, isFinite(seconds) ? seconds : 0)
  const m = Math.floor(safe / 60)
  const s = Math.floor(safe % 60)
  const ms = Math.floor((safe - Math.floor(safe)) * 1000)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

interface TrimModalProps {
  clip: TrayClip | null
  onClose: () => void
}

export function TrimModal({ clip, onClose }: TrimModalProps) {
  const setClipTrim = useWorkstationStore(state => state.setClipTrim)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<'in' | 'out' | 'scrub' | null>(null)

  const fullDuration = clip ? parseDuration(clip.duration) : 0

  const [inPoint, setInPoint] = useState(0)
  const [outPoint, setOutPoint] = useState(fullDuration)
  const [playhead, setPlayhead] = useState(0)
  const [playing, setPlaying] = useState(true)
  // For pointer drag visuals
  const [dragKind, setDragKind] = useState<'in' | 'out' | 'scrub' | null>(null)

  // Re-initialize when a new clip is opened.
  useEffect(() => {
    if (!clip) return
    const full = parseDuration(clip.duration)
    const i = clip.trimStart ?? 0
    const o = clip.trimEnd ?? full
    setInPoint(i)
    setOutPoint(o)
    setPlayhead(i)
    setPlaying(true)
    // Seek video once metadata is ready (handled in onLoadedMetadata too)
    const video = videoRef.current
    if (video) {
      video.currentTime = i
    }
  }, [clip])

  // Sync play/pause to state.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !clip) return
    if (playing) void video.play().catch(() => {})
    else video.pause()
  }, [playing, clip])

  const seekVideo = useCallback((t: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(fullDuration, t))
  }, [fullDuration])

  // Loop playback within [IN, OUT].
  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    const t = video.currentTime
    if (draggingRef.current !== 'scrub') {
      setPlayhead(t)
    }
    if (t >= outPoint - 0.02) {
      video.currentTime = inPoint
    } else if (t < inPoint - 0.02) {
      video.currentTime = inPoint
    }
  }

  const handleLoadedMetadata = () => {
    seekVideo(inPoint)
  }

  // Pointer-based drag for handles + playhead.
  const startDrag = (kind: 'in' | 'out' | 'scrub') =>
    (event: React.PointerEvent) => {
      event.preventDefault()
      event.stopPropagation()
      draggingRef.current = kind
      setDragKind(kind)
      // Pause while scrubbing handles so the video doesn't fight the drag.
      const wasPlaying = playing
      if (kind === 'scrub') setPlaying(false)

      const applyFromClientX = (clientX: number) => {
        const rect = timelineRef.current?.getBoundingClientRect()
        if (!rect) return
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        const t = pct * fullDuration
        if (kind === 'in') {
          const clamped = Math.min(t, outPoint - FRAME)
          setInPoint(Math.max(0, clamped))
          setPlayhead(Math.max(0, clamped))
          seekVideo(Math.max(0, clamped))
        } else if (kind === 'out') {
          const clamped = Math.max(t, inPoint + FRAME)
          setOutPoint(Math.min(fullDuration, clamped))
          setPlayhead(Math.min(fullDuration, clamped))
          seekVideo(Math.min(fullDuration, clamped))
        } else {
          setPlayhead(t)
          seekVideo(t)
        }
      }

      applyFromClientX(event.clientX)

      const onMove = (moveEvent: PointerEvent) => {
        applyFromClientX(moveEvent.clientX)
      }
      const onUp = () => {
        draggingRef.current = null
        setDragKind(null)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        if (kind === 'scrub' && wasPlaying) setPlaying(true)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }

  // Click anywhere on the timeline track (not on a handle) to move playhead.
  const handleTimelinePointerDown = (event: React.PointerEvent) => {
    // Only react if click was on the track, not bubbled from handles.
    if (event.target !== event.currentTarget) return
    startDrag('scrub')(event)
  }

  const nudge = useCallback((delta: number) => {
    setPlayhead(prev => {
      const next = Math.max(0, Math.min(fullDuration, prev + delta))
      seekVideo(next)
      return next
    })
  }, [fullDuration, seekVideo])

  const setInAtPlayhead = useCallback(() => {
    setInPoint(Math.min(playhead, outPoint - FRAME))
  }, [playhead, outPoint])

  const setOutAtPlayhead = useCallback(() => {
    setOutPoint(Math.max(playhead, inPoint + FRAME))
  }, [playhead, inPoint])

  const grabQuick = useCallback(() => {
    const i = playhead
    const o = Math.min(fullDuration, i + QUICK_GRAB)
    setInPoint(i)
    setOutPoint(o)
    seekVideo(i)
    setPlayhead(i)
  }, [playhead, fullDuration, seekVideo])

  const reset = () => {
    setInPoint(0)
    setOutPoint(fullDuration)
    setPlayhead(0)
    seekVideo(0)
  }

  const save = useCallback(() => {
    if (!clip) return
    const s = inPoint > 0.01 ? inPoint : undefined
    const e = outPoint < fullDuration - 0.01 ? outPoint : undefined
    setClipTrim(clip.id, s, e)
    onClose()
  }, [clip, inPoint, outPoint, fullDuration, setClipTrim, onClose])

  // Keyboard shortcuts inside the modal.
  useEffect(() => {
    if (!clip) return
    const handler = (event: KeyboardEvent) => {
      // Ignore when typing in a number input.
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        // Still honor Enter/Escape even inside inputs.
        if (event.key !== 'Enter' && event.key !== 'Escape') return
      }
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          onClose()
          return
        case 'Enter':
          event.preventDefault()
          save()
          return
        case ' ':
          event.preventDefault()
          setPlaying(p => !p)
          return
        case 'i':
        case 'I':
          event.preventDefault()
          setInAtPlayhead()
          return
        case 'o':
        case 'O':
          event.preventDefault()
          setOutAtPlayhead()
          return
        case 'ArrowLeft':
          event.preventDefault()
          nudge(event.shiftKey ? -1 : -FRAME)
          return
        case 'ArrowRight':
          event.preventDefault()
          nudge(event.shiftKey ? 1 : FRAME)
          return
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () =>
      window.removeEventListener('keydown', handler, { capture: true } as
        unknown as EventListenerOptions)
  }, [clip, onClose, save, setInAtPlayhead, setOutAtPlayhead, nudge])

  if (!clip) return null

  const pctIn = fullDuration ? (inPoint / fullDuration) * 100 : 0
  const pctOut = fullDuration ? (outPoint / fullDuration) * 100 : 100
  const pctPlay = fullDuration ? (playhead / fullDuration) * 100 : 0
  const segmentLen = Math.max(0, outPoint - inPoint)

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        onClick={event => event.stopPropagation()}
        className="w-full max-w-4xl overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] px-6 py-4">
          <div className="flex items-center gap-3">
            <Scissors className="h-4 w-4 text-[color:var(--accent-blue)]" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--text-dim)]">
                Trim Clip
              </p>
              <p className="mt-0.5 line-clamp-1 text-[14px] text-[color:var(--text-primary)]">
                {clip.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video preview */}
        <div className="bg-black">
          <div className="mx-auto aspect-video w-full max-w-3xl">
            <video
              ref={videoRef}
              src={clip.videoUrl}
              className="h-full w-full object-contain"
              muted
              playsInline
              autoPlay
              controls={false}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />
          </div>
        </div>

        {/* Timecode readouts */}
        <div className="grid grid-cols-3 gap-2 border-y border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)]/40 px-6 py-3 text-center">
          <TimecodeField
            label="IN"
            value={inPoint}
            max={Math.max(0, outPoint - FRAME)}
            onChange={v => setInPoint(Math.max(0, Math.min(v, outPoint - FRAME)))}
          />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
              Playhead / Segment
            </p>
            <p className="font-mono mt-1 text-[15px] text-[color:var(--text-primary)]">
              {formatTimecode(playhead)}
            </p>
            <p className="font-mono mt-0.5 text-[11px] text-[color:var(--text-muted)]">
              {segmentLen.toFixed(2)}s of {fullDuration.toFixed(2)}s
            </p>
          </div>
          <TimecodeField
            label="OUT"
            value={outPoint}
            max={fullDuration}
            onChange={v =>
              setOutPoint(Math.max(inPoint + FRAME, Math.min(v, fullDuration)))
            }
          />
        </div>

        {/* Timeline */}
        <div className="px-6 py-6">
          <div
            ref={timelineRef}
            onPointerDown={handleTimelinePointerDown}
            className="relative h-12 w-full cursor-pointer select-none rounded-[var(--radius-control)] bg-[color:var(--surface-canvas)]"
          >
            {/* Dim left of IN */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 rounded-l-[var(--radius-control)] bg-black/60"
              style={{ width: `${pctIn}%` }}
            />
            {/* Dim right of OUT */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 rounded-r-[var(--radius-control)] bg-black/60"
              style={{ width: `${100 - pctOut}%` }}
            />
            {/* Active segment */}
            <div
              className="pointer-events-none absolute inset-y-0 bg-[color:var(--accent-blue)]/15"
              style={{
                left: `${pctIn}%`,
                width: `${Math.max(0, pctOut - pctIn)}%`,
              }}
            />

            {/* IN handle */}
            <Handle
              side="left"
              percent={pctIn}
              active={dragKind === 'in'}
              onPointerDown={startDrag('in')}
              label="IN"
            />
            {/* OUT handle */}
            <Handle
              side="right"
              percent={pctOut}
              active={dragKind === 'out'}
              onPointerDown={startDrag('out')}
              label="OUT"
            />

            {/* Playhead */}
            <div
              onPointerDown={startDrag('scrub')}
              style={{ left: `${pctPlay}%` }}
              className={clsx(
                'absolute top-0 z-10 h-full -translate-x-1/2 cursor-ew-resize',
                'flex flex-col items-center'
              )}
            >
              <span className="mt-[-6px] h-2.5 w-2.5 rotate-45 rounded-[2px] bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
              <span className="h-full w-[2px] bg-white/90" />
            </div>
          </div>

          {/* Controls row */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPlaying(p => !p)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--accent-blue)] text-white shadow-[0_4px_14px_rgba(59,130,246,0.35)]"
                aria-label={playing ? 'Pause' : 'Play'}
                title="Space"
              >
                {playing ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={setInAtPlayhead}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] px-3 py-2 text-[12px] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                title="Set IN at playhead (I)"
              >
                Set IN
                <kbd className="font-mono rounded border border-[color:var(--border-subtle)] px-1 text-[10px] text-[color:var(--text-dim)]">
                  I
                </kbd>
              </button>
              <button
                type="button"
                onClick={setOutAtPlayhead}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] px-3 py-2 text-[12px] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                title="Set OUT at playhead (O)"
              >
                Set OUT
                <kbd className="font-mono rounded border border-[color:var(--border-subtle)] px-1 text-[10px] text-[color:var(--text-dim)]">
                  O
                </kbd>
              </button>
              <button
                type="button"
                onClick={grabQuick}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[color:var(--accent-amber)]/30 bg-[color:var(--accent-amber)]/10 px-3 py-2 text-[12px] text-[color:var(--accent-amber)]"
                title={`Grab ${QUICK_GRAB}s starting at playhead`}
              >
                <Zap className="h-3 w-3" />
                Grab {QUICK_GRAB}s
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] px-3 py-2 text-[12px] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                title="Clear trim"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[var(--radius-control)] px-3 py-2 text-[12px] text-[color:var(--text-dim)] hover:text-[color:var(--text-primary)]"
                title="Esc"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[radial-gradient(circle_at_top,#8cb0ff_0%,#6d92fb_30%,#5476e1_65%,#3c5ccd_100%)] px-4 py-2 text-[13px] font-medium text-white shadow-[0_6px_16px_rgba(59,130,246,0.32)]"
                title="Save (Enter)"
              >
                Save trim
                <kbd className="font-mono rounded bg-white/15 px-1 text-[10px]">
                  ⏎
                </kbd>
              </button>
            </div>
          </div>

          {/* Shortcut hint */}
          <p className="font-mono mt-3 text-[10px] text-[color:var(--text-dim)]">
            Space play · I/O set in-out · ← → nudge 1 frame · Shift+← → nudge
            1s · Enter save · Esc cancel
          </p>
        </div>
      </div>
    </div>
  )
}

function Handle({
  side,
  percent,
  active,
  onPointerDown,
  label,
}: {
  side: 'left' | 'right'
  percent: number
  active: boolean
  onPointerDown: (event: React.PointerEvent) => void
  label: string
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{ left: `${percent}%` }}
      className={clsx(
        'group/handle absolute top-0 z-20 flex h-full -translate-x-1/2 cursor-ew-resize items-center justify-center',
        'touch-none select-none'
      )}
    >
      {/* Wider invisible hit area */}
      <div className="absolute inset-y-0 w-6" />
      {/* Visible bar */}
      <div
        className={clsx(
          'relative h-full w-[3px] rounded-full transition-colors',
          active
            ? 'bg-[color:var(--accent-blue)] shadow-[0_0_12px_rgba(59,130,246,0.6)]'
            : 'bg-[color:var(--accent-blue)]/80 group-hover/handle:bg-[color:var(--accent-blue)]'
        )}
      />
      {/* Bracket top */}
      <span
        className={clsx(
          'absolute -top-2 flex h-4 w-4 items-center justify-center rounded-[3px] border bg-[color:var(--accent-blue)] text-[9px] font-semibold text-white',
          side === 'left' ? 'border-r-0' : 'border-l-0'
        )}
      >
        {side === 'left' ? '[' : ']'}
      </span>
      {/* Label underneath */}
      <span className="font-mono absolute -bottom-5 rounded bg-[color:var(--accent-blue)]/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[color:var(--accent-blue)]">
        {label}
      </span>
    </div>
  )
}

function TimecodeField({
  label,
  value,
  max,
  onChange,
}: {
  label: string
  value: number
  max: number
  onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setEditing(false)
      return
    }
    // Accept either seconds (e.g. "3.25") or MM:SS(.ms)
    let parsed: number
    if (trimmed.includes(':')) {
      const [mPart, sPart] = trimmed.split(':')
      parsed = Number(mPart) * 60 + Number(sPart)
    } else {
      parsed = Number(trimmed)
    }
    if (!isFinite(parsed)) {
      setEditing(false)
      return
    }
    onChange(Math.max(0, Math.min(parsed, max)))
    setEditing(false)
  }

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
        {label}
      </p>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
            }
          }}
          placeholder="MM:SS.ms"
          className="font-mono mt-1 w-full rounded border border-[color:var(--accent-blue)]/40 bg-[color:var(--surface-canvas)] px-2 py-1 text-center text-[14px] text-[color:var(--text-primary)]"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(value.toFixed(3))
            setEditing(true)
          }}
          className="font-mono mt-1 w-full rounded px-2 py-1 text-[15px] text-[color:var(--text-primary)] hover:bg-[color:var(--surface-raised)]"
          title="Click to edit"
        >
          {formatTimecode(value)}
        </button>
      )}
    </div>
  )
}
