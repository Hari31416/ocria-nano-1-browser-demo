export type Profile = 'fast' | 'multilingual' | 'full'

export const PROFILES: Record<
  Profile,
  { label: string; hint: string; mb: number; scripts: ('latin' | 'cjk' | 'rtl' | 'world')[]; layout: boolean }
> = {
  fast: {
    label: 'Latin text only · 1.5 MB',
    hint: 'Detector, router and Latin recognizer',
    mb: 1.5,
    scripts: ['latin'],
    layout: false,
  },
  multilingual: {
    label: 'All scripts · 13 MB',
    hint: 'Adds CJK, Arabic/Hebrew and ~17 other scripts',
    mb: 13,
    scripts: ['latin', 'cjk', 'rtl', 'world'],
    layout: false,
  },
  full: {
    label: 'All scripts + tables & layout · 30 MB',
    hint: 'Adds LayoutNet for tables, headings and lists',
    mb: 30,
    scripts: ['latin', 'cjk', 'rtl', 'world'],
    layout: true,
  },
}

import type { LayoutBlock } from '@llamaindex/liteparse-wasm'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export interface Line extends Box {
  text: string
  confidence?: number
}

/** LayoutNet block: kind, text, bbox, table header/rows, list markers, and indices into `lines` */
export type Block = LayoutBlock

export interface Page {
  pageNum: number
  /** page size in PDF points (72 dpi); all boxes are in this space */
  width: number
  height: number
  markdown: string
  lines: Line[]
  blocks: Block[]
  /** rendered page PNG */
  image?: Blob
  /** images embedded in the page, keyed by the target the markdown uses (`img_p1_1.jpg`) */
  images: Record<string, Blob>
}

export interface Parsed {
  markdown: string
  pages: Page[]
  ocrPages: number
  ms: number
}

export type ToWorker = { type: 'parse'; id: number; bytes: Uint8Array; profile: Profile }

export type FromWorker =
  /** `fraction` is 0..1, or null when the amount of work is unknown */
  | { type: 'progress'; id: number; text: string; fraction: number | null }
  | { type: 'done'; id: number; result: Parsed }
  | { type: 'error'; id: number; message: string }
