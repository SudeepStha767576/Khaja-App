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
  return 'image/png' // safe default for most QR codes
}

export function QRCodeDisplay({ base64, payerName, size = 200 }: QRCodeDisplayProps) {
  if (!base64) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm"
        style={{ width: size, height: size }}
      >
        No QR code
      </div>
    )
  }

  const mimeType = detectMimeType(base64)
  const src = `data:${mimeType};base64,${base64}`

  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={src}
        alt={`QR code for ${payerName}`}
        width={size}
        height={size}
        className="rounded-lg border border-gray-200 shadow-sm"
      />
      <p className="text-sm text-gray-500">Scan to pay {payerName}</p>
    </div>
  )
}
