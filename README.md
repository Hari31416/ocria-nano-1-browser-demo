# OCRia-nano-1 browser demo

Try [`llamaindex/OCRia-nano-1`](https://huggingface.co/llamaindex/OCRia-nano-1), an 8.1M-parameter OCR, table and
layout pipeline, entirely in the browser. Drop in a scanned PDF or an image and get Markdown back, with the detected
text lines and layout blocks drawn over the page.

Nothing is uploaded: the models run in WebAssembly inside a Web Worker via
[`@llamaindex/liteparse-wasm`](https://www.npmjs.com/package/@llamaindex/liteparse-wasm), and only the model files
are downloaded from Hugging Face (sha256-verified, then cached by the browser).

## Model sets

| Choice | Download | Gives you |
|---|---|---|
| Latin text only | 1.5 MB | OCR for Latin scripts |
| All scripts | 13 MB | + CJK, Arabic/Hebrew and ~17 other scripts |
| All scripts + tables & layout | 30 MB | + LayoutNet: tables, headings, lists |

Pages that already have a PDF text layer are not OCR'd. Known limits (from the technical report): equations on scanned
pages are not recovered (math comes out as garbled text, not LaTeX) and charts are not converted to tables. Images embedded in a digital PDF are shown in the rendered output (and listed as `figure` blocks); a photo on a scanned page or photo is not detected. OCR runs on one thread, roughly 1–4 s per scanned page.

## Develop

```bash
pnpm install
pnpm dev
```

Built with Vite, React, TypeScript, Tailwind and shadcn/ui.

## License

The OCRia-nano-1 weights are **not** part of this repository. They are fetched from Hugging Face at runtime and are
covered by the [OCRia-nano-1 Model License](https://huggingface.co/llamaindex/OCRia-nano-1/blob/main/LICENSE)
(free for research, personal use and small organizations; commercial use above the thresholds needs a license).
LiteParse is Apache-2.0.
