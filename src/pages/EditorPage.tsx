import { useMemo, useState } from 'react'

import { Player } from '@remotion/player'
import { Download, Eye, Lock, Search, Trash2, Upload } from 'lucide-react'

import { VideoComposition } from '@/remotion/VideoComposition'
import { useEditorStore } from '@/store/useEditorStore'
import { useWorkstationStore } from '@/store/useWorkstationStore'

const waveformHeights = [
  '36%',
  '64%',
  '48%',
  '82%',
  '56%',
  '74%',
  '42%',
  '88%',
  '52%',
  '68%',
  '46%',
  '80%',
  '58%',
  '72%',
  '44%',
  '84%',
  '50%',
  '76%',
  '40%',
  '86%',
  '54%',
  '66%',
  '38%',
  '78%',
  '60%',
  '70%',
  '45%',
  '83%',
  '57%',
  '73%',
  '41%',
  '87%',
  '53%',
  '65%',
  '47%',
  '79%',
  '59%',
  '71%',
  '43%',
  '85%',
]

function getAccentColor(accentClass: string) {
  return accentClass.replace('bg-[', '').replace(']', '') || '#3b82f6'
}

function getDurationInSeconds(duration: string) {
  if (duration.includes(':')) {
    return duration
      .split(':')
      .map(part => Number(part))
      .reduce((acc, part) => acc * 60 + part, 0)
  }

  const numericDuration = Number.parseFloat(duration)
  return Number.isFinite(numericDuration) ? numericDuration : 0
}

function formatTimelineTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function getClipDisplayTitle(title: string) {
  return title.split(' #')[0] ?? title
}

export function EditorPage() {
  const [playheadPosition, setPlayheadPosition] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(10)

  const clips = useEditorStore(state => state.clips)
  const narrationUrl = useEditorStore(state => state.narrationUrl)
  const selectedClipId = useEditorStore(state => state.selectedClipId)
  const loadNarration = useEditorStore(state => state.loadNarration)
  const selectClip = useEditorStore(state => state.selectClip)
  const removeClip = useEditorStore(state => state.removeClip)
  const loadClipsFromWorkstation = useEditorStore(
    state => state.loadClipsFromWorkstation
  )

  const trayClips = useWorkstationStore(state => state.trayClips)

  const selectedClip = useMemo(
    () => clips.find(clip => clip.id === selectedClipId) ?? null,
    [clips, selectedClipId]
  )

  const pixelsPerSecond = zoomLevel * 8

  const timelineSegments = useMemo(() => {
    let currentOffset = 0

    return clips.map(clip => {
      const durationInSeconds = getDurationInSeconds(clip.duration)
      const startInSeconds = currentOffset
      const width = Math.max(durationInSeconds * pixelsPerSecond, 60)

      currentOffset += durationInSeconds

      return {
        clip,
        durationInSeconds,
        startInSeconds,
        startInPixels: startInSeconds * pixelsPerSecond,
        width,
      }
    })
  }, [clips, pixelsPerSecond])

  const timelineDurationInSeconds =
    timelineSegments[timelineSegments.length - 1]?.startInSeconds +
      timelineSegments[timelineSegments.length - 1]?.durationInSeconds ||
    0

  const timelineWidth = Math.max(
    timelineDurationInSeconds * pixelsPerSecond + 48,
    720
  )

  const timeMarkerCount = Math.max(
    20,
    Math.ceil(timelineDurationInSeconds / 5) + 1
  )

  const totalDurationInFrames = Math.max(
    Math.round(timelineDurationInSeconds * 30),
    30
  )

  return (
    <div className="grid min-h-[calc(100vh-61px)] grid-cols-[280px_1fr_280px] bg-[color:var(--surface-canvas)]">
      <aside className="flex h-[calc(100vh-61px)] flex-col border-r border-[color:var(--border-subtle)]">
        <div className="flex shrink-0 items-start justify-between border-b border-[color:var(--border-subtle)] px-4 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--text-muted)]">
              Script
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-primary)]">
              {clips.length} clips loaded
            </p>
          </div>
          <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
            Edit
          </span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {clips.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]/40 px-6 text-center text-sm text-[color:var(--text-muted)]">
              No clips loaded
            </div>
          ) : (
            clips.map((clip, index) => {
              const isSelected = selectedClipId === clip.id

              return (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => selectClip(clip.id)}
                  className={`flex w-full gap-3 rounded-xl border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-[color:var(--accent-blue)] bg-[rgba(59,130,246,0.1)]'
                      : 'border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] hover:border-[color:var(--border-strong)]'
                  }`}
                >
                  <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-[color:var(--border-subtle)]">
                    <img
                      src={clip.thumbnail}
                      alt={clip.title}
                      className="h-full w-full object-cover"
                    />
                    <span
                      className="absolute left-1 top-1 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-dim)]">
                        Clip {index + 1}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-[color:var(--text-dim)]" />
                      <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-400">
                        Ready
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[color:var(--text-primary)]">
                      {clip.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="font-mono text-[10px] text-[color:var(--text-muted)]">
                        {clip.duration}
                      </p>
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation()
                          removeClip(clip.id)
                        }}
                        className="rounded-lg border border-transparent p-1 text-[color:var(--text-muted)] transition-colors hover:border-red-500/20 hover:text-red-400"
                        aria-label={`Remove ${clip.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="shrink-0 border-t border-[color:var(--border-subtle)] p-4">
          <button
            type="button"
            onClick={() => loadClipsFromWorkstation(trayClips)}
            disabled={trayClips.length === 0}
            className="w-full rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-4 py-2.5 text-sm text-[color:var(--text-primary)] transition-colors hover:border-[color:var(--border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Load from Workstation
          </button>
        </div>
      </aside>

      <main className="flex h-[calc(100vh-61px)] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]/65 px-6 py-3 backdrop-blur-sm">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[color:var(--text-muted)]">
              Preview
            </p>
            <p className="mt-1 text-sm text-[color:var(--text-primary)]">
              {clips.length > 0
                ? `${clips.length} clips · ${timelineDurationInSeconds.toFixed(2)}s total`
                : 'Load clips from the workstation tray to preview the sequence'}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)] px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
            <Search className="h-3.5 w-3.5" />
            Remotion Player
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-black p-6">
          {clips.length > 0 ? (
            <div className="w-full max-w-[854px]">
              <Player
                component={VideoComposition}
                inputProps={{ clips, narrationUrl }}
                durationInFrames={totalDurationInFrames}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                style={{ width: '100%', maxWidth: 854 }}
                controls
              />
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]/60 px-10 py-12 text-center text-sm text-[color:var(--text-muted)]">
              <p>No clips loaded</p>
              <p className="mt-2 text-xs text-[color:var(--text-dim)]">
                Load clips from Workstation to begin building the sequence.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-[color:var(--text-muted)]">
              Timeline
            </span>
            <span className="text-[11px] text-[color:var(--text-muted)]">
              {clips.length} clips
            </span>
          </div>

          <div className="min-h-[200px] overflow-hidden rounded-xl border border-[color:var(--border-subtle)] bg-[#101012] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="overflow-x-auto">
              <div className="min-w-full" style={{ width: `${timelineWidth + 48}px` }}>
                <div className="flex border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)]">
                  <div className="sticky left-0 z-20 w-12 flex-shrink-0 border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]" />
                  <div className="relative h-6 overflow-hidden" style={{ width: `${timelineWidth}px` }}>
                    {Array.from({ length: timeMarkerCount }).map((_, index) => {
                      const markerTime = index * 5

                      return (
                        <div
                          key={markerTime}
                          className="absolute top-0 flex flex-col items-center"
                          style={{ left: `${markerTime * pixelsPerSecond}px` }}
                        >
                          <span className="px-1 font-mono text-[9px] text-[color:var(--text-muted)]">
                            {formatTimelineTime(markerTime)}
                          </span>
                          <div className="h-2 w-px bg-[color:var(--border-subtle)]" />
                        </div>
                      )
                    })}
                    <div
                      className="absolute top-0 z-10 w-px bg-[color:var(--accent-blue)] shadow-[0_0_12px_rgba(59,130,246,0.65)]"
                      style={{ left: `${playheadPosition}px`, height: '100%' }}
                    />
                  </div>
                </div>

                <div className="relative flex border-b border-[color:var(--border-subtle)] bg-[#0d0d0d]">
                  <div className="sticky left-0 z-20 flex w-12 flex-shrink-0 flex-col items-center justify-center gap-1 border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] py-2">
                    <span className="font-mono text-[9px] text-[color:var(--text-muted)]">
                      V1
                    </span>
                    <Eye className="h-3 w-3 text-[color:var(--text-muted)]" />
                    <Lock className="h-3 w-3 text-[color:var(--text-dim)]" />
                  </div>
                  <div className="relative flex-1 overflow-hidden bg-[#0d0d0d]" style={{ width: `${timelineWidth}px`, minHeight: '72px' }}>
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-[color:var(--accent-blue)]/90"
                      style={{ left: `${playheadPosition}px` }}
                    />
                    <div className="relative h-[72px] p-1">
                      {timelineSegments.map(({ clip, startInPixels, width }) => (
                        <button
                          key={clip.id}
                          type="button"
                          onClick={() => {
                            selectClip(clip.id)
                            setPlayheadPosition(startInPixels)
                          }}
                          className={`absolute top-2 overflow-hidden rounded border transition-all ${
                            selectedClipId === clip.id
                              ? 'border-[color:var(--accent-blue)] ring-1 ring-[color:var(--accent-blue)]'
                              : 'border-[color:var(--border-subtle)] hover:border-[color:var(--border-strong)]'
                          }`}
                          style={{
                            left: `${startInPixels}px`,
                            width: `${width}px`,
                            height: '56px',
                          }}
                        >
                          <div
                            className="absolute top-0 h-1 w-full"
                            style={{ backgroundColor: getAccentColor(clip.sentenceAccent) }}
                          />
                          <img
                            src={clip.thumbnail}
                            alt={clip.title}
                            className="h-full w-full object-cover opacity-80"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-1 text-left">
                            <p className="truncate font-mono text-[8px] text-white">
                              {getClipDisplayTitle(clip.title)}
                            </p>
                            <p className="font-mono text-[7px] text-[rgba(255,255,255,0.6)]">
                              {clip.duration}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="relative flex bg-[#0d0d0d]">
                  <div className="sticky left-0 z-20 flex w-12 flex-shrink-0 flex-col items-center justify-center gap-1 border-r border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] py-2">
                    <span className="font-mono text-[9px] text-[color:var(--text-muted)]">
                      A1
                    </span>
                    <Eye className="h-3 w-3 text-[color:var(--text-muted)]" />
                    <Lock className="h-3 w-3 text-[color:var(--text-dim)]" />
                  </div>
                  <div className="relative flex-1 overflow-hidden bg-[#0d0d0d]" style={{ width: `${timelineWidth}px`, minHeight: '56px' }}>
                    <div
                      className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-[color:var(--accent-blue)]/90"
                      style={{ left: `${playheadPosition}px` }}
                    />
                    <div className="p-1">
                      {narrationUrl ? (
                        <div className="relative h-10 overflow-hidden rounded border border-[color:var(--border-subtle)] bg-[rgba(56,189,248,0.08)]" style={{ width: `${timelineWidth - 8}px` }}>
                          <div className="absolute inset-0 flex items-center justify-around px-2">
                            {Array.from({ length: Math.max(48, Math.floor((timelineWidth - 8) / 10)) }).map((_, index) => {
                              const height = waveformHeights[index % waveformHeights.length]

                              return (
                                <span
                                  key={`audio-wave-${index}`}
                                  className="w-px rounded-full bg-[rgba(125,211,252,0.92)] shadow-[0_0_10px_rgba(125,211,252,0.35)]"
                                  style={{ height }}
                                />
                              )
                            })}
                          </div>
                          <div className="absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-black/70 to-transparent px-3">
                            <span className="font-mono text-[9px] tracking-[0.18em] text-[rgba(255,255,255,0.72)]">
                              NARRATION VO
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-10 items-center rounded border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)]/70 px-3">
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text-primary)]">
                            <Upload className="h-3.5 w-3.5" />
                            Import Narration MP3
                            <input
                              type="file"
                              accept="audio/mp3,audio/*"
                              className="hidden"
                              onChange={event => {
                                const file = event.target.files?.[0]
                                if (file) {
                                  loadNarration(file)
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-4 py-2">
              <div className="flex items-center gap-2 font-mono text-[10px] text-[color:var(--text-muted)]">
                <span>{clips.length} clips</span>
                <span>•</span>
                <span>30 FPS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[color:var(--text-muted)]">ZOOM</span>
                <input
                  id="timeline-zoom"
                  type="range"
                  min={5}
                  max={30}
                  value={zoomLevel}
                  onChange={event => setZoomLevel(Number(event.target.value))}
                  className="w-24 accent-[color:var(--accent-blue)]"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="flex h-[calc(100vh-61px)] flex-col border-l border-[color:var(--border-subtle)]">
        <div className="shrink-0 border-b border-[color:var(--border-subtle)] px-4 py-4">
          <p className="text-[11px] uppercase tracking-widest text-[color:var(--text-muted)]">
            Inspector
          </p>
        </div>

        <div className="flex-1 p-4">
          {selectedClip ? (
            <div className="space-y-4">
              <img
                src={selectedClip.thumbnail}
                alt={selectedClip.title}
                className="h-32 w-full rounded-xl object-cover"
              />
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-muted)]">
                  Clip Name
                </label>
                <p className="mt-1 text-sm text-[color:var(--text-primary)]">
                  {selectedClip.title}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-muted)]">
                    Duration
                  </label>
                  <p className="mt-1 font-mono text-sm text-[color:var(--text-primary)]">
                    {selectedClip.duration}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-muted)]">
                    Resolution
                  </label>
                  <p className="mt-1 font-mono text-sm text-[color:var(--text-primary)]">
                    {selectedClip.resolution}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[color:var(--text-muted)]">
                  Source
                </label>
                <p className="mt-1 text-sm text-[color:var(--text-primary)]">
                  {selectedClip.source}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeClip(selectedClip.id)}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/15"
              >
                Remove Clip
              </button>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[color:var(--text-muted)]">
              Select a clip to inspect
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-[color:var(--border-subtle)] p-4">
          <button
            type="button"
            className="w-full rounded-xl bg-[color:var(--accent-blue)] px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.3)] transition-transform hover:-translate-y-px"
          >
            <Download className="mr-2 inline h-4 w-4" />
            Export Video
          </button>
        </div>
      </aside>
    </div>
  )
}