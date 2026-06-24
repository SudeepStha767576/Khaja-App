import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, AlertTriangle, Camera } from 'lucide-react'
import { getLine, getLinesByDocument, acceptLine, rejectLine, resetLine, markAsPaid, uploadScreenshotBinary } from '../api/lines.api'
import { getHeaderByNo } from '../api/headers.api'
import { useKhajaUser } from '../auth/UserContext'
import { QRCodeDisplay } from '../components/QRCodeDisplay'
import type { KhajaHeader, KhajaLine } from '../types/khaja'

function compressToBlob(file: File, maxPx = 800, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const r = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * r); c.height = Math.round(img.height * r)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      c.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', quality)
    }
    img.onerror = reject; img.src = url
  })
}

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  Unpaid:   { bg: 'rgba(245,158,11,0.1)',  color: '#D97706' },
  Accepted: { bg: 'rgba(99,102,241,0.1)',  color: '#818CF8' },
  Rejected: { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
  Paid:     { bg: 'rgba(16,185,129,0.1)',  color: '#10B981' },
}

export function PaymentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { khajaUser } = useKhajaUser()
  const fileRef = useRef<HTMLInputElement>(null)

  const [header, setHeader]   = useState<KhajaHeader | null>(null)
  const [allLines, setAllLines] = useState<KhajaLine[]>([])
  const [myLine, setMyLine]   = useState<KhajaLine | null>(null)
  const [payerInfo, setPayerInfo] = useState<{ name: string; qr?: string; code: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr]         = useState<string | null>(null)

  const [note, setNote]               = useState('')
  const [screenshotFile, setSSFile]   = useState<File | null>(null)
  const [ssPreview, setSSPreview]     = useState<string | null>(null)
  const [showReject, setShowReject]   = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [editAmt, setEditAmt]         = useState('')
  const [showAmtEdit, setShowAmtEdit] = useState(false)
  const [busy, setBusy]               = useState(false)
  const [actionErr, setActionErr]     = useState<string | null>(null)

  // Allow payer OR document creator to manage disputes
  const isPayerOfDoc   = payerInfo?.code === khajaUser?.code
  const isCreatorOfDoc = header?.createdByUserCode === khajaUser?.code
  const isManagerOfDoc = isPayerOfDoc || isCreatorOfDoc

  useEffect(() => {
    if (!id || !khajaUser) return
    getLine(id).then(async ({ line }) => {
      const [hdr, lines] = await Promise.all([getHeaderByNo(line.documentNo), getLinesByDocument(line.documentNo, 'All')])
      if (hdr) { setHeader(hdr); setPayerInfo({ name: hdr.paymentByName, qr: line.paymentByQrBase64, code: hdr.paymentBy }) }
      setAllLines(lines)
      setMyLine(lines.find(l => l.userEmail.toLowerCase() === khajaUser.email.toLowerCase()) ?? null)
    }).catch(e => setErr(e.message)).finally(() => setLoading(false))
  }, [id, khajaUser])

  function upd(updated: KhajaLine) {
    setMyLine(updated)
    setAllLines(p => p.map(l => l.id === updated.id ? updated : l))
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true); setActionErr(null)
    try { await fn() } catch (e: unknown) { setActionErr(e instanceof Error ? e.message : 'Failed') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-2)' }}>Loading…</div>
  if (err) return <div className="max-w-xl mx-auto px-4 py-6" style={{ color: '#EF4444' }}>{err}</div>

  const status = myLine?.paymentStatus
  const paid = myLine?.paymentStatus === 'Paid'
  const stillOwing = allLines.filter(l => l.paymentStatus !== 'Paid' && l.userEmail.toLowerCase() !== khajaUser?.email.toLowerCase())

  return (
    <div className="max-w-xl mx-auto px-4 lg:px-8 py-6 space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm mb-2 transition-colors"
        style={{ color: 'var(--text-2)' }}>
        <ArrowLeft size={15} /> Back
      </button>

      {/* Header card */}
      <motion.div className="card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{header?.no}</p>
            <h2 className="text-lg font-bold text-white">{header?.description ?? 'Khaja Payment'}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
              {header?.date} · Paid by <span className="text-white">{payerInfo?.name}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-white">Rs. {(header?.totalAmount ?? 0).toLocaleString()}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {allLines.filter(l => l.paymentStatus === 'Paid').length}/{allLines.length} paid
            </p>
          </div>
        </div>
      </motion.div>

      {/* QR */}
      {(status === 'Accepted' || status === 'Unpaid') && (
        <motion.div className="card p-5 flex flex-col items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
          <QRCodeDisplay
            base64={payerInfo?.qr}
            payerName={payerInfo?.name ?? ''}
            size={180}
          />
        </motion.div>
      )}

      {/* All lines */}
      <motion.div className="card overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
        <p className="section-title px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Payment Lines</p>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {allLines.map(line => {
            const isMe = line.userEmail.toLowerCase() === khajaUser?.email.toLowerCase()
            const pill = STATUS_PILL[line.paymentStatus]
            return (
              <div key={line.id} className="px-5 py-3" style={{ background: isMe ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {line.userName}
                      {isMe && <span className="ml-1.5 text-xs" style={{ color: 'var(--text-3)' }}>you</span>}
                    </p>
                    {line.paymentStatus === 'Rejected' && line.rejectionReason && (
                      <p className="text-xs italic mt-0.5" style={{ color: '#EF4444' }}>"{line.rejectionReason}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">Rs. {line.amount.toLocaleString()}</span>
                    <span className="badge text-xs" style={{ background: pill.bg, color: pill.color, border: `1px solid ${pill.color}30` }}>
                      {line.paymentStatus}
                    </span>
                  </div>
                </div>

                {/* Payer update rejected line */}
                {isManagerOfDoc && line.paymentStatus === 'Rejected' && !isMe && (
                  <div className="mt-2">
                    {!showAmtEdit ? (
                      <button onClick={() => { setShowAmtEdit(true); setEditAmt(line.amount.toString()) }}
                        className="text-xs btn-ghost py-1 px-3">Update Amount & Reset</button>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-xs" style={{ color: 'var(--text-2)' }}>Rs.</span>
                        <input type="number" value={editAmt} onChange={e => setEditAmt(e.target.value)}
                          className="input-field text-right" style={{ width: '5rem', padding: '0.3rem 0.5rem' }} />
                        <button onClick={() => run(async () => {
                          const updated = await resetLine(line.id, parseFloat(editAmt) || undefined)
                          upd(updated); setShowAmtEdit(false)
                        })} disabled={busy} className="btn-primary py-1 px-3 text-xs">
                          {busy ? '…' : 'Confirm'}
                        </button>
                        <button onClick={() => setShowAmtEdit(false)} className="text-xs" style={{ color: 'var(--text-2)' }}>Cancel</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>

      {actionErr && (
        <p className="text-sm px-4 py-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444' }}>
          {actionErr}
        </p>
      )}

      {/* Action panel */}
      {myLine && (
        <motion.div className="card p-5 space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>

          {/* UNPAID */}
          {status === 'Unpaid' && !showReject && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Your share</p>
                <p className="text-xl font-bold text-white">Rs. {myLine.amount.toLocaleString()}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => run(async () => upd(await acceptLine(myLine.id)))} disabled={busy}
                  className="btn-primary flex-1 py-2.5 text-sm">
                  {busy ? '…' : '✓ Accept & Pay'}
                </button>
                <button onClick={() => setShowReject(true)} className="btn-ghost flex-1 py-2.5 text-sm"
                  style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#EF4444' }}>
                  Dispute Amount
                </button>
              </div>
            </>
          )}

          {/* REJECT FORM */}
          {(status === 'Unpaid' && showReject) || (status === 'Accepted' && showReject) ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-white flex items-center gap-2">
                <AlertTriangle size={15} style={{ color: '#D97706' }} /> Why are you disputing?
              </p>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                placeholder="e.g. I didn't have the momo, please update to Rs. 200"
                className="input-field resize-none" />
              <div className="flex gap-2">
                <button onClick={() => run(async () => { upd(await rejectLine(myLine.id, rejectReason.trim())); setShowReject(false) })}
                  disabled={busy || !rejectReason.trim()}
                  className="flex-1 py-2.5 text-sm rounded-xl font-semibold transition-all disabled:opacity-30"
                  style={{ background: '#EF4444', color: '#fff' }}>
                  {busy ? '…' : 'Send Dispute'}
                </button>
                <button onClick={() => { setShowReject(false); setRejectReason('') }} className="btn-ghost py-2.5 px-4 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {/* ACCEPTED → pay */}
          {status === 'Accepted' && !showReject && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Complete payment</p>
                <p className="text-xl font-bold text-white">Rs. {myLine.amount.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--text-2)' }}>Payment note (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Paid via eSewa"
                  className="input-field" />
              </div>
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-2)' }}>
                  Screenshot <span style={{ color: '#EF4444' }}>*</span>
                </p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setSSFile(f); setSSPreview(URL.createObjectURL(f)) } }} />
                {ssPreview ? (
                  <div>
                    <img src={ssPreview} alt="Screenshot" className="w-full rounded-xl object-contain max-h-40"
                      style={{ border: '1px solid rgba(255,255,255,0.07)' }} />
                    <button onClick={() => fileRef.current?.click()} className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Replace</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full flex flex-col items-center gap-2 py-5 rounded-xl text-sm transition-colors"
                    style={{ border: '1px dashed rgba(255,255,255,0.15)', color: 'var(--text-2)' }}>
                    <Camera size={20} />
                    Select screenshot
                  </button>
                )}
              </div>
              <button onClick={() => run(async () => {
                if (!screenshotFile) return
                const updated = await markAsPaid(myLine.id, note, '*')
                upd(updated)
                try {
                  const blob = await compressToBlob(screenshotFile)
                  await uploadScreenshotBinary(myLine.id, blob, '*')
                  upd({ ...updated, screenshotAttached: true })
                } catch { setActionErr('Paid ✓ but screenshot upload failed. Try again.') }
              })} disabled={!screenshotFile || busy}
                className="btn-primary w-full py-3 text-sm">
                {busy ? '…' : 'Confirm Payment'}
              </button>
              <button onClick={() => setShowReject(true)} className="w-full text-xs" style={{ color: 'var(--text-3)' }}>
                Dispute this amount instead
              </button>
            </>
          )}

          {/* REJECTED */}
          {status === 'Rejected' && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>Dispute sent</p>
              <p className="text-xs mt-1 italic" style={{ color: '#FCA5A5' }}>"{myLine.rejectionReason}"</p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-2)' }}>
                Waiting for {payerInfo?.name} to review and update the amount.
              </p>
            </div>
          )}

          {/* PAID */}
          {paid && (
            <div className="space-y-3">
              <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <CheckCircle2 size={22} className="mx-auto mb-2" style={{ color: '#10B981' }} />
                <p className="text-sm font-semibold" style={{ color: '#10B981' }}>You've paid this</p>
                {myLine.paidDateTime && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>{new Date(myLine.paidDateTime).toLocaleString()}</p>
                )}
              </div>
              {stillOwing.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#D97706' }}>Still waiting for ({stillOwing.length}):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stillOwing.map(l => (
                      <span key={l.id} className="text-xs px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-2)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {l.userName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {stillOwing.length === 0 && (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p className="text-sm" style={{ color: '#10B981' }}>🎉 Everyone has paid!</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
