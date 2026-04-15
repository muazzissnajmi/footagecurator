import type { AccentColor } from '@/types'

export const accentBgMap: Record<AccentColor, string> = {
  blue: 'bg-[#3b82f6]',
  violet: 'bg-[#8b5cf6]',
  amber: 'bg-[#f59e0b]',
  emerald: 'bg-[#10b981]',
}

export const accentDotMap: Record<AccentColor, string> = {
  blue: 'bg-[color:var(--accent-blue)]',
  violet: 'bg-[color:var(--accent-violet)]',
  amber: 'bg-[color:var(--accent-amber)]',
  emerald: 'bg-[color:var(--accent-emerald)]',
}

export const accentBorderMap: Record<AccentColor, string> = {
  blue: 'border-[color:var(--accent-blue)]',
  violet: 'border-[color:var(--accent-violet)]',
  amber: 'border-[color:var(--accent-amber)]',
  emerald: 'border-[color:var(--accent-emerald)]',
}
