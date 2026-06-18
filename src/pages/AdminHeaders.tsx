import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHeaders, createHeader } from '../api/headers.api'
import { getUsers } from '../api/userSetup.api'
import { createLine } from '../api/lines.api'
import type { KhajaHeader, KhajaUserSetup } from '../types/khaja'

export function AdminHeaders() {
  const navigate = useNavigate()
  const [headers, setHeaders] = useState<KhajaHeader[]>([])
  const [users, setUsers] = useState<KhajaUserSetup[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const [newDesc, setNewDesc] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newPaymentBy, setNewPaymentBy] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([getHeaders(), getUsers()])
      .then(([h, u]) => { setHeaders(h); setUsers(u) })
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    setSaving(true)
    try {
      const header = await createHeader({
        description: newDesc,
        date: newDate,
        paymentBy: newPaymentBy,
      })
      setHeaders((prev) => [header, ...prev])
      setShowCreate(false)
      setNewDesc('')
      setNewPaymentBy('')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddAllLines(documentNo: string) {
    const linePromises = users.map((u, i) =>
      createLine({
        documentNo,
        lineNo: (i + 1) * 10000,
        userCode: u.code,
        description: 'Khaja share',
        amount: 0,
      })
    )
    await Promise.all(linePromises)
    navigate(`/admin/headers/${documentNo}`)
  }

  if (loading) return <div className="text-center py-20 text-gray-400">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Khaja Payments</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-khaja-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-khaja-secondary transition-colors"
        >
          + New Payment
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-800">New Khaja Payment</h2>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="e.g. Office Momo Party"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-khaja-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-khaja-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Paid By</label>
            <select
              value={newPaymentBy}
              onChange={(e) => setNewPaymentBy(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-khaja-primary focus:outline-none"
            >
              <option value="">Select member…</option>
              {users.map((u) => (
                <option key={u.code} value={u.code}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newDesc || !newPaymentBy}
              className="flex-1 bg-khaja-primary text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Document'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {headers.map((h) => (
          <div
            key={h.id}
            className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-semibold text-gray-900">{h.description}</p>
              <p className="text-sm text-gray-500">{h.date} · Paid by {h.paymentByName}</p>
              <p className="text-sm text-gray-500">Total: Rs. {h.totalAmount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                h.status === 'Released' ? 'bg-green-100 text-green-700' :
                h.status === 'Open' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {h.status}
              </span>
              {h.status === 'Open' && (
                <button
                  onClick={() => handleAddAllLines(h.no)}
                  className="block mt-2 text-xs text-khaja-primary underline"
                >
                  Add all members
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
