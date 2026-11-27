/// <reference lib="webworker" />
import init, { LiteParse, OcriaNano, type ParseResult } from '@llamaindex/liteparse-wasm'
import { PROFILES, type FromWorker, type Page, type Profile, type ToWorker } from './lib/protocol'

const post = (msg: FromWorker) => self.postMessage(msg)

// ---- persistent model cache -------------------------------------------------
// OcriaNano.fromUrl() downloads with the global fetch and checks every file's sha256 itself. Wrapping fetch
// with the Cache API (persistent, origin-scoped storage that handles tens of MB, unlike localStorage) means
// the models are downloaded once and still verified on every load.
const CACHE = 'ocria-nano-1-models-v1'
const HF = 'https://huggingface.co/'
const nativeFetch = self.fetch.bind(self)
const pendingWrites: Promise<unknown>[] = []
let onDownloaded: ((bytes: number) => void) | undefined
let downloaded = 0

self.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const req = new Request(input, init)
  if (req.method !== 'GET' || !req.url.startsWith(HF) || typeof caches === 'undefined') return nativeFetch(req)

  const cache = await caches.open(CACHE)
  const hit = await cache.match(req.url)
  if (hit) return hit

  const res = await nativeFetch(req)
  if (!res.ok || !res.body) return res
  const [toCache, toCaller] = res.body.tee()
  // stored only if the whole body arrives; a failed download leaves nothing behind
  pendingWrites.push(
    cache.put(req.url, new Response(toCache, { status: 200, headers: res.headers })).catch(() => undefined),
  )
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctrl) {
      downloaded += chunk.byteLength
      onDownloaded?.(downloaded)
      ctrl.enqueue(chunk)
    },
  })
  return new Response(toCaller.pipeThrough(counter), { status: res.status, headers: res.headers })
}

// ---- model loading ----------------------------------------------------------
let ready: Promise<unknown> | undefined
const models = new Map<Profile, Promise<OcriaNano>>()

function loadModels(profile: Profile, id: number) {
  let m = models.get(profile)
  if (!m) {
    const { scripts, layout, mb } = PROFILES[profile]
    post({ type: 'progress', id, text: 'Loading models…', fraction: null })
    downloaded = 0
    onDownloaded = (bytes) =>
      post({
        type: 'progress',
        id,
        text: `Downloading models (first run only) · ${(bytes / 1e6).toFixed(1)} of ~${mb} MB`,
        fraction: Math.min(bytes / (mb * 1e6), 0.99),
      })
    m = OcriaNano.fromUrl({ scripts, layout })
      .then(async (o) => {
        await Promise.all(pendingWrites.splice(0))
        return o
      })
      .catch(async (err) => {
        // a corrupt cached file would fail verification forever: drop the cache so the next try re-downloads
        await caches?.delete(CACHE)
        models.delete(profile)
        throw err
      })
    models.set(profile, m)
  }
  return m
}

// ---- parsing ----------------------------------------------------------------
async function run({ id, bytes, profile }: Extract<ToWorker, { type: 'parse' }>) {
  post({ type: 'progress', id, text: 'Starting WebAssembly runtime…', fraction: null })
  ready ??= init()
  await ready
  const ocria = await loadModels(profile, id)

  // cheap text-layer check: tells us how many pages will actually be OCR'd, for the progress bar
  post({ type: 'progress', id, text: 'Inspecting document…', fraction: null })
  let ocrTotal = 0
  try {
    const probe = new LiteParse({ ocrEnabled: false, quiet: true })
    ocrTotal = (await probe.isComplex(bytes.slice())).filter((p) => p.needsOcr).length
    probe.free()
  } catch {
    // progress just stays indeterminate
  }

  let ocrDone = 0
  const report = () => {
    if (!ocrTotal) return post({ type: 'progress', id, text: 'Extracting text…', fraction: null })
    if (ocrDone >= ocrTotal) return post({ type: 'progress', id, text: 'Analyzing layout and tables…', fraction: null })
    post({
      type: 'progress',
      id,
      text: `Reading page ${ocrDone + 1} of ${ocrTotal}`,
      fraction: ocrDone / ocrTotal,
    })
  }
  report()

  const parser = LiteParse.withOcriaNano(
    {
      ocrEnabled: true,
      outputFormat: 'markdown',
      extractBlocks: true,
      extractScreenshots: true,
      quiet: true,
      onOcrPage: () => {
        ocrDone++
        report()
      },
    },
    ocria,
  )

  const t0 = performance.now()
  const res: ParseResult = await parser.parse(bytes)
  const ms = performance.now() - t0
  parser.free()

  const shots = new Map(res.screenshots.map((s) => [s.pageNum, s]))
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
      // drop the always-present false/undefined flags so the JSON stays readable
      blocks: (p.blocks ?? []).map((b) => JSON.parse(JSON.stringify(b, (_, v) => (v === false ? undefined : v)))),
      image,
    }
  })
  post({ type: 'done', id, result: { markdown: res.text, pages, ocrPages: ocrDone, ms } })
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  if (e.data.type !== 'parse') return
  const { id } = e.data
  run(e.data).catch((err) => {
    console.error(err)
    post({ type: 'error', id, message: err instanceof Error ? err.message : String(err) })
  })
}
