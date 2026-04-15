/**
 * Client-side mp4 trimming via ffmpeg.wasm. Loaded lazily on first use so
 * users who never trim don't pay the ~25MB wasm cost.
 *
 * We re-encode with libx264 ultrafast by default — frame-accurate and
 * reliable across the various Pexels mp4 profiles. Stream-copy is faster
 * but keyframe-quantizes the cut point, which on some source files can
 * emit a near-full-length output. For short b-roll (~a few seconds) the
 * re-encode cost is negligible.
 *
 * Single-threaded core is used so we don't require COOP/COEP headers.
 */

import type { FFmpeg } from '@ffmpeg/ffmpeg'

// Core files live in /public/ffmpeg/ (copied from @ffmpeg/core at install
// time by the `sync-ffmpeg-core` script). We can't hand the literal path
// to ffmpeg.load — Vite's import-analysis sees `/public/...` strings flow
// into the ffmpeg worker's `new Worker(new URL(..))` and errors. Instead
// we fetch each file ourselves and pass blob: URLs, which Vite doesn't
// analyze. Same technique as @ffmpeg/util's `toBlobURL`, but same-origin.
const CORE_JS_PATH = '/ffmpeg/ffmpeg-core.js'
const CORE_WASM_PATH = '/ffmpeg/ffmpeg-core.wasm'

async function toBlobURL(path: string, mime: string): Promise<string> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`)
  }
  const buf = await res.arrayBuffer()
  return URL.createObjectURL(new Blob([buf], { type: mime }))
}

let ffmpegInstance: Promise<FFmpeg> | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance
  ffmpegInstance = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const ffmpeg = new FFmpeg()
    // Mirror ffmpeg's own log lines to the browser console so issues with
    // a given clip are diagnosable.
    ffmpeg.on('log', ({ message }) => {
      // eslint-disable-next-line no-console
      console.debug('[ffmpeg]', message)
    })
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(CORE_JS_PATH, 'text/javascript'),
      toBlobURL(CORE_WASM_PATH, 'application/wasm'),
    ])
    await ffmpeg.load({ coreURL, wasmURL })
    return ffmpeg
  })()
  try {
    return await ffmpegInstance
  } catch (err) {
    // Allow retry on next call if load failed (e.g. transient network).
    ffmpegInstance = null
    throw err
  }
}

/** Warm the wasm core. Returns true if it loaded, false on failure. */
export async function preloadTrimmer(): Promise<boolean> {
  try {
    await getFFmpeg()
    return true
  } catch {
    return false
  }
}

/**
 * Trim a video blob to [startSec, endSec] and return a new mp4 blob.
 * Uses libx264 ultrafast — frame-accurate on any source.
 */
export async function trimBlobToMp4(
  blob: Blob,
  startSec: number,
  endSec: number
): Promise<Blob> {
  const duration = Math.max(0, endSec - startSec)
  if (duration <= 0) {
    throw new Error('Trim range is empty')
  }

  const ffmpeg = await getFFmpeg()
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const inputName = `in_${stamp}.mp4`
  const outputName = `out_${stamp}.mp4`

  const bytes = new Uint8Array(await blob.arrayBuffer())
  await ffmpeg.writeFile(inputName, bytes)

  const cleanup = async () => {
    await ffmpeg.deleteFile(inputName).catch(() => {})
    await ffmpeg.deleteFile(outputName).catch(() => {})
  }

  // `-ss` AFTER `-i` = accurate seek (decodes then discards frames before
  // the cut), guaranteeing the output really starts at startSec.
  // eslint-disable-next-line no-console
  console.info(
    `[trimService] trimming ${startSec.toFixed(2)}s → ${endSec.toFixed(2)}s (${duration.toFixed(2)}s)`
  )
  const code = await ffmpeg.exec([
    '-i',
    inputName,
    '-ss',
    startSec.toFixed(3),
    '-t',
    duration.toFixed(3),
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    '-an',
    '-movflags',
    '+faststart',
    '-y',
    outputName,
  ])
  if (code !== 0) {
    await cleanup()
    throw new Error(`ffmpeg trim exited with code ${code}`)
  }

  const data = (await ffmpeg.readFile(outputName)) as Uint8Array
  await cleanup()
  if (!data || data.byteLength < 1024) {
    throw new Error('ffmpeg produced empty output')
  }
  // eslint-disable-next-line no-console
  console.info(
    `[trimService] output ${(data.byteLength / 1024).toFixed(1)} KB`
  )
  return new Blob([data as BlobPart], { type: 'video/mp4' })
}
