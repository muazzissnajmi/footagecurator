import { create } from 'zustand'

import { downloadAllClips } from '@/services/downloadService'
import { generateKeywords } from '@/services/groqService'
import { searchFootage } from '@/services/pexelsService'
import type {
  CandidateClip,
  ParsedParagraph,
  ParsedSentence,
  TrayClip,
} from '@/types'
import { accentBgMap } from '@/utils/accentColors'
import { parseTranscript } from '@/utils/parseTranscript'

interface WorkstationState {
  paragraphs: ParsedParagraph[]
  activeParagraphId: string | null
  activeSentenceId: string | null
  keywords: string[]
  activeKeyword: string | null
  isGeneratingKeywords: boolean
  candidateClips: CandidateClip[]
  isLoadingCandidates: boolean
  currentPage: number
  hasMorePages: boolean
  trayClips: TrayClip[]
  isDownloading: boolean
  loadTranscript: (text: string) => void
  setActiveParagraph: (id: string) => void
  setActiveSentence: (id: string) => void
  setActiveKeyword: (keyword: string) => void
  nextPage: () => void
  addToTray: (clip: CandidateClip) => void
  removeFromTray: (clipId: string) => void
  downloadAll: (
    onProgress?: (completed: number, total: number) => void
  ) => Promise<void>
}

function syncCandidateClips(
  clips: CandidateClip[],
  trayClips: TrayClip[]
): CandidateClip[] {
  return clips.map(clip => ({
    ...clip,
    added: trayClips.some(item => item.id === clip.id),
  }))
}

let sentenceRequestId = 0
let keywordRequestId = 0
let pageRequestId = 0

function findSentenceById(
  paragraphs: ParsedParagraph[],
  sentenceId: string
): ParsedSentence | undefined {
  for (const paragraph of paragraphs) {
    const sentence = paragraph.sentences.find(item => item.id === sentenceId)
    if (sentence) {
      return sentence
    }
  }
}

export const useWorkstationStore = create<WorkstationState>((set, get) => ({
  paragraphs: [],
  activeParagraphId: null,
  activeSentenceId: null,
  keywords: [],
  activeKeyword: null,
  isGeneratingKeywords: false,
  candidateClips: [],
  isLoadingCandidates: false,
  currentPage: 1,
  hasMorePages: false,
  trayClips: [],
  isDownloading: false,

  loadTranscript: text => {
    const parsed = parseTranscript(text)
    set({
      paragraphs: parsed,
      activeParagraphId: parsed[0]?.id ?? null,
      activeSentenceId: null,
      keywords: [],
      activeKeyword: null,
      candidateClips: [],
      trayClips: [],
      currentPage: 1,
      isGeneratingKeywords: false,
      isLoadingCandidates: false,
      isDownloading: false,
    })
  },

  setActiveParagraph: id => {
    set({
      activeParagraphId: id,
      activeSentenceId: null,
      keywords: [],
      activeKeyword: null,
      candidateClips: [],
      currentPage: 1,
    })
  },

  setActiveSentence: async id => {
    const requestId = ++sentenceRequestId
    const isStale = () => requestId !== sentenceRequestId
    const sentence = findSentenceById(get().paragraphs, id)

    if (!sentence) {
      set({
        activeSentenceId: id,
        keywords: [],
        activeKeyword: null,
        candidateClips: [],
        currentPage: 1,
        isGeneratingKeywords: false,
        isLoadingCandidates: false,
      })
      return
    }

    set({
      activeParagraphId: sentence.paragraphId,
      activeSentenceId: id,
      isGeneratingKeywords: true,
      keywords: [],
      activeKeyword: null,
      candidateClips: [],
    })

    try {
      const keywords = await generateKeywords(sentence.text)
      if (isStale()) return
      const activeKeyword = keywords[0] ?? null

      set({
        keywords,
        activeKeyword,
        isGeneratingKeywords: false,
        isLoadingCandidates: true,
      })

      if (!activeKeyword) {
        set({
          candidateClips: [],
          currentPage: 1,
          isLoadingCandidates: false,
        })
        return
      }

      const result = await searchFootage(activeKeyword, 1)
      if (isStale()) return
      set({
        candidateClips: syncCandidateClips(result.clips, get().trayClips),
        currentPage: 1,
        hasMorePages: result.hasMore,
        isLoadingCandidates: false,
      })
    } catch {
      if (isStale()) return
      set({
        keywords: [],
        activeKeyword: null,
        candidateClips: [],
        currentPage: 1,
        isGeneratingKeywords: false,
        isLoadingCandidates: false,
      })
    }
  },

  setActiveKeyword: async keyword => {
    const requestId = ++keywordRequestId
    const isStale = () => requestId !== keywordRequestId

    set({
      activeKeyword: keyword,
      currentPage: 1,
      isLoadingCandidates: true,
    })

    try {
      let result = await searchFootage(keyword, 1)
      if (isStale()) return

      if (result.clips.length === 0) {
        const fallbackKeyword = keyword.split(' ')[0]

        if (fallbackKeyword) {
          result = await searchFootage(fallbackKeyword, 1)
          if (isStale()) return
        }
      }

      set({
        candidateClips: syncCandidateClips(result.clips, get().trayClips),
        hasMorePages: result.hasMore,
        isLoadingCandidates: false,
      })
    } catch {
      if (isStale()) return
      set({
        candidateClips: [],
        isLoadingCandidates: false,
      })
    }
  },

  nextPage: async () => {
    const { activeKeyword, currentPage, hasMorePages } = get()

    if (!activeKeyword || !hasMorePages) {
      return
    }

    const requestId = ++pageRequestId
    const isStale = () => requestId !== pageRequestId
    const next = currentPage + 1
    set({
      currentPage: next,
      isLoadingCandidates: true,
    })

    try {
      const result = await searchFootage(activeKeyword, next)
      if (isStale()) return
      set({
        candidateClips: syncCandidateClips(result.clips, get().trayClips),
        hasMorePages: result.hasMore,
        isLoadingCandidates: false,
      })
    } catch {
      if (isStale()) return
      set({
        isLoadingCandidates: false,
      })
    }
  },

  addToTray: clip => {
    const { trayClips, activeSentenceId, paragraphs, candidateClips } = get()

    if (!activeSentenceId || trayClips.some(item => item.id === clip.id)) {
      return
    }

    const sentence = findSentenceById(paragraphs, activeSentenceId)
    if (!sentence) {
      return
    }

    const sentenceAccent = accentBgMap[sentence.accent]

    set({
      trayClips: [
        ...trayClips,
        {
          ...clip,
          sentenceId: activeSentenceId,
          sentenceAccent,
          order: trayClips.length,
        },
      ],
      candidateClips: candidateClips.map(item =>
        item.id === clip.id ? { ...item, added: true } : item
      ),
    })
  },

  removeFromTray: clipId => {
    const { trayClips, candidateClips } = get()

    set({
      trayClips: trayClips
        .filter(item => item.id !== clipId)
        .map((item, index) => ({
          ...item,
          order: index,
        })),
      candidateClips: candidateClips.map(item =>
        item.id === clipId ? { ...item, added: false } : item
      ),
    })
  },

  downloadAll: async onProgress => {
    const { trayClips } = get()

    set({ isDownloading: true })

    try {
      await downloadAllClips(trayClips, onProgress)
    } finally {
      set({ isDownloading: false })
    }
  },
}))