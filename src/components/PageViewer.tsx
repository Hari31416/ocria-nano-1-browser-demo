import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Box, Page } from '@/lib/protocol'

type Overlay = 'lines' | 'blocks' | 'off'

const BLOCK_COLORS: Record<string, string> = {
  heading: '#e11d48',
  paragraph: '#2563eb',
  list_item: '#7c3aed',
  table: '#059669',
  figure: '#d97706',
  code: '#0891b2',
  rule: '#64748b',
}
const blockColor = (kind: string) => BLOCK_COLORS[kind] ?? '#64748b'

function pct(b: Box, page: Page) {
  return {
    left: `${(b.x / page.width) * 100}%`,
    top: `${(b.y / page.height) * 100}%`,
    width: `${(b.width / page.width) * 100}%`,
    height: `${(b.height / page.height) * 100}%`,
  }
}

export function PageViewer({ page }: { page: Page }) {
  const [overlay, setOverlay] = useState<Overlay>('lines')
  const [hover, setHover] = useState<string | null>(null)
  const url = useMemo(() => (page.image ? URL.createObjectURL(page.image) : undefined), [page.image])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  useEffect(() => setHover(null), [page, overlay])

  const kinds = [...new Set(page.blocks.map((b) => b.kind))]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Tabs value={overlay} onValueChange={(v) => setOverlay(v as Overlay)}>
          <TabsList>
            <TabsTrigger value="lines">Text lines</TabsTrigger>
            <TabsTrigger value="blocks" disabled={!page.blocks.length}>
              Layout blocks
            </TabsTrigger>
            <TabsTrigger value="off">Plain</TabsTrigger>
          </TabsList>
        </Tabs>
        {overlay === 'blocks' && (
          <ul className="hidden flex-wrap justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground sm:flex">
            {kinds.map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: blockColor(k) }} />
                {k.replace('_', ' ')}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg border bg-white shadow-sm"
        style={{ aspectRatio: `${page.width} / ${page.height}` }}
      >
        {url && <img src={url} alt={`Page ${page.pageNum}`} className="absolute inset-0 size-full" />}
        {overlay === 'lines' &&
          page.lines.map((l, i) => (
            <div
              key={i}
              onMouseEnter={() => setHover(l.confidence != null ? `${l.text}  ·  ${(l.confidence * 100).toFixed(0)}%` : l.text)}
              onMouseLeave={() => setHover(null)}
              className="absolute rounded-[2px] border border-sky-500/70 bg-sky-500/10 hover:bg-sky-500/30"
              style={pct(l, page)}
            />
          ))}
        {overlay === 'blocks' &&
          page.blocks.map((b, i) =>
            b.bbox ? (
              <div
                key={i}
                onMouseEnter={() => setHover(`${b.kind.replace('_', ' ')}${b.text ? `  ·  ${b.text}` : ''}`)}
                onMouseLeave={() => setHover(null)}
                className="absolute rounded-[3px] border-2 opacity-80 hover:opacity-100"
                style={{ ...pct(b.bbox, page), borderColor: blockColor(b.kind), background: `${blockColor(b.kind)}1f` }}
              />
            ) : null,
          )}
      </div>

      <p className="h-5 truncate text-xs text-muted-foreground">
        {overlay === 'off' ? '' : (hover ?? 'Hover a box to see what was read.')}
      </p>
    </div>
  )
}
