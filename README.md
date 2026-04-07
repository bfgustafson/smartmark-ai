# SmartMark AI

Intelligent, contrast-aware PDF watermarking that runs entirely in your browser. No API keys, no servers, no accounts — just open and go.

Upload any PDF and every page is automatically analyzed for brightness, content density, and contrast. The app picks the optimal watermark color, opacity, and spacing so your mark is always legible without obscuring the content.

![SmartMark AI Screenshot](https://img.shields.io/badge/status-ready-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Two Ways to Use

### Option 1: Single HTML File (easiest)

**Just want to use it? Send it to a friend? No install needed.**

1. Download **`SmartMark AI.html`** from this repo
2. Double-click to open in any browser
3. That's it

The single file is a fully self-contained ~640KB bundle with all application code inlined. It only needs an internet connection for Tailwind CSS and PDF.js (loaded from CDN).

### Option 2: Dev Setup (for contributing or customizing)

**Prerequisites:** [Node.js](https://nodejs.org/) v18+

```bash
git clone https://github.com/bfgustafson/smartmark-ai.git
cd smartmark-ai
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000) with hot module replacement.

To rebuild the single HTML file after changes:

```bash
npm run build
# Output: dist/index.html (self-contained, ready to share)
```

---

## Features

- **Local Contrast Analysis** — Each page is analyzed using canvas pixel sampling (perceived brightness via ITU-R BT.601, variance, and edge density). No external API calls.
- **Adaptive Watermark Colors** — Automatically picks from a curated slate palette based on background brightness. Dark slides get light marks, light slides get dark marks.
- **Smart Opacity** — Busier slides get slightly higher opacity so the watermark remains readable against complex backgrounds.
- **Density-Aware Spacing** — Tiled watermarks adjust their grid spacing based on content density and text length, preventing visual clutter on busy pages.
- **7 Position Modes** — Top-left, top-right, bottom-left, bottom-right, center, diagonal (45°), or tiled array with brick-offset pattern.
- **Live Preview** — See exactly how watermarks will render on every page before exporting.
- **PDF Export** — Generates a new standard PDF with watermarks embedded using pdf-lib. Original file is never modified.
- **Batch Processing** — Handles multi-page PDFs, analyzing and watermarking each page individually.

---

## How It Works

1. **Upload** — Drop a PDF or click to browse. PDF.js renders each page to a canvas image.
2. **Analyze** — Click "Optimize with AI." Each page image is sampled at reduced resolution (~200px) to compute:
   - **Average brightness** (weighted RGB per ITU-R BT.601)
   - **Variance** (how uniform vs. varied the content is)
   - **Edge density** (ratio of high-contrast neighboring pixels)
3. **Configure** — Set your watermark text and position. The analysis determines color, opacity (0.15–0.35), and tiled spacing (1.0–2.2x) per page.
4. **Export** — pdf-lib embeds Helvetica Bold watermarks into a new PDF at the computed settings. Downloads as `watermarked-<filename>.pdf`.

---

## Project Structure

```
smartmark-ai/
├── SmartMark AI.html          # Self-contained single-file build (share this!)
├── index.html                 # Dev entry point (Vite)
├── index.tsx                  # React mount point
├── App.tsx                    # Main application component
├── types.ts                   # TypeScript interfaces & enums
├── components/
│   ├── Dropzone.tsx           # PDF upload with drag-and-drop
│   └── SlidePreview.tsx       # Per-page preview with watermark overlay
├── services/
│   ├── geminiService.ts       # Local contrast analysis (canvas pixel sampling)
│   └── pdfService.ts          # PDF rendering (PDF.js) & watermark generation (pdf-lib)
├── vite.config.ts             # Vite config with single-file build plugin
├── package.json
└── tsconfig.json
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS (CDN) |
| Build | Vite + vite-plugin-singlefile |
| PDF Rendering | PDF.js 3.11 (CDN) |
| PDF Generation | pdf-lib |
| Analysis | Canvas API (local pixel sampling) |
| Icons | Lucide React |

---

## License

MIT
