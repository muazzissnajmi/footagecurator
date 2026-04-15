import type { CandidateClip } from '@/types'

const PEXELS_BASE_URL = 'https://api.pexels.com/videos'

interface PexelsVideoFile {
  link: string
  quality: string
  width: number
  height: number
}

interface PexelsVideo {
  id: number
  duration: number
  image: string
  video_files: PexelsVideoFile[]
}

interface PexelsSearchResponse {
  videos?: PexelsVideo[]
  error?: string
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export interface SearchFootageResult {
  clips: CandidateClip[]
  hasMore: boolean
}

export async function searchFootage(
  keyword: string,
  page: number = 1
): Promise<SearchFootageResult> {
  const response = await fetch(
    `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(keyword)}&per_page=6&page=${page}&orientation=landscape`,
    {
      headers: {
        Authorization: import.meta.env.VITE_PEXELS_API_KEY,
      },
    }
  )

  if (!response.ok) {
    throw new Error(
      `Pexels request failed: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as PexelsSearchResponse

  if (!data.videos || !Array.isArray(data.videos)) {
    throw new Error(
      `Pexels returned unexpected response${data.error ? `: ${data.error}` : ''}`
    )
  }

  const perPage = 6
  const hasMore = data.videos.length >= perPage

  const clips = data.videos
    .filter(video => video.duration <= 15)
    .slice(0, 4)
    .map(video => {
      const files = video.video_files ?? []
      const videoFile =
        files.find(f => f.quality === 'hd' && f.width <= 1920) ??
        files.find(f => f.quality === 'sd') ??
        files[0]

      return {
        id: String(video.id),
        title: keyword + ' #' + String(video.id).slice(-3),
        source: 'Pexels' as const,
        duration: formatDuration(video.duration),
        resolution: 'HD' as const,
        added: false,
        thumbnail: video.image,
        videoUrl: videoFile?.link ?? '',
        palette: 'from-[#1a1a2e] via-[#16213e] to-[#0f3460]',
      }
    })

  return { clips, hasMore }
}
