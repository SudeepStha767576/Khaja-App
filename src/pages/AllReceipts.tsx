import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Image, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getLinesByDocument } from '../api/lines.api'
import { getMyHeaders } from '../api/headers.api'
import { useKhajaUser } from '../auth/UserContext'
import type { KhajaHeader, KhajaLine } from '../types/khaja'

interface DocGroup {
  header: KhajaHeader
  paidLines: KhajaLine[]
  totalReceived: number
}

function ScreenshotModal({ base64, name, onClose }: { base64: string; name: string; onClose: () => void }) {
  const mime = base64.startsWith('/9j/') ? 'image/jpeg' : 'image/png'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>
      <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
        <img src={`data:${mime};base64,${base64}`} alt={`${name}'s screenshot`}
          className="rounded-2xl"
          style={{ maxWidth: 'min(85vw,400px)', maxHeight: 'min(75vh,600px)', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 32px 80px rgba(0,0,0,0.8)' }} />
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{name}'s payment proof</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Tap anywhere to close</p>
        </div>
        <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
          <X size={14} /> Close
        </button>
      </div>
    </div>
  )
}

export function AllReceipts() {
  const { khajaUser } = useKhajaUser()
  const [groups, setGroups]   = useState<DocGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [screenshot, setScreenshot] = useState<{ base64: string; name: string } | null>(null)

  useEffect(() => {
    if (!khajaUser) return
    getMyHeaders(khajaUser.code)
      .then(async headers => {
        const released = headers.filter(h => h.status === 'Released')
        const withLines = await Promise.all(released.map(async h => {
          const lines = await getLinesByDocument(h.no, 'All')
          const paidLines = lines.filter(l => l.paymentStatus === 'Paid')
          return { header: h, paidLines, totalReceived: paidLines.reduce((s, l) => s + l.amount, 0) }
        }))
        const result = withLines
          .filter(d => d.paidLines.length > 0)
          .sort((a, b) => b.header.no.localeCompare(a.header.no))
        setGroups(result)
        // Auto-expand first doc
        if (result.length > 0) setExpanded(new Set([result[0].header.no]))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [khajaUser])

  const totalReceived = groups.reduce((s, g) => s + g.totalReceived, 0)
  const totalPeople   = groups.reduce((s, g) => s + g.paidLines.length, 0)

  function toggle(no: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(no) ? next.delete(no) : next.add(no)
      return next
    })
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-2)' }}>Loading receipts…</div>

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">All Receipts</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
          {totalPeople > 0
            ? `${totalPeople} payment${totalPeople > 1 ? 's' : ''} received · Rs. ${totalReceived.toLocaleString()}`
            : 'Payments you have received from others'}
        </p>
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <CheckCircle2 size={36} style={{ color: '#10B981' }} />
          <p className="text-white font-medium">No receipts yet</p>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Paid confirmations will appear here</p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map(({ header, paidLines, totalReceived: docTotal }, gi) => {
          const isOpen = expanded.has(header.no)
          return (
            <motion.div key={header.no} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.05 }} className="card overflow-hidden">

              {/* Header row — click to expand */}
              <button onClick={() => toggle(header.no)}
                className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: isOpen ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{header.no}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{header.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                    {header.date} · {paidLines.length} receipt{paidLines.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: '#10B981' }}>Rs. {docTotal.toLocaleString()}</p>
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>received</p>
                  </div>
                  {isOpen ? <ChevronUp size={15} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={15} style={{ color: 'var(--text-3)' }} />}
                </div>
              </button>

              {/* Paid lines */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="divide-y overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {paidLines.map(line => (
                      <div key={line.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>
                            {line.userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white">{line.userName}</p>
                            {line.paidDateTime && (
                              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                                {new Date(line.paidDateTime).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <p className="text-sm font-bold text-white">Rs. {line.amount.toLocaleString()}</p>
                          {/* Screenshot button */}
                          {line.screenshotAttached && line.screenshotBase64 ? (
                            <button
                              onClick={() => setScreenshot({ base64: line.screenshotBase64!, name: line.userName })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95"
                              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-1)' }}>
                              <Image size={12} />
                              Proof
                            </button>
                          ) : line.screenshotAttached ? (
                            <span className="badge badge-paid">Paid</span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)', border: '1px solid rgba(255,255,255,0.08)' }}>No proof</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* Screenshot modal */}
      {screenshot && (
        <ScreenshotModal base64={screenshot.base64} name={screenshot.name} onClose={() => setScreenshot(null)} />
      )}
    </div>
  )
}
