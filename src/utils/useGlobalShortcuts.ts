import { useEffect } from 'react'

import { useWorkstationStore } from '@/store/useWorkstationStore'
import { getAdjacentSentenceId } from '@/utils/sentenceNavigation'

interface ShortcutHandlers {
  onTogglePlayAll: () => void
  onToggleHelp: () => void
  onCloseAll: () => void
}

function isTypingInField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return false
}

export function useGlobalShortcuts({
  onTogglePlayAll,
  onToggleHelp,
  onCloseAll,
}: ShortcutHandlers) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Allow Escape even while typing (closes dialogs).
      if (event.key === 'Escape') {
        onCloseAll()
        return
      }

      if (isTypingInField(event.target)) return
      if (event.metaKey || event.ctrlKey) return

      const state = useWorkstationStore.getState()

      // ? => help (shift+/)
      if (event.key === '?') {
        event.preventDefault()
        onToggleHelp()
        return
      }

      // Alt+arrows (existing behavior preserved)
      if (event.altKey) {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const dir = event.key === 'ArrowDown' ? 1 : -1
          const next = getAdjacentSentenceId(
            state.paragraphs,
            state.activeSentenceId,
            dir
          )
          if (next) {
            event.preventDefault()
            void state.setActiveSentence(next)
          }
        }
        return
      }

      switch (event.key.toLowerCase()) {
        case 'j': {
          const next = getAdjacentSentenceId(
            state.paragraphs,
            state.activeSentenceId,
            1
          )
          if (next) {
            event.preventDefault()
            void state.setActiveSentence(next)
          }
          return
        }
        case 'k': {
          const prev = getAdjacentSentenceId(
            state.paragraphs,
            state.activeSentenceId,
            -1
          )
          if (prev) {
            event.preventDefault()
            void state.setActiveSentence(prev)
          }
          return
        }
        case 's': {
          if (state.activeSentenceId) {
            event.preventDefault()
            state.toggleSkipSentence(state.activeSentenceId)
          }
          return
        }
        case 'n': {
          if (state.hasMorePages && !state.isLoadingCandidates) {
            event.preventDefault()
            void state.nextPage()
          }
          return
        }
        case 'r': {
          if (state.activeSentenceId && !state.isGeneratingKeywords) {
            event.preventDefault()
            void state.regenerateKeywords()
          }
          return
        }
        case 'u': {
          if (state.lastRemovedClip) {
            event.preventDefault()
            state.undoRemoveFromTray()
          }
          return
        }
        case 'p': {
          if (state.trayClips.length > 0) {
            event.preventDefault()
            onTogglePlayAll()
          }
          return
        }
      }

      // 1–5: add candidate clip #N to tray
      if (/^[1-5]$/.test(event.key)) {
        const slot = Number(event.key) - 1
        const clip = state.candidateClips[slot]
        if (clip && !clip.added) {
          event.preventDefault()
          state.addToTray(clip)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onTogglePlayAll, onToggleHelp, onCloseAll])
}
