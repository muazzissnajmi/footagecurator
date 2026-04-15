import { AssemblyTray, CandidateWorkspace, ScriptNavigator } from '@/components'

export function WorkstationPage() {
  return (
    <div className="relative h-[calc(100vh-57px)] overflow-hidden bg-[color:var(--surface-canvas)]">
      {/* Subtle ambient wash, reduced from prior double-shadow gradient */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-[-8%] top-[-14%] h-80 w-80 rounded-full bg-[color:var(--accent-blue)]/6 blur-3xl" />
        <div className="absolute right-[-5%] top-[8%] h-96 w-96 rounded-full bg-[color:var(--accent-violet)]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto grid h-full min-h-0 max-w-[1520px] grid-cols-1 gap-5 px-3 py-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-4 lg:py-5">
        <div className="min-h-0 overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]/60">
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
