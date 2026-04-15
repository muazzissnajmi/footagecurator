import { X } from 'lucide-react'

interface ShortcutsHelpProps {
  open: boolean
  onClose: () => void
}

const shortcuts: Array<{ keys: string[]; label: string }> = [
  { keys: ['J'], label: 'Next sentence' },
  { keys: ['K'], label: 'Previous sentence' },
  { keys: ['Alt', '↑/↓'], label: 'Navigate sentences (alt.)' },
  { keys: ['1', '–', '5'], label: 'Add candidate clip #N to assembly' },
  { keys: ['S'], label: 'Skip current sentence (no footage needed)' },
  { keys: ['N'], label: 'Next page of candidate clips' },
  { keys: ['R'], label: 'Regenerate keywords' },
  { keys: ['U'], label: 'Undo last tray removal' },
  { keys: ['P'], label: 'Play full assembly sequence' },
  { keys: ['?'], label: 'Open/close this cheatsheet' },
  { keys: ['Esc'], label: 'Close dialogs / cheatsheet' },
]

export function ShortcutsHelp({ open, onClose }: ShortcutsHelpProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-dim)]">
              Keyboard Shortcuts
            </p>
            <h2 className="font-display mt-1 text-xl font-semibold tracking-[-0.02em] text-[color:var(--text-primary)]">
              Work faster
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--border-subtle)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-2">
          {shortcuts.map(shortcut => (
            <li
              key={shortcut.label}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-control)] bg-[color:var(--surface-muted)]/60 px-3 py-2"
            >
              <span className="text-[13px] text-[color:var(--text-muted)]">
                {shortcut.label}
              </span>
              <span className="flex items-center gap-1">
                {shortcut.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="font-mono rounded-md border border-[color:var(--border-subtle)] bg-[color:var(--surface-canvas)] px-1.5 py-0.5 text-[11px] text-[color:var(--text-primary)]"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
