import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, PlusCircle } from 'lucide-react'
import { getMyHeaders, releaseHeader } from '../api/headers.api'
import { getLinesByDocument, resetLine } from '../api/lines.api'
import { useKhajaUser } from '../auth/UserContext'
import type { KhajaHeader, KhajaLine } from '../types/khaja'

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  Unpaid:   { bg: 'rgba(245,158,11,0.1)',  color: '#D97706' },
  Accepted: { bg: 'rgba(99,102,241,0.1)',  color: '#818CF8' },
  Rejected: { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
  Paid:     { bg: 'rgba(16,185,129,0.1)',  color: '#10B981' },
}

interface DocWithLines { header: KhajaHeader; lines: KhajaLine[] }

export function MyExpenses() {
  const navigate = useNavigate()
  const { khajaUser } = useKhajaUser()
  const [docs, setDocs]     = useState<DocWithLines[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [editAmounts, setEditAmounts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!khajaUser) return
    getMyHeaders(khajaUser.code, khajaUser.email)
      .then(async headers => {
        const sorted = [...headers].sort((a, b) => b.no.localeCompare(a.no))
        const withLines = await Promise.all(sorted.map(async h => ({
          header: h, lines: await getLinesByDocument(h.no, 'All'),
        })))
        setDocs(withLines)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [khajaUser])

  function updLine(docNo: string, updated: KhajaLine) {
    setDocs(p => p.map(d => d.header.no === docNo ? { ...d, lines: d.lines.map(l => l.id === updated.id ? updated : l) } : d))
  }

  async function handleRelease(header: KhajaHeader) {
    try { const u = await releaseHeader(header.id); setDocs(p => p.map(d => d.header.no === header.no ? { ...d, header: u } : d)) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Failed') }
  }

  async function handleReset(docNo: string, line: KhajaLine) {
    setSaving(p => ({ ...p, [line.id]: true }))
    try {
      const amt = parseFloat(editAmounts[line.id])
      updLine(docNo, await resetLine(line.id, isNaN(amt) ? undefined : amt))
      setEditAmounts(p => { const n = { ...p }; delete n[line.id]; return n })
    } finally { setSaving(p => ({ ...p, [line.id]: false })) }
  }

  const totalRejected = docs.reduce((s, d) => s + d.lines.filter(l => l.paymentStatus === 'Rejected').length, 0)

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-2)' }}>Loading…</div>
  if (error)   return <div className="max-w-2xl mx-auto px-4 py-6" style={{ color: '#EF4444' }}>{error}</div>

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">My Expenses</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>Documents where you are the payer</p>
        </div>
        <div className="flex items-center gap-3">
          {totalRejected > 0 && (
            <span className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              ⚠ {totalRejected} dispute{totalRejected > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => navigate('/new')} className="btn-primary py-2 px-4 text-xs">
            <PlusCircle size={13} /> New
          </button>
        </div>
      </div>

      {docs.length === 0 && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">🍜</p>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>No documents where you are the payer yet.</p>
          <button onClick={() => navigate('/new')} className="btn-primary mt-4 py-2 px-5 text-sm">+ New Expense</button>
        </div>
      )}

      <div className="space-y-4">
        {docs.map(({ header, lines }, di) => {
          const paid         = lines.filter(l => l.paymentStatus === 'Paid').length
          const rejectedLines = lines.filter(l => l.paymentStatus === 'Rejected')
          const hasRej       = rejectedLines.length > 0

          return (
            <motion.div key={header.no} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: di * 0.06 }}
              className="card overflow-hidden"
              style={{ borderColor: hasRej ? 'rgba(239,68,68,0.25)' : undefined }}>

              {/* Doc header */}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: hasRej ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{header.no}</span>
                    {hasRej && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                        {rejectedLines.length} dispute{rejectedLines.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white">{header.description}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                    {header.date} · {paid}/{lines.length} paid · Rs. {(header.totalAmount ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`badge ${header.status === 'Released' ? 'badge-paid' : header.status === 'Open' ? 'badge-accepted' : 'badge-released'}`}>
                    {header.status}
                  </span>
                  {header.status === 'Open' && (
                    <button onClick={() => handleRelease(header)} className="text-xs" style={{ color: 'var(--text-2)' }}>Release →</button>
                  )}
                </div>
              </div>

              {/* Lines */}
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {lines.map(line => {
                  const isRej     = line.paymentStatus === 'Rejected'
                  const isEditing = editAmounts[line.id] !== undefined
                  const pill      = STATUS_PILL[line.paymentStatus]

                  return (
                    <div key={line.id} className="px-5 py-3"
                      style={{ background: isRej ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-3">
                          <p className="text-sm font-medium text-white">{line.userName}</p>
                          {isRej && line.rejectionReason && (
                            <p className="text-xs italic mt-0.5" style={{ color: '#FCA5A5' }}>"{line.rejectionReason}"</p>
                          )}
                          {line.paymentStatus === 'Paid' && line.paidDateTime && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                              {new Date(line.paidDateTime).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-white">Rs. {line.amount.toLocaleString()}</span>
                          <span className="badge" style={{ background: pill.bg, color: pill.color, border: `1px solid ${pill.color}25` }}>
                            {line.paymentStatus}
                          </span>
                        </div>
                      </div>

                      {isRej && (
                        <div className="mt-2">
                          {!isEditing ? (
                            <button onClick={() => setEditAmounts(p => ({ ...p, [line.id]: line.amount.toString() }))}
                              className="text-xs btn-ghost py-1 px-3">
                              Update Amount & Reset
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs" style={{ color: 'var(--text-2)' }}>Rs.</span>
                              <input type="number" value={editAmounts[line.id]}
                                onChange={e => setEditAmounts(p => ({ ...p, [line.id]: e.target.value }))}
                                className="input-field text-right" style={{ width: '5rem', padding: '0.3rem 0.5rem' }} />
                              <button onClick={() => handleReset(header.no, line)} disabled={saving[line.id]}
                                className="btn-primary text-xs py-1 px-3">{saving[line.id] ? '…' : 'Confirm & Reset'}</button>
                              <button onClick={() => setEditAmounts(p => { const n = { ...p }; delete n[line.id]; return n })}
                                className="text-xs" style={{ color: 'var(--text-3)' }}>Cancel</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
