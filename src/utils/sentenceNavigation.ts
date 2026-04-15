import type { ParsedParagraph, ParsedSentence } from '@/types'

export function flattenSentences(
  paragraphs: ParsedParagraph[]
): ParsedSentence[] {
  return paragraphs.flatMap(paragraph => paragraph.sentences)
}

export function getAdjacentSentenceId(
  paragraphs: ParsedParagraph[],
  currentId: string | null,
  direction: -1 | 1
): string | null {
  const all = flattenSentences(paragraphs)
  if (all.length === 0) return null
  if (!currentId) return all[0].id

  const idx = all.findIndex(s => s.id === currentId)
  if (idx === -1) return all[0].id

  const target = idx + direction
  if (target < 0 || target >= all.length) return null
  return all[target].id
}

export function getSentencePosition(
  paragraphs: ParsedParagraph[],
  sentenceId: string | null
): { current: number; total: number } {
  const all = flattenSentences(paragraphs)
  if (!sentenceId) return { current: 0, total: all.length }
  const idx = all.findIndex(s => s.id === sentenceId)
  return { current: idx === -1 ? 0 : idx + 1, total: all.length }
}
