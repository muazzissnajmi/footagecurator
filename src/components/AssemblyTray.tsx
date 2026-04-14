import { Download, X } from 'lucide-react'

import type { TrayClip } from '@/types'

type AssemblyTrayProps = {
  clips: TrayClip[]
}

function getTotalDuration(clips: TrayClip[]): string {
  const totalSeconds = clips.reduce((sum, clip) => {
    const [minutes, seconds] = clip.duration.split(':').map(Number)
    return sum + minutes * 60 + seconds
  }, 0)

  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const seconds = (totalSeconds % 60).toString().padStart(2, '0')

  return `${minutes}:${seconds}`
}

export function AssemblyTray({ clips }: AssemblyTrayProps) {
  return (
    <section className="rounded-[30px] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,#101415_0%,#0d1011_100%)] px-5 py-5 shadow-[0_28px_90px_rgba(0,0,0,0.26)] lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-display text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-dim)]">
            Assembly - Section 01
          </p>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            {clips.length} clips in tray • {getTotalDuration(clips)}
          </p>
        </div>

        <div className="flex items-center gap-4 self-start lg:mt-6">
          <label className="flex items-center gap-2 text-sm text-[color:var(--text-dim)]">
            <span className="h-3 w-3 rounded-sm border border-[color:var(--border-strong)] bg-transparent" />
            Auto-match
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-2xl bg-[radial-gradient(circle_at_top,#8cb0ff_0%,#6d92fb_30%,#5476e1_65%,#3c5ccd_100%)] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_30px_rgba(59,130,246,0.34)]"
          >
            <Download className="h-4 w-4" />
            Download All ({clips.length})
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {clips.map(clip => (
          <article
            key={clip.id}
            className="overflow-hidden rounded-[18px] border border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,#161d1f_0%,#141a1c_100%)]"
          >
            <div className="relative h-20">
              <img
                src={clip.thumbnail}
                alt={clip.title}
                className="h-full w-full object-cover"
              />
              <div className={`absolute inset-y-0 left-0 w-1.5 ${clip.sentenceAccent}`} />
              <button
                type="button"
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/45 text-[color:var(--text-dim)]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[13px] leading-5 text-[color:var(--text-primary)]">
                {clip.title}
              </p>
              <p className="font-mono mt-1 text-[11px] text-[color:var(--text-dim)]">
                {clip.duration}
              </p>
            </div>
          </article>
        ))}

        <div className="flex min-h-[128px] items-center justify-center rounded-[18px] border border-dashed border-[color:var(--border-subtle)] bg-transparent text-sm text-[color:var(--text-dim)]">
          + Add clip
        </div>
      </div>
    </section>
  )
}