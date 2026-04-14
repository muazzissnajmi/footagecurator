import { sampleTranscript } from '@/data/sampleTranscript'
import { parseTranscript } from '@/utils/parseTranscript'

export function App() {
  const paragraphs = parseTranscript(sampleTranscript)
  const sentenceCount = paragraphs.reduce(
    (total, paragraph) => total + paragraph.sentences.length,
    0
  )

  return (
    <main>
      <p>Footage Curator rebuild</p>
      <h1>Foundation ready</h1>
      <p>
        Parsed {paragraphs.length} paragraphs and {sentenceCount} sentences from
        the sample transcript.
      </p>
    </main>
  )
}