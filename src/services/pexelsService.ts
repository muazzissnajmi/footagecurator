import type { CandidateClip } from '@/types'

const PEXELS_BASE_URL = 'https://api.pexels.com/videos'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export async function searchFootage(
  keyword: string,
  page: number = 1
): Promise<CandidateClip[]> {
  const response = await fetch(
    `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(keyword)}&per_page=15&page=${page}&orientation=landscape`,
    {
      headers: {
        Authorization: import.meta.env.VITE_PEXELS_API_KEY,
      },
    }
  )
  const data = await response.json()
  console.log('Pexels response:', data)

  return data.videos
    .filter((video: any) => video.duration <= 15)
    .map((video: any) => {
      const videoFile =
        video.video_files.find((f: any) => f.quality === 'hd') ??
        video.video_files[0]
      return {
        id: String(video.id),
        title: keyword + ' #' + String(video.id).slice(-3),
        source: 'Pexels' as const,
        duration: formatDuration(video.duration),
        resolution: video.width >= 3840 ? '4K' : 'HD',
        added: false,
        thumbnail: video.image,
        videoUrl: videoFile?.link ?? '',
        palette: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
      }
    })
}