import { useRef, useState } from 'react'

interface ScreenshotUploadProps {
  onUpload: (base64: string) => Promise<void>
  isLoading?: boolean
  alreadyAttached?: boolean
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data URL prefix (e.g. "data:image/png;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function ScreenshotUpload({ onUpload, isLoading, alreadyAttached }: ScreenshotUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const base64 = await fileToBase64(file)
    setPreview(URL.createObjectURL(file))

    setUploading(true)
    try {
      await onUpload(base64)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Payment screenshot"
            className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-2 text-sm text-khaja-primary underline"
          >
            Replace screenshot
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isLoading || uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-khaja-primary hover:text-khaja-primary transition-colors disabled:opacity-50"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">
            {uploading ? 'Uploading…' : 'Attach payment screenshot'}
          </span>
          <span className="text-xs">PNG, JPG up to 5MB</span>
        </button>
      )}

      {alreadyAttached && !preview && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Screenshot already attached
        </p>
      )}
    </div>
  )
}
