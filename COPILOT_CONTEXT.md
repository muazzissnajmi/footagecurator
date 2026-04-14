# PROJECT CONTEXT — Editorial Editor

## App Description
A dark-themed web app for YouTube faceless video creators to curate 
stock footage per sentence of a TTS script.

## Tech Stack
- Vite + React + TypeScript
- Tailwind CSS (dark theme)
- Lucide React (icons only)
- Zustand (state management)

## Color System (NEVER change these)
- Background:     #0a0a0a
- Card surface:   #161616
- Border subtle:  #2a2a2a
- Accent blue:    #3b82f6
- Text primary:   #ffffff
- Text muted:     #6b7280

## Sentence Color System (NEVER change these)
- Sentence 1: #3b82f6 (blue)
- Sentence 2: #8b5cf6 (purple)
- Sentence 3: #f59e0b (amber)
- Sentence 4: #10b981 (emerald)

## TypeScript Interfaces (NEVER modify)
interface Project {
  id: string
  name: string
  status: 'in-production' | 'draft' | 'done'
  sections: Section[]
}

interface Section {
  id: string
  title: string
  totalClips: number
  filledClips: number
  duration: string
  sentences: Sentence[]
}

interface Sentence {
  id: string
  text: string
  colorKey: 1 | 2 | 3 | 4
  clipCount: number
  clips: Clip[]
}

interface Clip {
  id: string
  source: 'pexels' | 'pixabay'
  title: string
  thumbnail: string
  duration: string
  resolution: 'HD' | '4K'
  added: boolean
}

interface TimelineClip extends Clip {
  sentenceId: string
  sentenceColor: string
  order: number
}

## Folder Structure (NEVER restructure)
src/
├── components/
│   ├── TranscriptInput/
│   ├── Sidebar/
│   ├── CandidateGrid/
│   ├── AssemblyTray/
│   └── Editor/
├── store/
│   └── useWorkstationStore.ts
├── services/
│   ├── groqService.ts
│   ├── pexelsService.ts
│   └── downloadService.ts
├── utils/
│   └── parseTranscript.ts
├── data/
│   ├── workstation.ts
│   └── sampleTranscript.ts
├── types/
│   └── index.ts
└── App.tsx

## Layout Zones
- TOP (40%):    Section cards + Sentence strip
- MIDDLE (35%): Candidate video grid
- BOTTOM (25%): Timeline strip

## Ground Rules for Copilot
1. Build ONE component per request, never multiple
2. UI/layout ONLY unless I explicitly say "add functionality"
3. Do NOT add onClick, onChange unless I ask
4. Do NOT install new packages without asking
5. Do NOT modify types/index.ts
6. Always use Tailwind classes, NO inline styles
7. Always use Lucide for icons, NO other icon lib
8. Match dark theme strictly, NO light mode code
9. Export as named export, NOT default export
10. Always ask if unclear, do NOT assume

"Build Editor tab UI based on attached screenshot.
Simplify these from the design:
- Remove LOGOUT from sidebar
- Merge RENDER into EXPORT button
- A1 track: add Import Narration button
- Waveform color: brighter/more visible
- Add zoom slider bottom of timeline
- Add status dot per clip in script panel
Static UI only, no functionality yet."