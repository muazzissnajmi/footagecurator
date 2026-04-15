export type AccentColor = 'blue' | 'violet' | 'amber' | 'emerald'

export type ParsedSentence = {
  id: string
  paragraphId: string
  text: string
  accent: AccentColor
  index: number
}

export type ParsedParagraph = {
  id: string
  index: number
  label: string
  sentences: ParsedSentence[]
}

export type CandidateClip = {
  id: string
  source: 'Pexels' | 'Pixabay'
  title: string
  thumbnail: string
  duration: string
  resolution: 'HD' | '4K'
  added: boolean
  videoUrl: string
  sentenceId?: string
  palette: string
}

export type TrayClip = CandidateClip & {
  sentenceId: string
  sentenceAccent: string
  order: number
  /** Optional trim-in point in seconds. Undefined = clip start. */
  trimStart?: number
  /** Optional trim-out point in seconds. Undefined = clip end. */
  trimEnd?: number
}