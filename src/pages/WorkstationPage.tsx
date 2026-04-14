import { AssemblyTray, CandidateWorkspace, ScriptNavigator } from '@/components'
import {
  workstationActiveKeyword,
  workstationActiveSentenceId,
  workstationCandidateClips,
  workstationKeywords,
  workstationParagraphs,
  workstationTrayClips,
} from '@/data/workstation'

const activeSentence =
  workstationParagraphs
    .flatMap(paragraph => paragraph.sentences)
    .find(sentence => sentence.id === workstationActiveSentenceId) ?? null

export function WorkstationPage() {
  return (
    <div className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(55,92,255,0.08),transparent_25%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.07),transparent_22%),#090c0d]">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute left-[-8%] top-[-14%] h-80 w-80 rounded-full bg-[color:var(--accent-blue)]/8 blur-3xl" />
        <div className="absolute right-[-5%] top-[8%] h-96 w-96 rounded-full bg-[color:var(--accent-violet)]/7 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-[1520px] grid-cols-1 gap-5 px-3 py-4 lg:grid-cols-[186px_minmax(0,1fr)] lg:px-4 lg:py-5">
        <ScriptNavigator
          paragraphs={workstationParagraphs}
          activeSentenceId={workstationActiveSentenceId}
        />
        <div className="space-y-5 pb-6">
          <CandidateWorkspace
            activeSentence={activeSentence}
            keywords={workstationKeywords}
            activeKeyword={workstationActiveKeyword}
            clips={workstationCandidateClips}
          />
          <AssemblyTray clips={workstationTrayClips} />
        </div>
      </div>
    </div>
  )
}