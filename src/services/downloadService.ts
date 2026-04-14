import type { TrayClip } from '@/types'

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
  clips: TrayClip[]
): Promise<void> {
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    if (clip.videoUrl) {
      const index = String(i + 1).padStart(2, '0')
      const keyword = clip.title
        .replace(/\s+#\d+$/, '')
        .replace(/\s+/g, '_')
        .toLowerCase()
      const filename = `${index}_${keyword}`
      await downloadClip(clip.videoUrl, filename)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}