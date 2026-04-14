import { AssemblyTray, CandidateWorkspace, ScriptNavigator } from '@/components'

export function WorkstationPage() {
  return (
    <div className="relative h-[calc(100vh-73px)] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(55,92,255,0.08),transparent_25%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.07),transparent_22%),#090c0d]">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute left-[-8%] top-[-14%] h-80 w-80 rounded-full bg-[color:var(--accent-blue)]/8 blur-3xl" />
        <div className="absolute right-[-5%] top-[8%] h-96 w-96 rounded-full bg-[color:var(--accent-violet)]/7 blur-3xl" />
      </div>

      <div className="relative mx-auto grid h-full min-h-0 max-w-[1520px] grid-cols-1 gap-5 px-3 py-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-4 lg:py-5">
        <div className="min-h-0 [&_aside]:sticky [&_aside]:top-0 [&_aside]:h-full [&_aside]:overflow-hidden [&_aside]:lg:px-4 [&_aside]:lg:py-0 [&_aside>div:first-child]:mb-0 [&_aside>div:first-child]:shrink-0 [&_aside>div:first-child]:border-b [&_aside>div:first-child]:border-[color:var(--border-subtle)] [&_aside>div:first-child]:px-4 [&_aside>div:first-child]:py-4 [&_aside>div:nth-child(2)]:min-h-0 [&_aside>div:nth-child(2)]:flex-1 [&_aside>div:nth-child(2)]:space-y-2 [&_aside>div:nth-child(2)]:overflow-y-auto [&_aside>div:nth-child(2)]:px-4 [&_aside>div:nth-child(2)]:py-4 [&_aside>div:nth-child(2)]:pr-3 [&_aside>button]:mt-0 [&_aside>button]:shrink-0 [&_aside>button]:mx-4 [&_aside>button]:mb-4 [&_aside>div:last-child]:shrink-0 [&_aside>div:last-child]:mt-0 [&_aside>div:last-child]:border-t [&_aside>div:last-child]:border-[color:var(--border-subtle)] [&_aside>div:last-child]:px-4 [&_aside>div:last-child]:py-4 [&_aside>div:nth-child(2)>div>button]:px-3 [&_aside>div:nth-child(2)>div>button]:py-3 [&_aside>div:nth-child(2)>div>div>button]:min-h-[72px] [&_aside>div:nth-child(2)>div>div>button]:p-4 [&_aside>div:nth-child(2)>div>div>button]:pl-3 [&_aside>div:nth-child(2)>div>div>button>p:last-child]:line-clamp-3">
          <ScriptNavigator />
        </div>
        <div className="h-full min-h-0 space-y-5 overflow-y-auto pb-6 pr-1">
          <CandidateWorkspace />
          <AssemblyTray />
        </div>
      </div>
    </div>
  )
}