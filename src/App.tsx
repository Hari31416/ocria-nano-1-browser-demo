import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dropzone } from '@/components/Dropzone'
import { MarkdownView } from '@/components/MarkdownView'
import { PageViewer } from '@/components/PageViewer'
import { makeSamplePage } from '@/lib/sample'
import { copyText } from '@/lib/copy'
import { pageToJson } from '@/lib/json'
import { PROFILES, type FromWorker, type Parsed, type Profile, type ToWorker } from '@/lib/protocol'

type State =
  | { kind: 'idle' }
  | { kind: 'busy'; name: string; status: string; fraction: number | null; since: number }
  | { kind: 'done'; name: string; result: Parsed }
  | { kind: 'error'; name: string; message: string }

function ProgressBar({ fraction }: { fraction: number | null }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={fraction == null ? undefined : Math.round(fraction * 100)}>
      {fraction == null ? (
        <div className="h-full w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-foreground/70" />
      ) : (
        <div className="h-full rounded-full bg-foreground transition-[width] duration-300" style={{ width: `${fraction * 100}%` }} />
      )}
    </div>
  )
}

function Elapsed({ since }: { since: number }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 200)
    return () => clearInterval(t)
  }, [])
  return <>{((performance.now() - since) / 1000).toFixed(1)}s</>
}

export default function App() {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [profile, setProfile] = useState<Profile>('full')
  const [pageIdx, setPageIdx] = useState(0)
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null)
  const [view, setView] = useState<'rendered' | 'markdown' | 'json'>('rendered')
  const worker = useRef<Worker>(undefined)
  const job = useRef({ id: 0, name: '', bytes: undefined as Uint8Array | undefined })

  const start = useCallback((name: string, bytes: Uint8Array, p: Profile) => {
    if (!worker.current) {
      worker.current = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      worker.current.onmessage = (e: MessageEvent<FromWorker>) => {
        const m = e.data
        if (m.id !== job.current.id) return // stale
        const name = job.current.name
        if (m.type === 'progress')
          setState((s) => (s.kind === 'busy' ? { ...s, status: m.text, fraction: m.fraction } : s))
        else if (m.type === 'done') {
          setPageIdx(0)
          setState({ kind: 'done', name, result: m.result })
        } else setState({ kind: 'error', name, message: m.message })
      }
    }
    const id = ++job.current.id
    job.current.name = name
    job.current.bytes = bytes
    setState({ kind: 'busy', name, status: 'Starting…', fraction: null, since: performance.now() })
    // copy: the original bytes are kept so the document can be re-run with another model set
    const msg: ToWorker = { type: 'parse', id, bytes: bytes.slice(), profile: p }
    worker.current.postMessage(msg)
  }, [])

  const onFile = async (f: File) => start(f.name, new Uint8Array(await f.arrayBuffer()), profile)
  const onSample = async () => start('sample-page.png', await makeSamplePage(), profile)
  const onProfile = (p: Profile) => {
    setProfile(p)
    if (job.current.bytes && state.kind !== 'idle') start(job.current.name, job.current.bytes, p)
  }
  const reset = () => {
    job.current.id++ // drop any in-flight result
    job.current.bytes = undefined
    setState({ kind: 'idle' })
  }

  const busy = state.kind === 'busy'
  const result = state.kind === 'done' ? state.result : undefined
  const pageCount = result?.pages.length ?? 0
  const page = result?.pages[Math.min(pageIdx, pageCount - 1)]

  const json = useMemo(() => (page ? pageToJson(page) : ''), [page])

  useEffect(() => {
    if (pageCount < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [role=combobox], [role=tab]')) return
      if (e.key === 'ArrowLeft') setPageIdx((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setPageIdx((i) => Math.min(pageCount - 1, i + 1))
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [pageCount])

  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">OCRia-nano-1</h1>
        <p className="max-w-2xl text-muted-foreground">
          An 8.1M-parameter OCR, table and layout pipeline from LlamaIndex, running entirely in this tab through
          WebAssembly. Your document is never uploaded; only the model files are downloaded, once.
        </p>
        <p className="flex gap-4 text-sm text-muted-foreground">
          <a className="underline underline-offset-4 hover:text-foreground" href="https://huggingface.co/llamaindex/OCRia-nano-1" target="_blank" rel="noreferrer">
            Model card
          </a>
          <a className="underline underline-offset-4 hover:text-foreground" href="https://www.llamaindex.ai/ocria/ocria-nano-1-report.pdf" target="_blank" rel="noreferrer">
            Technical report
          </a>
          <a className="underline underline-offset-4 hover:text-foreground" href="https://github.com/run-llama/liteparse" target="_blank" rel="noreferrer">
            LiteParse
          </a>
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">Models</span>
          <Select value={profile} onValueChange={(v) => onProfile(v as Profile)}>
            <SelectTrigger className="w-80" disabled={busy}>
              <SelectValue>{PROFILES[profile].label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PROFILES) as Profile[]).map((k) => (
                <SelectItem key={k} value={k}>
                  <div className="flex flex-col">
                    <span>{PROFILES[k].label}</span>
                    <span className="text-xs text-muted-foreground">{PROFILES[k].hint}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {state.kind !== 'idle' && (
          <Button variant="outline" onClick={reset}>
            New document
          </Button>
        )}
      </div>

      {state.kind === 'idle' && <Dropzone onFile={onFile} onSample={onSample} />}

      {state.kind === 'busy' && (
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border px-6 text-center">
          <p className="font-medium">{state.name}</p>
          <div className="w-full max-w-md">
            <ProgressBar fraction={state.fraction} />
          </div>
          <p className="text-sm text-muted-foreground">
            {state.status} · <Elapsed since={state.since} />
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            Models are downloaded once and kept in this browser. OCR runs on one thread: expect a few seconds per
            page.
          </p>
        </div>
      )}

      {state.kind === 'error' && (
        <div className="rounded-2xl border border-destructive/40 p-6">
          <p className="font-medium">Could not read {state.name}</p>
          <p className="mt-1 text-sm text-muted-foreground break-words">{state.message}</p>
        </div>
      )}

      {result && page && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-medium">{state.kind === 'done' && state.name}</p>
            <p className="text-sm text-muted-foreground">
              {result.pages.length} page{result.pages.length > 1 ? 's' : ''}
              {result.ocrPages < result.pages.length &&
                ` (${result.ocrPages} OCR'd, ${result.pages.length - result.ocrPages} had a text layer)`}{' '}
              · {(result.ms / 1000).toFixed(1)}s
            </p>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous page"
                disabled={pageIdx === 0}
                onClick={() => setPageIdx(pageIdx - 1)}
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-28 text-center text-sm tabular-nums">
                Page {page.pageNum} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next page"
                disabled={pageIdx >= pageCount - 1}
                onClick={() => setPageIdx(pageIdx + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <PageViewer page={page} />
            <Tabs value={view} onValueChange={(v) => setView(v as typeof view)} className="min-w-0">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="rendered">Rendered</TabsTrigger>
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                <Button variant="ghost" size="sm" onClick={async () => {
                    setCopied((await copyText(view === 'json' ? json : page.markdown)) ? 'ok' : 'fail')
                    setTimeout(() => setCopied(null), 1500)
                  }}
                >
                  {copied === 'ok' ? 'Copied' : copied === 'fail' ? 'Copy failed' : view === 'json' ? 'Copy JSON' : 'Copy markdown'}
                </Button>
              </div>
              <TabsContent value="rendered" className="mt-3 max-h-[75vh] overflow-auto rounded-lg border p-4">
                <MarkdownView images={page.images}>{page.markdown}</MarkdownView>
              </TabsContent>
              <TabsContent value="markdown" className="mt-3">
                <pre className="max-h-[75vh] overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs whitespace-pre-wrap">
                  {page.markdown || 'No text found on this page.'}
                </pre>
              </TabsContent>
              <TabsContent value="json" className="mt-3">
                <pre className="max-h-[75vh] overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs">{json}</pre>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      )}

      <footer className="mt-auto pt-6 text-xs text-muted-foreground">
        Weights © LlamaIndex under the OCRia-nano-1 Model License (free for research, personal use and small
        organizations; see the model card). Runtime: LiteParse, Apache-2.0.
      </footer>
    </div>
  )
}
