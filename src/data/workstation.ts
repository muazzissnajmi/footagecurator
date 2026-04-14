import type { CandidateClip, ParsedParagraph, TrayClip } from '@/types'
import { parseTranscript } from '@/utils/parseTranscript'

import { sampleTranscript } from './sampleTranscript'

export const workstationParagraphs: ParsedParagraph[] = parseTranscript(
  sampleTranscript
)

export const workstationActiveSentenceId =
  workstationParagraphs[0]?.sentences[1]?.id ??
  workstationParagraphs[0]?.sentences[0]?.id ??
  null

export const workstationKeywords = [
  'flag lowering',
  'language suppression',
  'demonstration protest',
  'government officials',
]

export const workstationActiveKeyword = workstationKeywords[2]

export const workstationCandidateClips: CandidateClip[] = [
  {
    id: 'pex-909',
    source: 'Pexels',
    title: 'demonstration protest #909',
    thumbnail:
      'https://images.pexels.com/photos/1464230/pexels-photo-1464230.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '00:02',
    resolution: 'HD',
    added: true,
    videoUrl: '',
    palette: 'from-[#4756a5] via-[#6777bc] to-[#20244f]',
  },
  {
    id: 'pex-287',
    source: 'Pexels',
    title: 'demonstration protest #287',
    thumbnail:
      'https://images.pexels.com/photos/2990647/pexels-photo-2990647.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '00:07',
    resolution: 'HD',
    added: true,
    videoUrl: '',
    palette: 'from-[#24191c] via-[#6c3f43] to-[#b87165]',
  },
  {
    id: 'pex-082',
    source: 'Pexels',
    title: 'demonstration protest #082',
    thumbnail:
      'https://images.pexels.com/photos/2014773/pexels-photo-2014773.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '00:10',
    resolution: 'HD',
    added: true,
    videoUrl: '',
    palette: 'from-[#1b1d2b] via-[#373d5a] to-[#202633]',
  },
  {
    id: 'pex-018',
    source: 'Pexels',
    title: 'demonstration protest #018',
    thumbnail:
      'https://images.pexels.com/photos/6995247/pexels-photo-6995247.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '00:10',
    resolution: '4K',
    added: false,
    videoUrl: '',
    palette: 'from-[#4d5a7f] via-[#b7c3db] to-[#d9c9a8]',
  },
]

export const workstationTrayClips: TrayClip[] = [
  {
    ...workstationCandidateClips[0],
    sentenceId: workstationActiveSentenceId ?? 'p1-s1',
    sentenceAccent: 'bg-[#8b5cf6]',
    order: 0,
  },
  {
    id: 'tray-544',
    source: 'Pexels',
    title: 'africa map #544',
    thumbnail:
      'https://images.pexels.com/photos/7235938/pexels-photo-7235938.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '00:05',
    resolution: 'HD',
    added: true,
    videoUrl: '',
    palette: 'from-[#2a4d69] via-[#4b86b4] to-[#adcbe3]',
    sentenceId: workstationActiveSentenceId ?? 'p1-s1',
    sentenceAccent: 'bg-[#8b5cf6]',
    order: 1,
  },
  {
    id: 'tray-894',
    source: 'Pexels',
    title: 'national border #894',
    thumbnail:
      'https://images.pexels.com/photos/667200/pexels-photo-667200.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '00:06',
    resolution: 'HD',
    added: true,
    videoUrl: '',
    palette: 'from-[#3e2723] via-[#8d6e63] to-[#d7ccc8]',
    sentenceId: workstationActiveSentenceId ?? 'p1-s1',
    sentenceAccent: 'bg-[#8b5cf6]',
    order: 2,
  },
  {
    id: 'tray-965',
    source: 'Pexels',
    title: 'protest crowd #965',
    thumbnail:
      'https://images.pexels.com/photos/1464234/pexels-photo-1464234.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '00:08',
    resolution: 'HD',
    added: true,
    videoUrl: '',
    palette: 'from-[#1c1c2b] via-[#3c3c63] to-[#6f6faf]',
    sentenceId: workstationActiveSentenceId ?? 'p1-s1',
    sentenceAccent: 'bg-[#8b5cf6]',
    order: 3,
  },
  {
    ...workstationCandidateClips[0],
    sentenceId: workstationActiveSentenceId ?? 'p1-s1',
    sentenceAccent: 'bg-[#8b5cf6]',
    order: 4,
  },
  {
    id: 'tray-466',
    source: 'Pexels',
    title: 'protest crowd #466',
    thumbnail:
      'https://images.pexels.com/photos/1464235/pexels-photo-1464235.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '00:10',
    resolution: 'HD',
    added: true,
    videoUrl: '',
    palette: 'from-[#1b2a41] via-[#324a5f] to-[#658e9c]',
    sentenceId: workstationActiveSentenceId ?? 'p1-s1',
    sentenceAccent: 'bg-[#8b5cf6]',
    order: 5,
  },
  {
    id: 'tray-089',
    source: 'Pexels',
    title: 'conflict scene #089',
    thumbnail:
      'https://images.pexels.com/photos/4101143/pexels-photo-4101143.jpeg?auto=compress&cs=tinysrgb&w=1200',
    duration: '00:10',
    resolution: 'HD',
    added: true,
    videoUrl: '',
    palette: 'from-[#3d405b] via-[#6d597a] to-[#b56576]',
    sentenceId: workstationActiveSentenceId ?? 'p1-s1',
    sentenceAccent: 'bg-[#8b5cf6]',
    order: 6,
  },
  {
    ...workstationCandidateClips[2],
    sentenceId: workstationActiveSentenceId ?? 'p1-s1',
    sentenceAccent: 'bg-[#8b5cf6]',
    order: 7,
  },
  {
    ...workstationCandidateClips[1],
    sentenceId: workstationActiveSentenceId ?? 'p1-s1',
    sentenceAccent: 'bg-[#8b5cf6]',
    order: 8,
  },
]