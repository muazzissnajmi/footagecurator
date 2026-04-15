import type { ParsedParagraph, TrayClip } from '@/types'

export const MAX_CLIPS_PER_SENTENCE = 5

export function countClipsForSentence(
  trayClips: TrayClip[],
  sentenceId: string
): number {
  return trayClips.filter(c => c.sentenceId === sentenceId).length
}

export function isSentenceComplete(
  trayClips: TrayClip[],
  sentenceId: string,
  skippedSentences: Record<string, true> = {}
): boolean {
  if (skippedSentences[sentenceId]) return true
  return countClipsForSentence(trayClips, sentenceId) >= MAX_CLIPS_PER_SENTENCE
}

export function getParagraphProgress(
  paragraph: ParsedParagraph,
  trayClips: TrayClip[],
  skippedSentences: Record<string, true> = {}
): {
  completedSentences: number
  totalSentences: number
  clips: number
  clipTarget: number
  isComplete: boolean
} {
  const totalSentences = paragraph.sentences.length
  let completedSentences = 0
  let clips = 0
  let activeSentences = 0
  for (const sentence of paragraph.sentences) {
    const skipped = Boolean(skippedSentences[sentence.id])
    const n = countClipsForSentence(trayClips, sentence.id)
    clips += n
    if (skipped) {
      completedSentences++
    } else {
      activeSentences++
      if (n >= MAX_CLIPS_PER_SENTENCE) completedSentences++
    }
  }
  const clipTarget = activeSentences * MAX_CLIPS_PER_SENTENCE
  return {
    completedSentences,
    totalSentences,
    clips,
    clipTarget,
    isComplete: completedSentences === totalSentences && totalSentences > 0,
  }
}

export function getAssemblyProgress(
  paragraphs: ParsedParagraph[],
  trayClips: TrayClip[],
  skippedSentences: Record<string, true> = {}
): {
  completedSentences: number
  totalSentences: number
  clips: number
  clipTarget: number
} {
  let completedSentences = 0
  let totalSentences = 0
  let activeSentences = 0
  for (const paragraph of paragraphs) {
    for (const sentence of paragraph.sentences) {
      totalSentences++
      const skipped = Boolean(skippedSentences[sentence.id])
      if (skipped) {
        completedSentences++
      } else {
        activeSentences++
        if (
          countClipsForSentence(trayClips, sentence.id) >=
          MAX_CLIPS_PER_SENTENCE
        ) {
          completedSentences++
        }
      }
    }
  }
  return {
    completedSentences,
    totalSentences,
    clips: trayClips.length,
    clipTarget: activeSentences * MAX_CLIPS_PER_SENTENCE,
  }
}
