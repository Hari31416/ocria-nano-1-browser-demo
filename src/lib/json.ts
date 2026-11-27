import type { Page } from './protocol'

const round = (_: string, v: unknown) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v)

/** JSON.stringify variant that keeps short objects/arrays (boxes, index lists) on one line. */
function pretty(v: unknown, indent = ''): string {
  const flat = JSON.stringify(v)
  if (flat === undefined) return 'null'
  if (flat.length <= 150 || typeof v !== 'object' || v === null) return flat
  const next = indent + '  '
  if (Array.isArray(v)) return `[\n${v.map((x) => next + pretty(x, next)).join(',\n')}\n${indent}]`
  const entries = Object.entries(v).filter(([, x]) => x !== undefined)
  return `{\n${entries.map(([k, x]) => `${next}${JSON.stringify(k)}: ${pretty(x, next)}`).join(',\n')}\n${indent}}`
}

/** One page as structured output: layout blocks and OCR text lines, all with bounding boxes. */
export function pageToJson(page: Page): string {
  const data = {
    page: page.pageNum,
    width: page.width,
    height: page.height,
    coordinates: 'PDF points (72 dpi), origin top-left; bbox = { x, y, width, height }',
    // block.textItemIndices point into `lines`
    blocks: page.blocks,
    lines: page.lines,
  }
  return pretty(JSON.parse(JSON.stringify(data, round)))
}
