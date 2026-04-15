import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
import { MAX_CLIPS_PER_SENTENCE } from '@/utils/progress'

/**
 * Per-sentence cache of keyword + search results, so revisiting a sentence
 * is instant and avoids redundant Groq/Pexels calls.
 */
interface KeywordCacheEntry {
  clips: CandidateClip[]
  hasMore: boolean
  pagesFetched: number
}

interface SentenceCacheEntry {
  keywords: string[]
  keywordResults: Record<string, KeywordCacheEntry>
  dismissedKeywords?: string[]
}

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
  sentenceCache: Record<string, SentenceCacheEntry>
  lastRemovedClip: TrayClip | null
  skippedSentences: Record<string, true>
  keywordError: string | null
  searchError: string | null
  loadTranscript: (text: string) => void
  setActiveParagraph: (id: string) => void
  setActiveSentence: (id: string) => void
  setActiveKeyword: (keyword: string) => void
  addCustomKeyword: (keyword: string) => void
  dismissKeyword: (keyword: string) => void
  regenerateKeywords: () => Promise<void>
  retryLoadCandidates: () => Promise<void>
  nextPage: () => void
  addToTray: (clip: CandidateClip) => void
  addClipToSentence: (clip: CandidateClip, sentenceId: string) => void
  removeFromTray: (clipId: string) => void
  undoRemoveFromTray: () => void
  dismissLastRemoved: () => void
  reorderTray: (fromId: string, toId: string) => void
  setClipTrim: (
    clipId: string,
    trimStart: number | undefined,
    trimEnd: number | undefined
  ) => void
  toggleSkipSentence: (id: string) => void
  downloadAll: (
    onProgress?: (completed: number, total: number) => void
  ) => Promise<void>
  exportProject: () => string
  importProject: (payload: unknown) => boolean
  resetProject: () => void
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

function reindexTray(clips: TrayClip[]): TrayClip[] {
  return clips.map((clip, index) => ({ ...clip, order: index }))
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong'
}

export const useWorkstationStore = create<WorkstationState>()(
  persist(
    (set, get) => ({
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
      sentenceCache: {},
      lastRemovedClip: null,
      skippedSentences: {},
      keywordError: null,
      searchError: null,

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
          hasMorePages: false,
          isGeneratingKeywords: false,
          isLoadingCandidates: false,
          isDownloading: false,
          sentenceCache: {},
          lastRemovedClip: null,
          skippedSentences: {},
          keywordError: null,
          searchError: null,
        })
      },

      resetProject: () => {
        set({
          paragraphs: [],
          activeParagraphId: null,
          activeSentenceId: null,
          keywords: [],
          activeKeyword: null,
          candidateClips: [],
          trayClips: [],
          currentPage: 1,
          hasMorePages: false,
          isGeneratingKeywords: false,
          isLoadingCandidates: false,
          isDownloading: false,
          sentenceCache: {},
          lastRemovedClip: null,
          skippedSentences: {},
          keywordError: null,
          searchError: null,
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
          hasMorePages: false,
          keywordError: null,
          searchError: null,
        })
      },

      setActiveSentence: async id => {
        const requestId = ++sentenceRequestId
        const isStale = () => requestId !== sentenceRequestId
        const state = get()
        const sentence = findSentenceById(state.paragraphs, id)

        if (!sentence) {
          set({
            activeSentenceId: id,
            keywords: [],
            activeKeyword: null,
            candidateClips: [],
            currentPage: 1,
            hasMorePages: false,
            isGeneratingKeywords: false,
            isLoadingCandidates: false,
          })
          return
        }

        // Cache hit: hydrate synchronously, no network calls.
        const cached = state.sentenceCache[id]
        if (cached && cached.keywords.length > 0) {
          const activeKeyword = cached.keywords[0]
          const cachedResult = cached.keywordResults[activeKeyword]
          set({
            activeParagraphId: sentence.paragraphId,
            activeSentenceId: id,
            keywords: cached.keywords,
            activeKeyword,
            candidateClips: cachedResult
              ? syncCandidateClips(cachedResult.clips, state.trayClips)
              : [],
            currentPage: cachedResult?.pagesFetched ?? 1,
            hasMorePages: cachedResult?.hasMore ?? false,
            isGeneratingKeywords: false,
            isLoadingCandidates: false,
            keywordError: null,
            searchError: null,
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
          currentPage: 1,
          hasMorePages: false,
          keywordError: null,
          searchError: null,
        })

        try {
          const keywords = await generateKeywords(sentence.text)
          if (isStale()) return
          const activeKeyword = keywords[0] ?? null

          set({
            keywords,
            activeKeyword,
            isGeneratingKeywords: false,
            isLoadingCandidates: Boolean(activeKeyword),
            sentenceCache: {
              ...get().sentenceCache,
              [id]: { keywords, keywordResults: {} },
            },
          })

          if (!activeKeyword) {
            set({ candidateClips: [], currentPage: 1, hasMorePages: false })
            return
          }

          const result = await searchFootage(activeKeyword, 1)
          if (isStale()) return

          const prevCache = get().sentenceCache[id] ?? {
            keywords,
            keywordResults: {},
          }
          set({
            candidateClips: syncCandidateClips(result.clips, get().trayClips),
            currentPage: 1,
            hasMorePages: result.hasMore,
            isLoadingCandidates: false,
            sentenceCache: {
              ...get().sentenceCache,
              [id]: {
                keywords: prevCache.keywords,
                keywordResults: {
                  ...prevCache.keywordResults,
                  [activeKeyword]: {
                    clips: result.clips,
                    hasMore: result.hasMore,
                    pagesFetched: 1,
                  },
                },
              },
            },
          })
        } catch (err) {
          if (isStale()) return
          const message = errorMessage(err)
          // Distinguish keyword-generation vs search errors by current state.
          const wasGenerating = get().isGeneratingKeywords
          set({
            keywords: wasGenerating ? [] : get().keywords,
            activeKeyword: wasGenerating ? null : get().activeKeyword,
            candidateClips: [],
            currentPage: 1,
            hasMorePages: false,
            isGeneratingKeywords: false,
            isLoadingCandidates: false,
            keywordError: wasGenerating ? message : null,
            searchError: wasGenerating ? null : message,
          })
        }
      },

      setActiveKeyword: async keyword => {
        const requestId = ++keywordRequestId
        const isStale = () => requestId !== keywordRequestId
        const { activeSentenceId, sentenceCache, trayClips } = get()

        // Cache hit
        if (activeSentenceId) {
          const cached = sentenceCache[activeSentenceId]?.keywordResults[keyword]
          if (cached) {
            set({
              activeKeyword: keyword,
              candidateClips: syncCandidateClips(cached.clips, trayClips),
              currentPage: cached.pagesFetched,
              hasMorePages: cached.hasMore,
              isLoadingCandidates: false,
              searchError: null,
            })
            return
          }
        }

        set({
          activeKeyword: keyword,
          currentPage: 1,
          hasMorePages: false,
          isLoadingCandidates: true,
          searchError: null,
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

          // Cache the result
          const sentenceId = get().activeSentenceId
          if (sentenceId) {
            const prev = get().sentenceCache[sentenceId] ?? {
              keywords: get().keywords,
              keywordResults: {},
            }
            set({
              sentenceCache: {
                ...get().sentenceCache,
                [sentenceId]: {
                  keywords: prev.keywords,
                  keywordResults: {
                    ...prev.keywordResults,
                    [keyword]: {
                      clips: result.clips,
                      hasMore: result.hasMore,
                      pagesFetched: 1,
                    },
                  },
                  dismissedKeywords: prev.dismissedKeywords,
                },
              },
            })
          }
        } catch (err) {
          if (isStale()) return
          set({
            candidateClips: [],
            isLoadingCandidates: false,
            searchError: errorMessage(err),
          })
        }
      },

      addCustomKeyword: keyword => {
        const trimmed = keyword.trim()
        if (!trimmed) return
        const { keywords, activeSentenceId, sentenceCache } = get()
        if (keywords.includes(trimmed)) {
          void get().setActiveKeyword(trimmed)
          return
        }
        const nextKeywords = [...keywords, trimmed]
        set({ keywords: nextKeywords })

        if (activeSentenceId) {
          const prev = sentenceCache[activeSentenceId] ?? {
            keywords: nextKeywords,
            keywordResults: {},
          }
          set({
            sentenceCache: {
              ...sentenceCache,
              [activeSentenceId]: {
                keywords: nextKeywords,
                keywordResults: prev.keywordResults,
                dismissedKeywords: prev.dismissedKeywords,
              },
            },
          })
        }
        void get().setActiveKeyword(trimmed)
      },

      dismissKeyword: keyword => {
        const { keywords, activeKeyword, activeSentenceId, sentenceCache } =
          get()
        const nextKeywords = keywords.filter(k => k !== keyword)
        const nextActive =
          activeKeyword === keyword ? (nextKeywords[0] ?? null) : activeKeyword

        set({ keywords: nextKeywords })

        if (activeSentenceId) {
          const prev = sentenceCache[activeSentenceId] ?? {
            keywords: nextKeywords,
            keywordResults: {},
          }
          const dismissed = new Set(prev.dismissedKeywords ?? [])
          dismissed.add(keyword)
          set({
            sentenceCache: {
              ...sentenceCache,
              [activeSentenceId]: {
                keywords: nextKeywords,
                keywordResults: prev.keywordResults,
                dismissedKeywords: Array.from(dismissed),
              },
            },
          })
        }

        if (nextActive && nextActive !== activeKeyword) {
          void get().setActiveKeyword(nextActive)
        } else if (!nextActive) {
          set({ activeKeyword: null, candidateClips: [] })
        }
      },

      regenerateKeywords: async () => {
        const { activeSentenceId, paragraphs, sentenceCache } = get()
        if (!activeSentenceId) return
        const sentence = findSentenceById(paragraphs, activeSentenceId)
        if (!sentence) return

        const existingCache = sentenceCache[activeSentenceId]
        const excluded = [
          ...(existingCache?.keywords ?? []),
          ...(existingCache?.dismissedKeywords ?? []),
        ]

        const requestId = ++sentenceRequestId
        const isStale = () => requestId !== sentenceRequestId

        set({ isGeneratingKeywords: true, keywordError: null })
        try {
          const newKeywords = await generateKeywords(sentence.text, excluded)
          if (isStale()) return
          const merged = [
            ...(existingCache?.keywords ?? []),
            ...newKeywords.filter(k => !excluded.includes(k)),
          ]
          set({
            keywords: merged,
            isGeneratingKeywords: false,
            sentenceCache: {
              ...get().sentenceCache,
              [activeSentenceId]: {
                keywords: merged,
                keywordResults: existingCache?.keywordResults ?? {},
                dismissedKeywords: existingCache?.dismissedKeywords,
              },
            },
          })
        } catch (err) {
          if (isStale()) return
          set({
            isGeneratingKeywords: false,
            keywordError: errorMessage(err),
          })
        }
      },

      retryLoadCandidates: async () => {
        const { activeKeyword } = get()
        if (activeKeyword) {
          await get().setActiveKeyword(activeKeyword)
        } else {
          const { activeSentenceId } = get()
          if (activeSentenceId) {
            // Force re-run by clearing cache entry for this sentence.
            const cache = { ...get().sentenceCache }
            delete cache[activeSentenceId]
            set({ sentenceCache: cache })
            await get().setActiveSentence(activeSentenceId)
          }
        }
      },

      nextPage: async () => {
        const { activeKeyword, currentPage, hasMorePages } = get()
        if (!activeKeyword || !hasMorePages) return

        const requestId = ++pageRequestId
        const isStale = () => requestId !== pageRequestId
        const next = currentPage + 1
        set({ currentPage: next, isLoadingCandidates: true })

        try {
          const result = await searchFootage(activeKeyword, next)
          if (isStale()) return
          set({
            candidateClips: syncCandidateClips(result.clips, get().trayClips),
            hasMorePages: result.hasMore,
            isLoadingCandidates: false,
          })

          const sentenceId = get().activeSentenceId
          if (sentenceId) {
            const prev = get().sentenceCache[sentenceId] ?? {
              keywords: get().keywords,
              keywordResults: {},
            }
            set({
              sentenceCache: {
                ...get().sentenceCache,
                [sentenceId]: {
                  keywords: prev.keywords,
                  keywordResults: {
                    ...prev.keywordResults,
                    [activeKeyword]: {
                      clips: result.clips,
                      hasMore: result.hasMore,
                      pagesFetched: next,
                    },
                  },
                  dismissedKeywords: prev.dismissedKeywords,
                },
              },
            })
          }
        } catch (err) {
          if (isStale()) return
          set({ isLoadingCandidates: false, searchError: errorMessage(err) })
        }
      },

      addToTray: clip => {
        const { activeSentenceId } = get()
        if (!activeSentenceId) return
        get().addClipToSentence(clip, activeSentenceId)
      },

      addClipToSentence: (clip, sentenceId) => {
        const {
          trayClips,
          paragraphs,
          candidateClips,
          skippedSentences,
        } = get()

        if (trayClips.some(item => item.id === clip.id)) return
        if (skippedSentences[sentenceId]) return

        const perSentenceCount = trayClips.filter(
          c => c.sentenceId === sentenceId
        ).length
        if (perSentenceCount >= MAX_CLIPS_PER_SENTENCE) return

        const sentence = findSentenceById(paragraphs, sentenceId)
        if (!sentence) return

        set({
          trayClips: [
            ...trayClips,
            {
              ...clip,
              sentenceId,
              sentenceAccent: accentBgMap[sentence.accent],
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
        const removed = trayClips.find(c => c.id === clipId) ?? null

        set({
          trayClips: reindexTray(trayClips.filter(item => item.id !== clipId)),
          candidateClips: candidateClips.map(item =>
            item.id === clipId ? { ...item, added: false } : item
          ),
          lastRemovedClip: removed,
        })
      },

      undoRemoveFromTray: () => {
        const { lastRemovedClip, trayClips, candidateClips } = get()
        if (!lastRemovedClip) return
        if (trayClips.some(c => c.id === lastRemovedClip.id)) {
          set({ lastRemovedClip: null })
          return
        }
        const insertAt = Math.min(lastRemovedClip.order, trayClips.length)
        const next = [
          ...trayClips.slice(0, insertAt),
          lastRemovedClip,
          ...trayClips.slice(insertAt),
        ]
        set({
          trayClips: reindexTray(next),
          candidateClips: candidateClips.map(item =>
            item.id === lastRemovedClip.id ? { ...item, added: true } : item
          ),
          lastRemovedClip: null,
        })
      },

      dismissLastRemoved: () => set({ lastRemovedClip: null }),

      reorderTray: (fromId, toId) => {
        const { trayClips } = get()
        if (fromId === toId) return
        const fromIndex = trayClips.findIndex(c => c.id === fromId)
        const toIndex = trayClips.findIndex(c => c.id === toId)
        if (fromIndex === -1 || toIndex === -1) return

        const next = [...trayClips]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        set({ trayClips: reindexTray(next) })
      },

      setClipTrim: (clipId, trimStart, trimEnd) => {
        const { trayClips } = get()
        set({
          trayClips: trayClips.map(clip =>
            clip.id === clipId ? { ...clip, trimStart, trimEnd } : clip
          ),
        })
      },

      toggleSkipSentence: id => {
        const { skippedSentences, trayClips, candidateClips } = get()
        const isSkipped = Boolean(skippedSentences[id])
        const nextSkipped = { ...skippedSentences }
        if (isSkipped) {
          delete nextSkipped[id]
          set({ skippedSentences: nextSkipped })
        } else {
          nextSkipped[id] = true
          // When skipping, drop any clips already picked for this sentence.
          const removedIds = new Set(
            trayClips.filter(c => c.sentenceId === id).map(c => c.id)
          )
          set({
            skippedSentences: nextSkipped,
            trayClips: reindexTray(
              trayClips.filter(c => !removedIds.has(c.id))
            ),
            candidateClips: candidateClips.map(item =>
              removedIds.has(item.id) ? { ...item, added: false } : item
            ),
          })
        }
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

      exportProject: () => {
        const state = get()
        return JSON.stringify(
          {
            __kind: 'footage-curator/session',
            version: 1,
            exportedAt: new Date().toISOString(),
            paragraphs: state.paragraphs,
            activeParagraphId: state.activeParagraphId,
            activeSentenceId: state.activeSentenceId,
            trayClips: state.trayClips,
            sentenceCache: state.sentenceCache,
            skippedSentences: state.skippedSentences,
          },
          null,
          2
        )
      },

      importProject: payload => {
        if (!payload || typeof payload !== 'object') return false
        const data = payload as Record<string, unknown>
        if (data.__kind !== 'footage-curator/session') return false
        if (!Array.isArray(data.paragraphs)) return false
        set({
          paragraphs: data.paragraphs as ParsedParagraph[],
          activeParagraphId:
            typeof data.activeParagraphId === 'string'
              ? data.activeParagraphId
              : null,
          activeSentenceId:
            typeof data.activeSentenceId === 'string'
              ? data.activeSentenceId
              : null,
          trayClips: Array.isArray(data.trayClips)
            ? (data.trayClips as TrayClip[])
            : [],
          sentenceCache:
            data.sentenceCache && typeof data.sentenceCache === 'object'
              ? (data.sentenceCache as Record<string, SentenceCacheEntry>)
              : {},
          skippedSentences:
            data.skippedSentences && typeof data.skippedSentences === 'object'
              ? (data.skippedSentences as Record<string, true>)
              : {},
          keywords: [],
          activeKeyword: null,
          candidateClips: [],
          currentPage: 1,
          hasMorePages: false,
          isGeneratingKeywords: false,
          isLoadingCandidates: false,
          isDownloading: false,
          lastRemovedClip: null,
          keywordError: null,
          searchError: null,
        })
        // Re-hydrate candidate UI for active sentence from cache.
        const activeId =
          typeof data.activeSentenceId === 'string'
            ? data.activeSentenceId
            : null
        if (activeId) {
          const cached = get().sentenceCache[activeId]
          if (cached && cached.keywords.length > 0) {
            const kw = cached.keywords[0]
            const res = cached.keywordResults[kw]
            set({
              keywords: cached.keywords,
              activeKeyword: kw,
              candidateClips: res
                ? syncCandidateClips(res.clips, get().trayClips)
                : [],
              currentPage: res?.pagesFetched ?? 1,
              hasMorePages: res?.hasMore ?? false,
            })
          }
        }
        return true
      },
    }),
    {
      name: 'footage-curator-v1',
      partialize: state => ({
        paragraphs: state.paragraphs,
        activeParagraphId: state.activeParagraphId,
        activeSentenceId: state.activeSentenceId,
        trayClips: state.trayClips,
        sentenceCache: state.sentenceCache,
        skippedSentences: state.skippedSentences,
      }),
      onRehydrateStorage: () => state => {
        // Rehydrate UI state from cache for the active sentence so the user
        // sees keywords + clips immediately on reload.
        if (!state || !state.activeSentenceId) return
        const cached = state.sentenceCache[state.activeSentenceId]
        if (!cached || cached.keywords.length === 0) return

        const activeKeyword = cached.keywords[0]
        const result = cached.keywordResults[activeKeyword]
        state.keywords = cached.keywords
        state.activeKeyword = activeKeyword
        if (result) {
          state.candidateClips = syncCandidateClips(
            result.clips,
            state.trayClips
          )
          state.currentPage = result.pagesFetched
          state.hasMorePages = result.hasMore
        }
      },
    }
  )
)
