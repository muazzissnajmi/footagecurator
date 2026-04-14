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
  for (const clip of clips) {
    if (clip.videoUrl) {
      await downloadClip(clip.videoUrl, `${clip.id}_${clip.title}`)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}