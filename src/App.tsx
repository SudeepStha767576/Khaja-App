import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useMsal, MsalAuthenticationTemplate, type MsalAuthenticationResult } from '@azure/msal-react'
import { InteractionType } from '@azure/msal-browser'
import { loginRequest } from './auth/msalConfig'
import { UserProvider, useKhajaUser } from './auth/UserContext'
import { Layout } from './components/Layout'
import { getAllLines }   from './api/lines.api'
import { getMyHeaders }  from './api/headers.api'

// Route-level code splitting — each page loads only when first visited
const Dashboard     = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const PaymentDetail = lazy(() => import('./pages/PaymentDetail').then(m => ({ default: m.PaymentDetail })))
const UnpaidOverview = lazy(() => import('./pages/UnpaidOverview').then(m => ({ default: m.UnpaidOverview })))
const NewExpense    = lazy(() => import('./pages/NewExpense').then(m => ({ default: m.NewExpense })))
const MyExpenses    = lazy(() => import('./pages/MyExpenses').then(m => ({ default: m.MyExpenses })))
const UserSetup     = lazy(() => import('./pages/UserSetup').then(m => ({ default: m.UserSetup })))
const AllReceipts   = lazy(() => import('./pages/AllReceipts').then(m => ({ default: m.AllReceipts })))

function NotRegistered() {
  const { accounts, instance } = useMsal()
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="glass-card p-10 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-3xl mx-auto mb-4">🚫</div>
        <h1 className="text-xl font-bold text-white mb-2">Not Registered</h1>
        <p className="text-sm text-sm mb-6">
          <strong className="text-white">{accounts[0]?.username}</strong> is not in the Khaja User Setup.
          Ask an admin to add your email in BC.
        </p>
        <button onClick={() => instance.logoutRedirect()} className="btn-ghost w-full">Sign out</button>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { khajaUser, loading } = useKhajaUser()
  const [disputeCount, setDisputeCount] = useState(0)

  useEffect(() => {
    if (!khajaUser) return
    getMyHeaders(khajaUser.code, khajaUser.email)
      .then(async headers => {
        const myDocNos = new Set(headers.map(h => h.no))
        const rejected = await getAllLines('Rejected')
        setDisputeCount(rejected.filter(l => myDocNos.has(l.documentNo)).length)
      })
      .catch(() => {})
  }, [khajaUser])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl animate-pulse">🍜</div>
        <p className="text-sm text-sm">Verifying your account…</p>
      </div>
    </div>
  )

  if (!khajaUser) return <NotRegistered />

  return (
    <Layout disputeCount={disputeCount}>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
          Loading…
        </div>
      }>
      <Routes>

        <Route path="/"            element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"   element={<Dashboard khajaUser={khajaUser} />} />
        <Route path="/payment/:id" element={<PaymentDetail />} />
        <Route path="/my-expenses" element={<MyExpenses />} />
        <Route path="/unpaid"      element={<UnpaidOverview />} />
        <Route path="/receipts"    element={<AllReceipts />} />
        <Route path="/members"     element={<UserSetup />} />
        <Route path="/new"         element={<NewExpense />} />
      </Routes>
      </Suspense>
    </Layout>
  )
}

function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl">🍜</div>
        <p className="text-sm text-sm">Signing you in…</p>
      </div>
    </div>
  )
}

function AuthError({ error }: MsalAuthenticationResult) {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="glass-card p-8 max-w-sm w-full text-center">
        <p className="text-3xl mb-3">⚠️</p>
        <h1 className="text-xl font-bold text-white mb-2">Sign-in failed</h1>
        <p className="text-sm">{error?.message ?? 'Authentication failed'}</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <MsalAuthenticationTemplate
        interactionType={InteractionType.Redirect}
        authenticationRequest={loginRequest}
        loadingComponent={AuthLoading}
        errorComponent={AuthError}
      >
        <UserProvider>
          <AppRoutes />
        </UserProvider>
      </MsalAuthenticationTemplate>
    </BrowserRouter>
  )
}
