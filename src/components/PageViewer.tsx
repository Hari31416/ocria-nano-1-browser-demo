import { useEffect, useMemo, useRef, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Box, Page } from '@/lib/protocol'

type Overlay = 'lines' | 'blocks' | 'off'

const BLOCK_COLORS: Record<string, string> = {
  heading: '#e11d48',
  paragraph: '#2563eb',
  list_item: '#7c3aed',
  table: '#059669',
  merged_table: '#0d9488',
  figure: '#d97706',
  code: '#0891b2',
  rule: '#64748b',
  page_header: '#c026d3',
  page_footer: '#db2777',
}

// known classes get a fixed colour; any other LayoutNet class gets a stable hue derived from its name
function blockColor(kind: string) {
  if (BLOCK_COLORS[kind]) return BLOCK_COLORS[kind]
  let h = 0
  for (const ch of kind) h = (h * 31 + ch.charCodeAt(0)) % 360
  return `hsl(${h} 70% 45%)`
}

const label = (kind: string) => kind.replaceAll('_', ' ')

function pct(b: Box, page: Page) {
  return {
    left: `${(b.x / page.width) * 100}%`,
    top: `${(b.y / page.height) * 100}%`,
    width: `${(b.width / page.width) * 100}%`,
    height: `${(b.height / page.height) * 100}%`,
  }
}

const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`

interface Item {
  key: number
  box: Box
  color: string
  title: string
  text?: string
  meta?: string
}

export function PageViewer({ page }: { page: Page }) {
  const [overlay, setOverlay] = useState<Overlay>('lines')
  const [active, setActive] = useState<number | null>(null)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const frame = useRef<HTMLDivElement>(null)
  const url = useMemo(() => (page.image ? URL.createObjectURL(page.image) : undefined), [page.image])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])
  useEffect(() => setActive(null), [page, overlay])

  const kinds = [...new Set(page.blocks.map((b) => b.kind))]

  // Larger boxes first, so smaller ones are painted on top and stay hoverable when boxes overlap or nest.
  const items = useMemo<Item[]>(() => {
    const list: Item[] =
      overlay === 'lines'
        ? page.lines.map((l, i) => ({
            key: i,
            box: l,
            color: '#0ea5e9',
            title: 'text line',
            text: l.text,
            meta: l.confidence != null ? `confidence ${(l.confidence * 100).toFixed(0)}%` : undefined,
          }))
        : overlay === 'blocks'
          ? page.blocks.flatMap((b, i) =>
              b.bbox
                ? [
                    {
                      key: i,
                      box: b.bbox,
                      color: blockColor(b.kind),
                      title: label(b.kind),
                      text: b.text,
                      meta: b.rows ? `${b.rows.length + (b.header ? 1 : 0)} rows` : undefined,
                    },
                  ]
                : [],
            )
          : []
    return list.sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height)
  }, [overlay, page])

  const hovered = items.find((it) => it.key === active)
  const fw = frame.current?.clientWidth ?? 0
  const fh = frame.current?.clientHeight ?? 0

  return (
    <div className="flex flex-col gap-3">
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
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {kinds.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ background: blockColor(k) }} />
              {label(k)}
            </li>
          ))}
        </ul>
      )}

      <div
        ref={frame}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setMouse({ x: e.clientX - r.left, y: e.clientY - r.top })
        }}
        onMouseLeave={() => setActive(null)}
        className="relative w-full overflow-hidden rounded-lg border bg-white shadow-sm"
        style={{ aspectRatio: `${page.width} / ${page.height}` }}
      >
        {url && <img src={url} alt={`Page ${page.pageNum}`} className="absolute inset-0 size-full" draggable={false} />}

        {items.map((it) => {
          const on = it.key === active
          const dim = active != null && !on
          return (
            <div
              key={it.key}
              onMouseEnter={() => setActive(it.key)}
              className="absolute rounded-[3px] border transition-[opacity,background-color] duration-100"
              style={{
                ...pct(it.box, page),
                borderColor: it.color,
                borderWidth: on ? 2 : 1,
                background: tint(it.color, on ? 32 : 10),
                opacity: dim ? 0.3 : 1,
                zIndex: on ? 10 : undefined,
              }}
            />
          )
        })}

        {hovered && (
          <div
            className="pointer-events-none absolute z-20 max-w-64 rounded-md border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-lg"
            style={{
              left: mouse.x + (mouse.x > fw * 0.55 ? -14 : 14),
              top: mouse.y + (mouse.y > fh * 0.8 ? -14 : 14),
              transform: `translate(${mouse.x > fw * 0.55 ? '-100%' : '0'}, ${mouse.y > fh * 0.8 ? '-100%' : '0'})`,
            }}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <span className="size-2.5 rounded-[3px]" style={{ background: hovered.color }} />
              {hovered.title}
              {hovered.meta && <span className="font-normal text-muted-foreground">· {hovered.meta}</span>}
            </div>
            {hovered.text && <p className="mt-1 line-clamp-5 break-words">{hovered.text}</p>}
            <p className="mt-1 text-[0.7rem] text-muted-foreground tabular-nums">
              x {Math.round(hovered.box.x)} · y {Math.round(hovered.box.y)} · {Math.round(hovered.box.width)}×
              {Math.round(hovered.box.height)} pt
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
