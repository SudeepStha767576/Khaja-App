import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, CheckCircle2, QrCode } from 'lucide-react'
import { getUsers, uploadQRCode } from '../api/userSetup.api'
import { useKhajaUser } from '../auth/UserContext'
import type { KhajaUserSetup } from '../types/khaja'

function compressToBlob(file: File, maxPx = 400, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const r = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      c.toBlob(b => b ? resolve(b) : reject(new Error('Failed')), 'image/jpeg', quality)
    }
    img.onerror = reject; img.src = url
  })
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function UserSetup() {
  const { khajaUser } = useKhajaUser()
  const [users, setUsers]     = useState<KhajaUserSetup[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [success, setSuccess]   = useState<Record<string, boolean>>({})
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    getUsers(false).then(setUsers).finally(() => setLoading(false))
  }, [])

  async function handleUpload(user: KhajaUserSetup, file: File) {
    setUploading(p => ({ ...p, [user.id]: true }))
    setErrors(p => ({ ...p, [user.id]: '' }))
    setSuccess(p => ({ ...p, [user.id]: false }))
    try {
      const blob = await compressToBlob(file)
      const base64File = new File([blob], 'qr.jpg', { type: 'image/jpeg' })
      const base64 = await fileToBase64(base64File)
      const updated = await uploadQRCode(user.id, base64, '*')
      setUsers(p => p.map(u => u.id === updated.id ? updated : u))
      setSuccess(p => ({ ...p, [user.id]: true }))
      setTimeout(() => setSuccess(p => ({ ...p, [user.id]: false })), 3000)
    } catch (e: unknown) {
      setErrors(p => ({ ...p, [user.id]: e instanceof Error ? e.message : 'Upload failed' }))
    } finally {
      setUploading(p => ({ ...p, [user.id]: false }))
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-2)' }}>Loading members…</div>

  return (
    <div className="max-w-xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Members</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
          Upload each member's payment QR code (eSewa, Khalti, FonePay)
        </p>
      </div>

      <div className="space-y-3">
        {users.map((user, i) => {
          const isMe    = user.code === khajaUser?.code
          const hasQR   = !!user.qrCodeBase64
          const busy    = uploading[user.id]
          const ok      = success[user.id]
          const errMsg  = errors[user.id]

          return (
            <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-4 flex items-center gap-4">

              {/* QR preview or placeholder */}
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {hasQR ? (
                  <img
                    src={`data:image/jpeg;base64,${user.qrCodeBase64}`}
                    alt={`${user.name} QR`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <QrCode size={22} style={{ color: 'var(--text-3)' }} />
                )}
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                  {user.name}
                  {isMe && <span className="text-xs font-normal" style={{ color: 'var(--text-3)' }}>(you)</span>}
                  {!user.active && <span className="text-xs badge" style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>Inactive</span>}
                </p>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>{user.email}</p>
                {errMsg && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{errMsg}</p>}
              </div>

              {/* Upload button */}
              <div className="shrink-0">
                <input
                  ref={el => { fileRefs.current[user.id] = el }}
                  type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(user, f) }}
                />
                {ok ? (
                  <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg"
                    style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <CheckCircle2 size={13} /> Uploaded
                  </div>
                ) : (
                  <button
                    onClick={() => fileRefs.current[user.id]?.click()}
                    disabled={busy}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                    style={{
                      background: hasQR ? 'transparent' : 'rgba(255,255,255,0.08)',
                      color: hasQR ? 'var(--text-2)' : 'var(--text-1)',
                      border: `1px solid ${hasQR ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)'}`,
                    }}>
                    {busy ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-white/20 border-t-white/70 rounded-full animate-spin" />
                        Uploading…
                      </span>
                    ) : (
                      <>
                        <Upload size={13} />
                        {hasQR ? 'Replace QR' : 'Upload QR'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <p className="text-xs text-center mt-6" style={{ color: 'var(--text-3)' }}>
        QR codes are shown to members when they need to pay back. Upload a screenshot of your payment app QR.
      </p>
    </div>
  )
}
