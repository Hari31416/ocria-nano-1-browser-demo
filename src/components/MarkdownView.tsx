import { useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

// OCRia emits HTML tables (colspan/rowspan) for spanning cells, so allow those attributes.
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    td: [...(defaultSchema.attributes?.td ?? []), 'colSpan', 'rowSpan'],
    th: [...(defaultSchema.attributes?.th ?? []), 'colSpan', 'rowSpan'],
  },
}

/** `images` maps the `img_p1_1.jpg` targets in the markdown to the embedded image bytes. */
export function MarkdownView({ children, images }: { children: string; images: Record<string, Blob> }) {
  const urls = useMemo(() => Object.fromEntries(Object.entries(images).map(([k, b]) => [k, URL.createObjectURL(b)])), [images])
  useEffect(() => () => Object.values(urls).forEach(URL.revokeObjectURL), [urls])
  if (!children.trim()) return <p className="text-sm text-muted-foreground">No text found on this page.</p>
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-table:text-sm prose-th:border prose-td:border prose-th:px-2 prose-td:px-2 prose-th:py-1 prose-td:py-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
        components={{
          img: ({ src, alt }) =>
            typeof src === 'string' && urls[src] ? (
              <img src={urls[src]} alt={alt ?? ''} className="mx-auto max-h-96 rounded border" />
            ) : null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
