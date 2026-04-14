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
  trayClips: TrayClip[]
  isDownloading: boolean
  loadTranscript: (text: string) => void
  setActiveParagraph: (id: string) => void
  setActiveSentence: (id: string) => void
  setActiveKeyword: (keyword: string) => void
  nextPage: () => void
  addToTray: (clip: CandidateClip) => void
  removeFromTray: (clipId: string) => void
  downloadAll: () => void
}

const accentColorMap = {
  blue: 'bg-[#3b82f6]',
  violet: 'bg-[#8b5cf6]',
  amber: 'bg-[#f59e0b]',
  emerald: 'bg-[#10b981]',
} as const

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
    })
  },

  setActiveParagraph: id => {
    set({
      activeParagraphId: id,
      activeSentenceId: null,
      keywords: [],
      activeKeyword: null,
      candidateClips: [],
    })
  },

  setActiveSentence: async id => {
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
      activeSentenceId: id,
      isGeneratingKeywords: true,
      keywords: [],
      activeKeyword: null,
      candidateClips: [],
    })

    try {
      const keywords = await generateKeywords(sentence.text)
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

      const candidateClips = await searchFootage(activeKeyword, 1)
      set({
        candidateClips,
        currentPage: 1,
        isLoadingCandidates: false,
      })
    } catch {
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
    set({
      activeKeyword: keyword,
      currentPage: 1,
      isLoadingCandidates: true,
    })

    try {
      let candidateClips = await searchFootage(keyword, 1)

      if (candidateClips.length === 0) {
        const fallbackKeyword = keyword.split(' ')[0]

        if (fallbackKeyword) {
          candidateClips = await searchFootage(fallbackKeyword, 1)
        }
      }

      set({
        candidateClips,
        isLoadingCandidates: false,
      })
    } catch {
      set({
        candidateClips: [],
        isLoadingCandidates: false,
      })
    }
  },

  nextPage: async () => {
    const { activeKeyword, currentPage } = get()

    if (!activeKeyword) {
      return
    }

    const next = currentPage + 1
    set({
      currentPage: next,
      isLoadingCandidates: true,
    })

    try {
      const candidateClips = await searchFootage(activeKeyword, next)
      set({
        candidateClips,
        isLoadingCandidates: false,
      })
    } catch {
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

    const sentenceAccent = accentColorMap[sentence.accent]

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

  downloadAll: async () => {
    const { trayClips } = get()

    set({ isDownloading: true })

    try {
      await downloadAllClips(trayClips)
    } finally {
      set({ isDownloading: false })
    }
  },
}))