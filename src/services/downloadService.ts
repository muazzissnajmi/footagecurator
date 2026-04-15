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
  a.download = `${filename}.mp4`
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
  triggerBlobDownload(blob, filename)
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
      triggerBlobDownload(blob, buildClipFilename(clip, i))
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
      return `${filename}.mp4 | ${clip.duration} | ${clip.source}`
    })
    .join('\n')

  const header =
    'FOOTAGE CURATOR - EXPORT MANIFEST\n' +
    `Total clips: ${clips.length}\n` +
    `Generated: ${new Date().toLocaleString()}\n` +
    `${'-'.repeat(50)}\n`

  const blob = new Blob([header + manifest], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'manifest.txt'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}