import { NavLink, useNavigate } from 'react-router-dom'
import { useMsal } from '@azure/msal-react'
import { useKhajaUser } from '../auth/UserContext'
import { LayoutDashboard, Wallet, ListChecks, PlusCircle, LogOut, ChevronRight, Users } from 'lucide-react'

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/my-expenses', icon: Wallet,           label: 'My Expenses' },
  { to: '/unpaid',      icon: ListChecks,       label: 'All Unpaid' },
  { to: '/members',     icon: Users,            label: 'Members' },
  { to: '/new',         icon: PlusCircle,       label: 'New Expense' },
]

export function Layout({ children, disputeCount = 0 }: { children: React.ReactNode; disputeCount?: number }) {
  const { instance } = useMsal()
  const { khajaUser } = useKhajaUser()
  const navigate = useNavigate()

  const initials = khajaUser?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="flex min-h-screen">

      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 fixed top-0 left-0 h-full z-20"
        style={{ background: '#080808', borderRight: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-lg">🍜</span>
          <div>
            <p className="text-xs font-semibold text-white leading-tight">Khaja Tracker</p>
            <p className="text-xs leading-tight" style={{ color: 'var(--text-3)' }}>Dogma Group</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={15} strokeWidth={1.75} />
              <span className="flex-1">{label}</span>
              {label === 'My Expenses' && disputeCount > 0 ? (
                <span className="ml-auto rounded-full text-white text-xs font-bold w-4 h-4 flex items-center justify-center"
                  style={{ background: '#EF4444', fontSize: 9 }}>
                  {disputeCount}
                </span>
              ) : (
                <ChevronRight size={12} style={{ color: 'var(--text-3)' }} />
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-1)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{khajaUser?.name}</p>
              <p className="truncate" style={{ fontSize: 10, color: 'var(--text-3)' }}>{khajaUser?.email}</p>
            </div>
          </div>
          <button onClick={() => instance.logoutRedirect()}
            className="nav-link w-full text-xs" style={{ color: '#EF4444' }}>
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-4 sticky top-0 z-10"
          style={{ background: 'rgba(8,8,8,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2">
            <span className="text-base">🍜</span>
            <span className="text-xs font-semibold text-white">Khaja Tracker</span>
          </div>
          <div className="flex items-center gap-2">
            {disputeCount > 0 && (
              <button onClick={() => navigate('/my-expenses')}
                className="relative w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--bg-hover)' }}>
                <span className="text-base">⚠</span>
                <span className="absolute -top-1 -right-1 rounded-full text-white text-xs font-bold w-4 h-4 flex items-center justify-center"
                  style={{ background: '#EF4444', fontSize: 9 }}>
                  {disputeCount}
                </span>
              </button>
            )}
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 flex z-20"
          style={{ background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 gap-1 transition-colors ${isActive ? 'text-white' : 'text-gray-600'}`}>
              <div className="relative">
                <Icon size={18} strokeWidth={1.75} />
                {label === 'My Expenses' && disputeCount > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full text-white font-bold flex items-center justify-center"
                    style={{ background: '#EF4444', fontSize: 8, width: 12, height: 12 }}>
                    {disputeCount}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 9 }}>{label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
