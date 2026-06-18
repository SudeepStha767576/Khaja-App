import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { KhajaLine } from '../types/khaja'

const STATUS_BADGE: Record<string, string> = {
  Unpaid: 'badge-unpaid', Accepted: 'badge-accepted',
  Rejected: 'badge-rejected', Paid: 'badge-paid',
}

const STATUS_FOOTER: Record<string, { text: string; color: string }> = {
  Unpaid:   { text: 'Accept or dispute →',            color: 'var(--text-2)' },
  Accepted: { text: '✓ Accepted — tap to pay',         color: '#10B981' },
  Rejected: { text: '⚠ Disputed — waiting for update', color: '#EF4444' },
  Paid:     { text: '',                                color: 'var(--text-2)' },
}

export function LineCard({ line }: { line: KhajaLine }) {
  const navigate = useNavigate()
  const footer = STATUS_FOOTER[line.paymentStatus]

  return (
    <div onClick={() => navigate(`/payment/${line.id}`)}
      className="card card-hover p-4 cursor-pointer group transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{line.documentNo}</p>
          <p className="text-sm font-semibold text-white truncate">{line.description || 'Khaja payment'}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
            Owed to <span className="text-white">{line.paymentByName ?? line.userName}</span>
          </p>
          {line.paymentStatus === 'Rejected' && line.rejectionReason && (
            <p className="text-xs italic mt-1 truncate" style={{ color: '#EF4444' }}>"{line.rejectionReason}"</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-white">Rs. {line.amount.toLocaleString()}</p>
          <span className={STATUS_BADGE[line.paymentStatus] ?? 'badge'}>{line.paymentStatus}</span>
        </div>
      </div>

      {footer && (
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-xs" style={{ color: footer.color }}>{footer.text}</span>
          {line.paymentStatus === 'Paid' && line.paidDateTime && (
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              {new Date(line.paidDateTime).toLocaleDateString()}
              {line.screenshotAttached && ' · Screenshot ✓'}
            </span>
          )}
          {line.paymentStatus !== 'Paid' && (
            <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              style={{ color: 'var(--text-3)' }} />
          )}
        </div>
      )}
    </div>
  )
}
