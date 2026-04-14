import type { ParsedParagraph, ParsedSentence } from '@/types'

const ACCENTS = ['blue', 'violet', 'amber', 'emerald'] as const

export function parseTranscript(text: string): ParsedParagraph[] {
  const rawParagraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)

  return rawParagraphs.map((para, pIndex) => {
    const paragraphId = `p${pIndex + 1}`
    const rawSentences = para
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(Boolean)

    const sentences: ParsedSentence[] = rawSentences.map(
      (text, sIndex) => ({
        id: `${paragraphId}-s${sIndex + 1}`,
        paragraphId,
        text,
        accent: ACCENTS[sIndex % ACCENTS.length],
        index: sIndex,
      })
    )

    return {
      id: paragraphId,
      index: pIndex,
      label: `Paragraph ${pIndex + 1}`,
      sentences,
    }
  })
}