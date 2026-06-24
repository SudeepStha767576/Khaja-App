import { useEffect, useState } from 'react'
import { X, Maximize2 } from 'lucide-react'

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

export function QRCodeDisplay({ base64, payerName, size = 180 }: QRCodeDisplayProps) {
  const [expanded, setExpanded] = useState(false)

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
      {/* Thumbnail + buttons */}
      <div className="flex flex-col items-center gap-3">
        <img
          src={src}
          alt={`QR code for ${payerName}`}
          width={size}
          height={size}
          className="rounded-xl object-contain"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        />

        <p className="text-xs" style={{ color: 'var(--text-2)' }}>
          Scan to pay <span className="text-white font-medium">{payerName}</span>
        </p>

        {/* Always-visible expand button — works on all devices */}
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all active:scale-95"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
          }}>
          <Maximize2 size={13} />
          View Full Size
        </button>
      </div>

      {/* Full-size modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
          onClick={() => setExpanded(false)}>

          <div
            className="relative flex flex-col items-center gap-5"
            onClick={e => e.stopPropagation()}>

            {/* QR image — full size */}
            <img
              src={src}
              alt={`QR code for ${payerName}`}
              className="rounded-2xl"
              style={{
                maxWidth:  'min(85vw, 380px)',
                maxHeight: 'min(75vh, 380px)',
                width: 'auto',
                height: 'auto',
                border: '2px solid rgba(255,255,255,0.15)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.8)',
              }}
            />

            <div className="text-center">
              <p className="text-white font-semibold">{payerName}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                Point your payment app camera at the QR code
              </p>
            </div>

            {/* Always-visible close button */}
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
              }}>
              <X size={15} />
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
