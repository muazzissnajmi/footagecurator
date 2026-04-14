import { create } from 'zustand'

import type { TrayClip } from '@/types'

interface EditorState {
  clips: TrayClip[]
  narrationUrl: string | null
  narrationFile: File | null
  selectedClipId: string | null
  isPlaying: boolean
  currentFrame: number
  totalDuration: number
  loadClipsFromWorkstation: (clips: TrayClip[]) => void
  loadNarration: (file: File) => void
  selectClip: (id: string | null) => void
  removeClip: (id: string) => void
  reorderClips: (clips: TrayClip[]) => void
  setCurrentFrame: (frame: number) => void
}

function getTotalDuration(clips: TrayClip[]) {
  return clips.reduce((acc, clip) => acc + parseFloat(clip.duration), 0)
}

export const useEditorStore = create<EditorState>((set, get) => ({
  clips: [],
  narrationUrl: null,
  narrationFile: null,
  selectedClipId: null,
  isPlaying: false,
  currentFrame: 0,
  totalDuration: 0,

  loadClipsFromWorkstation: clips =>
    set({
      clips,
      totalDuration: getTotalDuration(clips),
      selectedClipId: clips[0]?.id ?? null,
    }),

  loadNarration: file => {
    const previousUrl = get().narrationUrl
    if (previousUrl) {
      URL.revokeObjectURL(previousUrl)
    }

    const url = URL.createObjectURL(file)
    set({ narrationFile: file, narrationUrl: url })
  },

  selectClip: id => set({ selectedClipId: id }),

  removeClip: id =>
    set(state => {
      const clips = state.clips.filter(clip => clip.id !== id)

      return {
        clips,
        selectedClipId: state.selectedClipId === id ? null : state.selectedClipId,
        totalDuration: getTotalDuration(clips),
      }
    }),

  reorderClips: clips =>
    set({
      clips: clips.map((clip, index) => ({ ...clip, order: index })),
      totalDuration: getTotalDuration(clips),
    }),

  setCurrentFrame: frame => set({ currentFrame: frame }),
}))