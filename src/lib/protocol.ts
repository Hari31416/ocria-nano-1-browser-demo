export type Profile = 'fast' | 'multilingual' | 'full'

export const PROFILES: Record<
  Profile,
  { label: string; hint: string; scripts: ('latin' | 'cjk' | 'rtl' | 'world')[]; layout: boolean }
> = {
  fast: {
    label: 'Latin text only · 1.5 MB',
    hint: 'Detector, router and Latin recognizer',
    scripts: ['latin'],
    layout: false,
  },
  multilingual: {
    label: 'All scripts · 13 MB',
    hint: 'Adds CJK, Arabic/Hebrew and ~17 other scripts',
    scripts: ['latin', 'cjk', 'rtl', 'world'],
    layout: false,
  },
  full: {
    label: 'All scripts + tables & layout · 30 MB',
    hint: 'Adds LayoutNet for tables, headings and lists',
    scripts: ['latin', 'cjk', 'rtl', 'world'],
    layout: true,
  },
}

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

export interface Block {
  kind: string
  text?: string
  bbox?: Box
}

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
}

export interface Parsed {
  markdown: string
  pages: Page[]
  ocrPages: number
  ms: number
}

export type ToWorker = { type: 'parse'; id: number; bytes: Uint8Array; profile: Profile }

export type FromWorker =
  | { type: 'status'; id: number; text: string }
  | { type: 'ocr-page'; id: number; done: number }
  | { type: 'done'; id: number; result: Parsed }
  | { type: 'error'; id: number; message: string }
