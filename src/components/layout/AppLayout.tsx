import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Newspaper,
  Inbox,
  Settings2,
  History,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Banner, Brand } from '@/components/ui/Primitives'
import { WorkspaceGuard } from '@/components/ui/WorkspaceGuard'
import { useWorkspaceGuard } from '@/contexts/WorkspaceContext'
import { X_PUBLISH_ENABLED } from '@/lib/presentation'

const NAV = [
  { to: '/', label: 'Günlük özet', icon: LayoutDashboard, end: true },
  { to: '/news', label: 'Editör masası', icon: Newspaper, end: false },
  { to: '/queue', label: 'Onay kuyruğu', icon: Inbox, end: false },
  { to: '/history', label: 'Geçmiş', icon: History, end: false },
  {
    to: '/settings/persona',
    label: 'İletişim profili',
    icon: Settings2,
    end: false,
  },
] as const
function Shell() {
  const { user, signOut, sessionError } = useAuth()
  const { request } = useWorkspaceGuard()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  const name = user?.email?.split('@')[0] || 'Çalışma alanı'
  return (
    <div className="pa-app">
      <a className="pa-skip" href="#main-content">
        İçeriğe geç
      </a>
      <div className="pa-shell">
        <aside className="pa-sidebar">
          <Link
            className="pa-brand-link"
            to="/"
            aria-label="PoliticAI günlük özet"
          >
            <Brand />
          </Link>
          <button
            className="pa-icon-button pa-mobile-menu"
            aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
            aria-controls="workspace-navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="pa-account">
            <span className="pa-avatar">
              {name.slice(0, 2).toLocaleUpperCase('tr')}
            </span>
            <div>
              <strong title={user?.email}>{name}</strong>
              <small>İletişim çalışma alanı</small>
            </div>
          </div>
          <span className="pa-nav-label">ÇALIŞMA ALANI</span>
          <nav
            id="workspace-navigation"
            aria-label="Ana gezinme"
            className={`pa-nav ${open ? 'is-open' : ''}`}
          >
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}>
                <Icon size={19} strokeWidth={1.75} />
                {label}
              </NavLink>
            ))}
            <button
              className="pa-sign-out pa-mobile-signout"
              onClick={() => request(signOut)}
            >
              <LogOut size={18} />
              Çıkış yap
            </button>
          </nav>
          <div className="pa-sidebar-bottom">
            <div className="pa-connection">
              <span className="pa-dot" />
              <div>
                <strong>
                  {X_PUBLISH_ENABLED
                    ? 'X yayın entegrasyonu etkin'
                    : 'X yayını henüz etkin değil'}
                </strong>
                <p>
                  {X_PUBLISH_ENABLED
                    ? 'Her yayın için insan onayı gerekir.'
                    : 'Taslaklarını hazırlayıp onaylayabilirsin.'}
                </p>
              </div>
            </div>
            <button className="pa-sign-out" onClick={() => request(signOut)}>
              <LogOut size={18} />
              Çıkış yap
            </button>
          </div>
        </aside>
        <main className="pa-main" id="main-content" tabIndex={-1}>
          <div>
            {sessionError && <Banner kind="error">{sessionError}</Banner>}
            <Outlet />
          </div>
          <footer className="pa-footer">
            <span>PoliticAI / İletişim çalışma alanı</span>
            <Link to="/settings/persona">İletişim profilini düzenle</Link>
            <span>Her içerik senin onayınla.</span>
          </footer>
        </main>
      </div>
    </div>
  )
}
export default function AppLayout() {
  return (
    <WorkspaceGuard>
      <Shell />
    </WorkspaceGuard>
  )
}
