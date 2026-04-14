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

export async function downloadClip(
  videoUrl: string,
  filename: string
): Promise<void> {
  const response = await fetch(videoUrl)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.mp4`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadAllClips(
  clips: TrayClip[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]

    if (!clip.videoUrl) {
      onProgress?.(i + 1, clips.length)
      continue
    }

    const filename = buildClipFilename(clip, i)

    await downloadClip(clip.videoUrl, filename)
    onProgress?.(i + 1, clips.length)
    await new Promise(resolve => setTimeout(resolve, 600))
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