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

export function MarkdownView({ children }: { children: string }) {
  if (!children.trim()) return <p className="text-sm text-muted-foreground">No text found on this page.</p>
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-table:text-sm prose-th:border prose-td:border prose-th:px-2 prose-td:px-2 prose-th:py-1 prose-td:py-1 prose-img:hidden">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
