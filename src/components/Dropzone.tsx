import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  onFile: (file: File) => void
  onSample: () => void
}

export function Dropzone({ onFile, onSample }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onFile(f)
      }}
      className={cn(
        'flex min-h-72 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors outline-none',
        'hover:border-foreground/40 focus-visible:border-ring',
        over ? 'border-foreground/60 bg-muted' : 'border-border',
      )}
    >
      <p className="text-lg font-medium">Drop a scanned PDF or image here</p>
      <p className="text-sm text-muted-foreground">
        or click to choose · PDF, PNG, JPEG, TIFF, WebP
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSample()
        }}
        className="mt-4 text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground"
      >
        or try a generated sample page
      </button>
      <p className="mt-6 max-w-md text-xs text-muted-foreground">
        Equations aren't recognized: math regions come out as garbled text, not LaTeX. Charts aren't converted to
        tables either.
      </p>
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
