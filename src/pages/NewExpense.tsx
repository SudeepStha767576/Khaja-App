import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, SplitSquareVertical, ArrowLeft, Zap, Calculator } from 'lucide-react'
import { ShimmerButton } from '../components/ui/ShimmerButton'
import { getUsers } from '../api/userSetup.api'
import { createHeader, releaseHeader } from '../api/headers.api'
import { createLine } from '../api/lines.api'
import { useKhajaUser } from '../auth/UserContext'
import type { KhajaUserSetup } from '../types/khaja'

type SplitMode = 'custom' | 'equal'

export function NewExpense() {
  const navigate = useNavigate()
  const { khajaUser } = useKhajaUser()

  const [users, setUsers]     = useState<KhajaUserSetup[]>([])
  const [loading, setLoading] = useState(true)

  const [description, setDescription] = useState('')
  const [date, setDate]               = useState(new Date().toISOString().split('T')[0])
  const [paymentBy, setPaymentBy]     = useState('')
  const [totalBill, setTotalBill]     = useState('')
  const [splitMode, setSplitMode]     = useState<SplitMode>('equal')
  const [amounts, setAmounts]         = useState<Record<string, string>>({})
  const [selected, setSelected]       = useState<Record<string, boolean>>({})

  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    getUsers(true).then(u => {
      setUsers(u)
      const initAmts: Record<string, string> = {}
      const initSel: Record<string, boolean> = {}
      u.forEach(user => { initAmts[user.code] = ''; initSel[user.code] = true })
      setAmounts(initAmts)
      setSelected(initSel)
      // Pre-select current user as payer
      if (khajaUser) setPaymentBy(khajaUser.code)
    }).finally(() => setLoading(false))
  }, [khajaUser])

  const activeUsers  = users.filter(u => selected[u.code])
  const totalEntered = Object.entries(amounts).filter(([code]) => selected[code]).reduce((s, [, v]) => s + (parseFloat(v) || 0), 0)
  const billNum      = parseFloat(totalBill) || 0

  // Auto-calculate equal split
  function applyEqualSplit() {
    if (!billNum || activeUsers.length === 0) return
    const share = +(billNum / activeUsers.length).toFixed(0)
    const newAmts = { ...amounts }
    let rem = billNum
    activeUsers.forEach((u, i) => {
      if (i === activeUsers.length - 1) newAmts[u.code] = String(rem) // absorb rounding
      else { newAmts[u.code] = String(share); rem -= share }
    })
    setAmounts(newAmts)
  }

  useEffect(() => {
    if (splitMode === 'equal') applyEqualSplit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalBill, splitMode, JSON.stringify(selected)])

  const remaining   = billNum ? +(billNum - totalEntered).toFixed(0) : null
  const filledLines = users.filter(u => selected[u.code] && parseFloat(amounts[u.code] || '0') > 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return setError('Description is required.')
    if (!paymentBy)          return setError('Select who paid.')
    if (filledLines.length === 0) return setError('Enter at least one amount.')
    setSaving(true); setError(null)
    try {
      const header = await createHeader({
        description: description.trim(),
        date,
        paymentBy,
        createdByUserCode: khajaUser?.code,  // explicit human user code — not the Entra app identity
      })
      await Promise.all(filledLines.map((u, i) =>
        createLine({ documentNo: header.no, lineNo: (i + 1) * 10000, userCode: u.code, description: description.trim(), amount: parseFloat(amounts[u.code]) })
      ))
      await releaseHeader(header.id)
      navigate('/my-expenses')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed. Try again.')
    } finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-sm" style={{ color: 'var(--text-2)' }}>Loading members…</div>

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <ArrowLeft size={16} style={{ color: 'var(--text-2)' }} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">New Expense</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>Create and split a group payment</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Card 1: Basic info ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="card p-6 space-y-4">
          <p className="section-title flex items-center gap-2"><Zap size={12} /> Expense Details</p>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
              Description <span style={{ color: '#F87171' }}>*</span>
            </label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Office Momo Party, Lunch at Lukhnow"
              className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                Total Bill (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Rs.</span>
                <input type="number" min="0" value={totalBill} onChange={e => setTotalBill(e.target.value)}
                  placeholder="0" className="input-field" style={{ paddingLeft: '2.5rem' }} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
              Paid by <span style={{ color: '#F87171' }}>*</span>
            </label>
            <select value={paymentBy} onChange={e => setPaymentBy(e.target.value)} className="input-field">
              <option value="">Select who paid…</option>
              {users.map(u => <option key={u.code} value={u.code}>{u.name}</option>)}
            </select>
          </div>
        </motion.div>

        {/* ── Card 2: Split ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="card overflow-hidden">

          {/* Header row */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="section-title flex items-center gap-2"><Users size={12} /> Members & Amounts</p>
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.25)' }}>
              {(['equal', 'custom'] as SplitMode[]).map(m => (
                <button key={m} type="button" onClick={() => setSplitMode(m)}
                  className="px-3 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: splitMode === m ? '#FFFFFF' : 'transparent',
                    color: splitMode === m ? '#000000' : 'var(--text-2)',
                  }}>
                  {m === 'equal' ? <span className="flex items-center gap-1"><SplitSquareVertical size={10} />Equal</span> : <span className="flex items-center gap-1"><Calculator size={10} />Custom</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Members */}
          <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            {users.map(user => {
              const isSelected = selected[user.code]
              return (
                <div key={user.code}
                  className="flex items-center gap-4 px-6 py-3.5 transition-all"
                  style={{ background: isSelected ? 'transparent' : 'rgba(0,0,0,0.2)', opacity: isSelected ? 1 : 0.45 }}>

                  {/* Checkbox */}
                  <button type="button"
                    onClick={() => setSelected(p => ({ ...p, [user.code]: !p[user.code] }))}
                    className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center transition-all"
                    style={{
                      background: isSelected ? '#FFFFFF' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
                    }}>
                    {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </button>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFFFFF' }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name */}
                  <span className="flex-1 text-sm font-medium" style={{ color: isSelected ? '#F5F3FF' : 'var(--text-3)' }}>
                    {user.name}
                    {user.code === khajaUser?.code && <span className="ml-1.5 text-xs" style={{ color: 'var(--text-3)' }}>(you)</span>}
                  </span>

                  {/* Amount */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>Rs.</span>
                    <input type="number" min="0" step="1"
                      value={amounts[user.code] ?? ''}
                      onChange={e => { setSplitMode('custom'); setAmounts(p => ({ ...p, [user.code]: e.target.value })) }}
                      placeholder="0"
                      disabled={!isSelected}
                      className="input-field text-right"
                      style={{ width: '5.5rem', padding: '0.4rem 0.75rem' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer totals */}
          <div className="px-6 py-4 space-y-2" style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Total entered</span>
              <span className="text-sm font-bold text-white">Rs. {totalEntered.toLocaleString()}</span>
            </div>
            {billNum > 0 && remaining !== null && (
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {remaining > 0 ? 'Remaining to assign' : remaining < 0 ? 'Over by' : '✓ Fully assigned'}
                </span>
                <span className="text-sm font-semibold" style={{
                  color: remaining === 0 ? '#6EE7B7' : Math.abs(remaining) <= 5 ? '#FCD34D' : '#FCA5A5'
                }}>
                  {remaining !== 0 && `Rs. ${Math.abs(remaining).toLocaleString()}`}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-sm px-4 py-3 rounded-xl"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#FCA5A5' }}>
            {error}
          </motion.p>
        )}

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <ShimmerButton type="submit" disabled={saving} className="w-full py-3.5 text-sm">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Zap size={15} /> Create & Release
              </span>
            )}
          </ShimmerButton>
          <p className="text-center text-xs mt-2.5" style={{ color: 'var(--text-3)' }}>
            Released immediately — all members see it on their Dashboard
          </p>
        </motion.div>
      </form>
    </div>
  )
}
