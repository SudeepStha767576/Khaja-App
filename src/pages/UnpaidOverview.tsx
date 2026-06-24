import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { getLinesByDocument } from '../api/lines.api'
import { getMyHeaders } from '../api/headers.api'
import { useKhajaUser } from '../auth/UserContext'
import type { KhajaHeader, KhajaLine } from '../types/khaja'

interface DocGroup {
  documentNo: string
  header?: KhajaHeader
  lines: KhajaLine[]
  totalUnpaid: number
  hasDisputes: boolean
}

const STATUS_PILL: Record<string, { bg: string; color: string }> = {
  Unpaid:   { bg: 'rgba(245,158,11,0.1)',  color: '#D97706' },
  Accepted: { bg: 'rgba(99,102,241,0.1)',  color: '#818CF8' },
  Rejected: { bg: 'rgba(239,68,68,0.1)',   color: '#EF4444' },
}

export function UnpaidOverview() {
  const navigate = useNavigate()
  const { khajaUser } = useKhajaUser()
  const [groups, setGroups]   = useState<DocGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (!khajaUser) return
    // Only show my documents (where I am the payer) with unpaid lines from others
    getMyHeaders(khajaUser.code)
      .then(async headers => {
        // All Unpaid = only docs where I AM THE PAYER (paymentBy = me)
        // Docs I created but paid by someone else belong in their view, not here
        const releasedHeaders = headers.filter(
          h => h.status === 'Released' && h.paymentBy === khajaUser.code
        )
        const withLines = await Promise.all(
          releasedHeaders.map(async h => {
            const allLines = await getLinesByDocument(h.no, 'All')
            // Only lines from others that haven't paid yet
            const unpaidLines = allLines.filter(
              l => l.paymentStatus !== 'Paid' &&
                   l.userEmail.toLowerCase() !== khajaUser.email.toLowerCase()
            )
            return { header: h, lines: unpaidLines }
          })
        )
        const result: DocGroup[] = withLines
          .filter(d => d.lines.length > 0) // only docs with outstanding lines
          .map(d => ({
            documentNo: d.header.no,
            header: d.header,
            lines: d.lines,
            totalUnpaid: d.lines.reduce((s, l) => s + l.amount, 0),
            hasDisputes: d.lines.some(l => l.paymentStatus === 'Rejected'),
          }))
          .sort((a, b) => b.documentNo.localeCompare(a.documentNo))
        setGroups(result)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [khajaUser])

  const totalPeople = groups.reduce((s, g) => s + g.lines.length, 0)
  const totalAmount = groups.reduce((s, g) => s + g.totalUnpaid, 0)

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-2)' }}>Loading…</div>
  if (error)   return <div className="max-w-2xl mx-auto px-4 py-6" style={{ color: '#EF4444' }}>{error}</div>

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">To Receive</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
          {totalPeople > 0
            ? `${totalPeople} ${totalPeople === 1 ? 'person' : 'people'} yet to pay you · Rs. ${totalAmount.toLocaleString()}`
            : 'No pending payments from your documents'}
        </p>
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3">
          <CheckCircle2 size={36} style={{ color: '#10B981' }} />
          <p className="text-white font-medium">Everyone has paid you back!</p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map(({ documentNo, header, lines, totalUnpaid, hasDisputes }, gi) => (
          <motion.div key={documentNo} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.05 }}
            className="card overflow-hidden"
            style={{ borderColor: hasDisputes ? 'rgba(239,68,68,0.2)' : undefined }}>

            {/* Doc header */}
            <div className="flex items-center justify-between px-5 py-3.5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: hasDisputes ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.01)' }}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{documentNo}</span>
                  {hasDisputes && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                      dispute
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white">{header?.description ?? documentNo}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  {header?.date} · Paid by {header?.paymentByName ?? '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: '#D97706' }}>Rs. {totalUnpaid.toLocaleString()}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{lines.length} pending</p>
              </div>
            </div>

            {/* Lines */}
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {lines.map(line => {
                const pill = STATUS_PILL[line.paymentStatus] ?? { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-2)' }
                return (
                  <div key={line.id}
                    onClick={() => navigate(`/payment/${line.id}`)}
                    className="flex items-center justify-between px-5 py-3 cursor-pointer group transition-all hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-1)' }}>
                        {line.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{line.userName}</p>
                        {line.paymentStatus === 'Rejected' && line.rejectionReason && (
                          <p className="text-xs italic" style={{ color: '#FCA5A5' }}>"{line.rejectionReason}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">Rs. {line.amount.toLocaleString()}</span>
                      <span className="badge" style={{ background: pill.bg, color: pill.color, border: `1px solid ${pill.color}25` }}>
                        {line.paymentStatus}
                      </span>
                      <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                        style={{ color: 'var(--text-3)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
