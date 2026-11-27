/// <reference lib="webworker" />
import init, { LiteParse, OcriaNano, type ParseResult } from '@llamaindex/liteparse-wasm'
import { PROFILES, type FromWorker, type Page, type Profile, type ToWorker } from './lib/protocol'

const post = (msg: FromWorker, transfer: Transferable[] = []) => self.postMessage(msg, transfer)

let ready: Promise<unknown> | undefined
const models = new Map<Profile, Promise<OcriaNano>>()

function loadModels(profile: Profile, id: number) {
  let m = models.get(profile)
  if (!m) {
    const { scripts, layout } = PROFILES[profile]
    post({ type: 'status', id, text: 'Downloading OCRia-nano-1 models from Hugging Face…' })
    m = OcriaNano.fromUrl({ scripts, layout })
    // don't cache failures, so the next attempt retries
    m.catch(() => models.delete(profile))
    models.set(profile, m)
  }
  return m
}

async function run({ id, bytes, profile }: Extract<ToWorker, { type: 'parse' }>) {
  post({ type: 'status', id, text: 'Starting WebAssembly runtime…' })
  ready ??= init()
  await ready
  const ocria = await loadModels(profile, id)

  post({ type: 'status', id, text: 'Reading document…' })
  let ocrDone = 0
  const parser = LiteParse.withOcriaNano(
    {
      ocrEnabled: true,
      outputFormat: 'markdown',
      extractBlocks: true,
      extractScreenshots: true,
      quiet: true,
      onOcrPage: () => post({ type: 'ocr-page', id, done: ++ocrDone }),
    },
    ocria,
  )

  const t0 = performance.now()
  const res: ParseResult = await parser.parse(bytes)
  const ms = performance.now() - t0
  parser.free()

  const shots = new Map(res.screenshots.map((s) => [s.pageNum, s]))
  const transfer: Transferable[] = []
  const pages: Page[] = res.pages.map((p) => {
    const shot = shots.get(p.pageNum)
    const image = shot ? new Blob([new Uint8Array(shot.imageBytes)], { type: 'image/png' }) : undefined
    return {
      pageNum: p.pageNum,
      width: p.width,
      height: p.height,
      markdown: p.markdown,
      lines: p.textItems.map(({ text, x, y, width, height, confidence }) => ({
        text,
        x,
        y,
        width,
        height,
        confidence,
      })),
      blocks: (p.blocks ?? []).map(({ kind, text, bbox }) => ({ kind, text, bbox })),
      image,
    }
  })
  post({ type: 'done', id, result: { markdown: res.text, pages, ocrPages: ocrDone, ms } }, transfer)
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  if (e.data.type !== 'parse') return
  const { id } = e.data
  run(e.data).catch((err) => {
    console.error(err)
    post({ type: 'error', id, message: err instanceof Error ? err.message : String(err) })
  })
}
