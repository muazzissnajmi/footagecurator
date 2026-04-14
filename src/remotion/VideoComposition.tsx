import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'

import type { TrayClip } from '@/types'

type VideoCompositionProps = {
  clips: TrayClip[]
  narrationUrl: string | null
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

export function VideoComposition({
  clips,
  narrationUrl,
}: VideoCompositionProps) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const clipDiagnostics = clips.map(clip => ({
    id: clip.id,
    title: clip.title,
    duration: clip.duration,
    durationInSeconds: getDurationInSeconds(clip.duration),
    hasVideoUrl: Boolean(clip.videoUrl),
    videoUrl: clip.videoUrl,
  }))

  console.log('VideoComposition render', {
    frame,
    clips: clipDiagnostics,
    narrationUrl,
  })

  clipDiagnostics.forEach(clip => {
    if (!clip.hasVideoUrl) {
      console.warn('VideoComposition missing videoUrl for clip', clip)
    }
  })

  return (
    <AbsoluteFill className="bg-black">
      {clips.map((clip, index) => {
        const startFrame = clips
          .slice(0, index)
          .reduce(
            (acc, item) => acc + Math.round(getDurationInSeconds(item.duration) * fps),
            0
          )
        const durationFrames = Math.max(
          Math.round(getDurationInSeconds(clip.duration) * fps),
          1
        )

        return (
          <Sequence
            key={clip.id}
            from={startFrame}
            durationInFrames={durationFrames}
          >
            <AbsoluteFill>
              {clip.videoUrl ? (
                <video
                  src={clip.videoUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  autoPlay
                  muted
                  loop={false}
                />
              ) : (
                <img
                  src={clip.thumbnail}
                  alt={clip.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </AbsoluteFill>
          </Sequence>
        )
      })}
      {narrationUrl ? <Audio src={narrationUrl} /> : null}
    </AbsoluteFill>
  )
}