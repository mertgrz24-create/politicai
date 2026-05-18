import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Newspaper, Inbox, Settings, History, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/news', label: 'Haberler', icon: Newspaper, end: false },
  { to: '/queue', label: 'Kuyruk', icon: Inbox, end: false },
  { to: '/settings/persona', label: 'Persona', icon: Settings, end: false },
  { to: '/history', label: 'Geçmiş', icon: History, end: false },
] as const

export default function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen bg-gray-950 text-sm">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-4 py-4">
          <span className="font-semibold tracking-tight text-white">PoliticAI</span>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
                }`
              }
            >
              <Icon size={14} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-800 px-2 py-3">
          <p className="truncate px-3 pb-1.5 text-xs text-gray-500">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-gray-400 transition-colors hover:bg-gray-800/60 hover:text-gray-200"
          >
            <LogOut size={14} strokeWidth={1.75} />
            Çıkış Yap
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
