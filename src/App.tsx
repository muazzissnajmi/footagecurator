import { Check, Download, FilePlus2, Keyboard, Upload } from 'lucide-react'
import { useRef, useState } from 'react'

import {
  AssemblyPlayer,
  ShortcutsHelp,
  TranscriptInput,
} from '@/components'
import { WorkstationPage } from '@/pages/WorkstationPage'
import { useWorkstationStore } from '@/store/useWorkstationStore'
import { useGlobalShortcuts } from '@/utils/useGlobalShortcuts'

export default function App() {
  const paragraphsLength = useWorkstationStore(state => state.paragraphs.length)
  const resetProject = useWorkstationStore(state => state.resetProject)
  const exportProject = useWorkstationStore(state => state.exportProject)
  const importProject = useWorkstationStore(state => state.importProject)

  const [playerOpen, setPlayerOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useGlobalShortcuts({
    onTogglePlayAll: () => setPlayerOpen(o => !o),
    onToggleHelp: () => setHelpOpen(o => !o),
    onCloseAll: () => {
      setPlayerOpen(false)
      setHelpOpen(false)
    },
  })

  const handleNewProject = () => {
    if (paragraphsLength === 0) {
      resetProject()
      return
    }
    const confirmed = window.confirm(
      'Start a new project? This will clear the current transcript, all tray clips, and cached results. This cannot be undone.'
    )
    if (confirmed) resetProject()
  }

  const handleExport = () => {
    const json = exportProject()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    a.download = `footage-curator-session-${stamp}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    setImportError(null)
    fileInputRef.current?.click()
  }

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const ok = importProject(parsed)
      if (!ok) setImportError('That file does not look like a footage-curator session.')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not read file')
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--surface-canvas)]">
      <nav className="flex items-center gap-6 border-b border-[color:var(--border-subtle)] px-8 py-3">
        <span className="font-display text-sm font-semibold tracking-[0.28em] text-[color:var(--text-primary)] uppercase">
          Footage Curator
        </span>
        <span className="border-b-2 border-[color:var(--accent-blue)] pb-1 text-xs uppercase tracking-[0.24em] text-[color:var(--accent-blue)]">
          Workstation
        </span>
        {paragraphsLength > 0 ? (
          <span
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:var(--text-dim)]"
            title="Project auto-saves to local storage"
          >
            <Check className="h-3 w-3 text-[color:var(--accent-emerald)]" />
            Autosaved
          </span>
        ) : (
          <span className="ml-auto" />
        )}
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard className="h-3.5 w-3.5" />
          Shortcuts
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={paragraphsLength === 0}
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
        <button
          type="button"
          onClick={handleNewProject}
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[color:var(--border-subtle)] bg-transparent px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-primary)]"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          New Project
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
      </nav>
      {importError ? (
        <div className="mx-8 mt-3 rounded-[var(--radius-control)] border border-[color:var(--accent-amber)]/30 bg-[color:var(--accent-amber)]/10 px-4 py-2 text-[12px] text-[color:var(--accent-amber)]">
          Import failed: {importError}
        </div>
      ) : null}
      <WorkstationPage onOpenPlayer={() => setPlayerOpen(true)} />
      {paragraphsLength === 0 ? <TranscriptInput /> : null}
      <AssemblyPlayer open={playerOpen} onClose={() => setPlayerOpen(false)} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}
