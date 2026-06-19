'use client'
// src/components/PDFPreviewModal.jsx
// Reusable modal that previews a PDF from an API URL inside an <iframe>.
// Usage:
//   <PDFPreviewModal url="/api/invoices/xxx/pdf" title="INV/..." onClose={() => ...} />

export default function PDFPreviewModal({ url, title, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900 text-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{title}</span>
          <a
            href={url}
            download
            className="text-xs px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
          >
            ⬇ Download
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
          >
            ↗ Buka di tab baru
          </a>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white text-xl leading-none ml-4"
        >
          ✕
        </button>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={url}
          className="w-full h-full border-0"
          title={title}
        />
      </div>
    </div>
  )
}
