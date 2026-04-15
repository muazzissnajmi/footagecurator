import type { TrayClip } from '@/types'

function buildClipFilename(clip: TrayClip, index: number) {
  const paddedIndex = String(index + 1).padStart(2, '0')
  const keyword = clip.title
    .replace(/\s+#\d+$/, '')
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()

  return `${paddedIndex}_${keyword}`
}

async function fetchBlob(videoUrl: string): Promise<Blob> {
  const response = await fetch(videoUrl)
  if (!response.ok) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`
    )
  }
  return response.blob()
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadClip(
  videoUrl: string,
  filename: string
): Promise<void> {
  const blob = await fetchBlob(videoUrl)
  triggerBlobDownload(blob, `${filename}.mp4`)
}

function durationToSeconds(duration: string): number {
  const [m, s] = duration.split(':').map(Number)
  return (m || 0) * 60 + (s || 0)
}

function secondsToTimecode(seconds: number, fps = 30): string {
  const total = Math.max(0, Math.round(seconds * fps))
  const h = Math.floor(total / (fps * 3600))
  const m = Math.floor((total / (fps * 60)) % 60)
  const s = Math.floor((total / fps) % 60)
  const f = total % fps
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`
}

function buildEDL(clips: TrayClip[]): string {
  const lines: string[] = ['TITLE: FOOTAGE_CURATOR_EXPORT', 'FCM: NON-DROP FRAME', '']
  let recordStart = 0
  clips.forEach((clip, index) => {
    const clipDuration = durationToSeconds(clip.duration)
    const srcIn = clip.trimStart ?? 0
    const srcOut = clip.trimEnd ?? clipDuration
    const segmentLen = Math.max(0, srcOut - srcIn)
    const reel = buildClipFilename(clip, index).toUpperCase().slice(0, 8)
    const event = String(index + 1).padStart(3, '0')
    const srcInTc = secondsToTimecode(srcIn)
    const srcOutTc = secondsToTimecode(srcOut)
    const recInTc = secondsToTimecode(recordStart)
    const recOutTc = secondsToTimecode(recordStart + segmentLen)
    lines.push(
      `${event}  ${reel}  V  C  ${srcInTc} ${srcOutTc} ${recInTc} ${recOutTc}`
    )
    lines.push(`* FROM CLIP NAME: ${buildClipFilename(clip, index)}.mp4`)
    lines.push('')
    recordStart += segmentLen
  })
  return lines.join('\n')
}

function buildCredits(clips: TrayClip[]): string {
  const header =
    'FOOTAGE CURATOR — CREDITS\n' +
    `Generated: ${new Date().toLocaleString()}\n` +
    'All clips sourced from Pexels (https://pexels.com).\n' +
    'Pexels license requires attribution to Pexels and the videographer.\n' +
    '----------------------------------------------------\n\n'
  const body = clips
    .map((clip, index) => {
      const filename = `${buildClipFilename(clip, index)}.mp4`
      const url = `https://www.pexels.com/video/${clip.id}`
      return `${filename}\n  Source: ${clip.source}\n  URL: ${url}`
    })
    .join('\n\n')
  return header + body + '\n'
}

export async function downloadAllClips(
  clips: TrayClip[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  // Fetch all blobs in parallel; trigger anchor clicks sequentially
  // (some browsers throttle/cancel rapid simultaneous downloads).
  const blobPromises = clips.map(clip =>
    clip.videoUrl ? fetchBlob(clip.videoUrl).catch(() => null) : Promise.resolve(null)
  )

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const blob = await blobPromises[i]

    if (blob) {
      triggerBlobDownload(blob, `${buildClipFilename(clip, i)}.mp4`)
      // Spacing prevents browser from coalescing/dropping downloads.
      if (i < clips.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
    onProgress?.(i + 1, clips.length)
  }

  const manifest = clips
    .map((clip, index) => {
      const filename = buildClipFilename(clip, index)
      const trimNote =
        clip.trimStart != null || clip.trimEnd != null
          ? ` | trim ${clip.trimStart ?? 0}s → ${clip.trimEnd ?? durationToSeconds(clip.duration)}s`
          : ''
      return `${filename}.mp4 | ${clip.duration} | ${clip.source}${trimNote}`
    })
    .join('\n')

  const header =
    'FOOTAGE CURATOR - EXPORT MANIFEST\n' +
    `Total clips: ${clips.length}\n` +
    `Generated: ${new Date().toLocaleString()}\n` +
    `${'-'.repeat(50)}\n`

  triggerBlobDownload(
    new Blob([header + manifest], { type: 'text/plain' }),
    'manifest.txt'
  )
  triggerBlobDownload(
    new Blob([buildEDL(clips)], { type: 'text/plain' }),
    'assembly.edl'
  )
  triggerBlobDownload(
    new Blob([buildCredits(clips)], { type: 'text/plain' }),
    'credits.txt'
  )
}
