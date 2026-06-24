import { useEffect, useState } from 'react'
import { X, Expand } from 'lucide-react'

interface QRCodeDisplayProps {
  base64?: string
  payerName: string
  size?: number
}

function detectMimeType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/png'
}

export function QRCodeDisplay({ base64, payerName, size = 200 }: QRCodeDisplayProps) {
  const [expanded, setExpanded] = useState(false)

  // Close on Escape
  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expanded])

  if (!base64) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center justify-center rounded-xl text-xs"
          style={{ width: size, height: size, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-3)' }}>
          No QR code
        </div>
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>No QR uploaded for {payerName}</p>
      </div>
    )
  }

  const mimeType = detectMimeType(base64)
  const src = `data:${mimeType};base64,${base64}`

  return (
    <>
      {/* Thumbnail with expand button */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative group cursor-pointer" onClick={() => setExpanded(true)}>
          <img src={src} alt={`QR code for ${payerName}`}
            width={size} height={size}
            className="rounded-xl object-contain"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }} />

          {/* Expand overlay on hover */}
          <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: 'rgba(0,0,0,0.45)' }}>
            <div className="flex items-center gap-1.5 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Expand size={12} />
              Full size
            </div>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
          Tap to enlarge · Scan to pay <span className="text-white">{payerName}</span>
        </p>
      </div>

      {/* Full-size modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setExpanded(false)}>

          <div className="relative flex flex-col items-center gap-4"
            onClick={e => e.stopPropagation()}>

            {/* Close button */}
            <button onClick={() => setExpanded(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors z-10"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
              <X size={15} />
            </button>

            {/* QR image — full size */}
            <img src={src} alt={`QR code for ${payerName}`}
              className="rounded-2xl"
              style={{
                maxWidth: 'min(90vw, 400px)',
                maxHeight: 'min(80vh, 400px)',
                width: 'auto',
                height: 'auto',
                border: '2px solid rgba(255,255,255,0.12)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              }} />

            <div className="text-center">
              <p className="text-white font-semibold text-sm">{payerName}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                Scan with your payment app · Tap anywhere to close
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
