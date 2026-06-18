import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion } from 'framer-motion'
import { Clock, CheckCircle2, AlertTriangle, Zap, ArrowUpRight, Receipt, TrendingUp } from 'lucide-react'
import { getLinesByEmail, getAllLines } from '../api/lines.api'
import { getMyHeaders } from '../api/headers.api'
import { NumberTicker } from '../components/ui/NumberTicker'
import type { KhajaLine, KhajaUserSetup, LineStatusFilter } from '../types/khaja'

const TABS: { value: LineStatusFilter; label: string }[] = [
  { value: 'Active', label: 'Outstanding' },
  { value: 'Paid',   label: 'Paid' },
  { value: 'All',    label: 'All' },
]

const STATUS_BADGE: Record<string, string> = {
  Unpaid: 'badge-unpaid', Accepted: 'badge-accepted',
  Rejected: 'badge-rejected', Paid: 'badge-paid',
}

interface DashboardProps { khajaUser: KhajaUserSetup }


export function Dashboard({ khajaUser }: DashboardProps) {
  const navigate = useNavigate()
  const [myLines, setMyLines]   = useState<KhajaLine[]>([])
  const [allLines, setAllLines] = useState<KhajaLine[]>([])
  const [myDocNos, setMyDocNos] = useState<Set<string>>(new Set())
  const [filter, setFilter]     = useState<LineStatusFilter>('Active')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getLinesByEmail(khajaUser.email, filter),
      getAllLines('All'),
      getMyHeaders(khajaUser.code, khajaUser.email),
    ])
      .then(([mine, all, myHeaders]) => {
        setMyLines(mine)
        setAllLines(all)
        // Only docs where I AM THE PAYER — for Due Receipt / dispute badge
        setMyDocNos(new Set(myHeaders.filter(h => h.paymentBy === khajaUser.code).map(h => h.no)))
      })
      .finally(() => setLoading(false))
  }, [khajaUser.email, khajaUser.code, filter])

  // Lines where I am the debtor (what I owe others)
  const myAll     = allLines.filter(l => l.userEmail.toLowerCase() === khajaUser.email.toLowerCase())
  const totalOwed = myAll.filter(l => l.paymentStatus !== 'Paid').reduce((s, l) => s + l.amount, 0)
  const totalPaid = myAll.filter(l => l.paymentStatus === 'Paid').reduce((s, l) => s + l.amount, 0)
  const disputed    = myAll.filter(l => l.paymentStatus === 'Rejected').length
  const accepted    = myAll.filter(l => l.paymentStatus === 'Accepted').length
  const outstanding = myAll.filter(l => l.paymentStatus !== 'Paid')

  // Lines from MY documents that others haven't paid back yet (what I'm owed)
  const dueReceipts = allLines.filter(l =>
    myDocNos.has(l.documentNo) &&
    l.paymentStatus !== 'Paid' &&
    l.userEmail.toLowerCase() !== khajaUser.email.toLowerCase()
  )
  const dueTotal = dueReceipts.reduce((s, l) => s + l.amount, 0)

  const chartData = Object.values(
    myAll.reduce<Record<string, { name: string; paid: number; owed: number }>>((acc, l) => {
      const key = l.documentNo
      if (!acc[key]) acc[key] = { name: l.documentNo.replace(/[^0-9]/g,''), paid: 0, owed: 0 }
      if (l.paymentStatus === 'Paid') acc[key].paid += l.amount
      else acc[key].owed += l.amount
      return acc
    }, {})
  ).slice(-7)

  const stats = [
    { label: 'Outstanding',    value: totalOwed,  prefix: 'Rs. ', icon: Clock,         color: '#D97706' },
    { label: 'Total Paid',     value: totalPaid,  prefix: 'Rs. ', icon: CheckCircle2,  color: '#10B981' },
    { label: 'Due Receipt',    value: dueTotal,   prefix: 'Rs. ', icon: Receipt,        color: '#60A5FA' },
    { label: 'Accepted',       value: accepted,   prefix: '', suffix: ' items',         icon: TrendingUp, color: '#A3A3A3' },
    { label: 'Disputes',       value: disputed,   prefix: '', suffix: disputed === 1 ? ' dispute' : ' disputes', icon: AlertTriangle, color: '#EF4444' },
  ]

  return (
    <div className="px-4 lg:px-8 py-6 space-y-6 max-w-5xl mx-auto">

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-tight text-white">
              Good day, {khajaUser.name.split(' ')[0]} 👋
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {outstanding.length > 0 && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Zap size={14} style={{ color: '#F59E0B' }} />
              <span className="text-xs font-semibold" style={{ color: '#FCD34D' }}>
                {outstanding.length} outstanding · Rs. {totalOwed.toLocaleString()}
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="card card-hover p-5">
            <div className="flex items-center justify-between mb-4">
              <s.icon size={16} strokeWidth={1.75} style={{ color: s.color }} />
              <ArrowUpRight size={13} style={{ color: 'var(--text-3)' }} />
            </div>
            <p className="text-xl font-bold leading-none mb-1 text-white">
              <NumberTicker value={s.value} prefix={s.prefix} suffix={s.suffix} />
            </p>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart + Receipt */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Bar chart — only render when there's meaningful data */}
        <motion.div className="card p-5 lg:col-span-3"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Payment History</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>Paid vs outstanding per document</p>
            </div>
            {chartData.length > 0 && (
              <span className="section-title">Last {chartData.length} doc{chartData.length > 1 ? 's' : ''}</span>
            )}
          </div>

          {chartData.length < 2 ? (
            /* Not enough data — show a clean empty state instead of a sad single-dot chart */
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="flex gap-2">
                {[40, 70, 55, 90, 65].map((h, i) => (
                  <div key={i} className="w-8 rounded-t-md opacity-10 transition-all"
                    style={{ height: h, background: i % 2 === 0 ? '#10B981' : '#ffffff' }}/>
                ))}
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                Create more expenses to see your payment history
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} barGap={3} margin={{ left: -15, right: 5 }}>
                  <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} width={36}/>
                  <Tooltip
                    contentStyle={{ background: '#101010', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11, color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="paid" name="Paid" radius={[3, 3, 0, 0]} maxBarSize={28}>
                    {chartData.map((_, i) => <Cell key={i} fill="#10B981" fillOpacity={0.85}/>)}
                  </Bar>
                  <Bar dataKey="owed" name="Outstanding" radius={[3, 3, 0, 0]} maxBarSize={28}>
                    {chartData.map((_, i) => <Cell key={i} fill="rgba(255,255,255,0.25)"/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3">
                {[{c:'#10B981',l:'Paid'},{c:'rgba(255,255,255,0.4)',l:'Outstanding'}].map(({c,l}) => (
                  <span key={l} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }}/>
                    {l}
                  </span>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Due receipt */}
        <motion.div className="card lg:col-span-2 flex flex-col"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <Receipt size={15} style={{ color: 'var(--text-2)' }}/>
              <h2 className="text-sm font-semibold text-white">Due Receipt</h2>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>Owed to you</span>
          </div>

          {dueReceipts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <CheckCircle2 size={22} style={{ color: '#10B981' }}/>
              </div>
              <p className="text-sm font-semibold text-white">All received!</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>Everyone has paid you back</p>
            </div>
          ) : (
            <div className="flex-1 divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              {dueReceipts.slice(0, 5).map(line => (
                <div key={line.id} onClick={() => navigate(`/payment/${line.id}`)}
                  className="flex items-center justify-between px-5 py-3 cursor-pointer group hover:bg-white/[0.02] transition-all">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{line.userName}</p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-2)' }}>
                      {line.description || line.documentNo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className="text-xs font-bold text-white">Rs. {line.amount.toLocaleString()}</span>
                    <span className={`badge ${
                      line.paymentStatus === 'Rejected' ? 'badge-rejected' :
                      line.paymentStatus === 'Accepted' ? 'badge-accepted' : 'badge-unpaid'
                    }`}>{line.paymentStatus}</span>
                  </div>
                </div>
              ))}
              {dueReceipts.length > 5 && (
                <div className="px-5 py-3 text-center">
                  <button onClick={() => navigate('/my-expenses')} className="text-xs" style={{ color: 'var(--text-2)' }}>
                    + {dueReceipts.length - 5} more in My Expenses
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* My Payments */}
      <motion.div className="card overflow-hidden"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #2A1F4A' }}>
          <h2 className="text-sm font-semibold text-white">My Payments</h2>
          <div className="flex items-center gap-0.5 p-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {TABS.map(tab => (
              <button key={tab.value} onClick={() => setFilter(tab.value)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                style={filter === tab.value
                  ? { background: '#FFFFFF', color: '#000000' }
                  : { color: 'var(--text-2)' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"/>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</span>
          </div>
        )}
        {!loading && myLines.length === 0 && (
          <div className="flex flex-col items-center py-14 gap-3">
            <CheckCircle2 size={32} style={{ color: '#10B981' }}/>
            <p className="text-sm font-medium text-white">
              {filter === 'Active' ? 'All clear — nothing outstanding!' : 'No items found.'}
            </p>
          </div>
        )}

        <div>
          {myLines.map((line, i) => (
            <motion.div key={line.id}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(`/payment/${line.id}`)}
              className="flex items-center justify-between px-5 py-4 cursor-pointer group hover:bg-white/[0.025] transition-all"
              style={{ borderBottom: i < myLines.length - 1 ? '1px solid #1E1639' : 'none' }}>

              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}>
                  {(line.paymentByName ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#F5F3FF' }}>{line.description || 'Khaja payment'}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {line.documentNo} · Owed to <span style={{ color: 'var(--text-2)' }}>{line.paymentByName}</span>
                  </p>
                  {line.paymentStatus === 'Rejected' && line.rejectionReason && (
                    <p className="text-xs italic mt-0.5 truncate" style={{ color: '#FCA5A5' }}>"{line.rejectionReason}"</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 ml-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-white">Rs. {line.amount.toLocaleString()}</p>
                  <span className={STATUS_BADGE[line.paymentStatus] ?? 'badge'}>{line.paymentStatus}</span>
                </div>
                <ArrowUpRight size={15}
                  className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                  style={{ color: '#4E4272' }}/>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
