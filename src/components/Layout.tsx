import { Activity, Bell, BookOpen, Boxes, ChevronDown, Gauge, KeyRound, Menu, RefreshCw, Settings, ShieldCheck, Users, X, Zap } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const nav = [
  ['', 'Dashboard', Gauge], ['/certificates', 'Certificates', KeyRound], ['/renewals', 'Renewals', RefreshCw], ['/customers', 'Customers', Users], ['/deployments', 'Deployment Targets', Boxes], ['/runbooks', 'Runbooks', BookOpen], ['/activity', 'Activity', Activity], ['/integrations', 'Integrations', Zap], ['/settings', 'Settings', Settings],
] as const

export function Layout() {
  const [open, setOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const auth = useAuth()
  const data = useData()
  const { notifications, markNotificationsRead, mode } = data
  const isDemo = mode === 'demo'; const base = isDemo ? '/demo' : '/app'; const organizationName = isDemo ? 'Acme Managed Services' : auth.membership?.organization.name ?? 'Atlas workspace'; const displayName = isDemo ? 'Alex Morgan' : auth.membership?.displayName ?? auth.user?.user_metadata.full_name ?? auth.user?.email
  const unread = notifications.filter((note) => !note.read).length
  return <div className="app-shell">
    <aside className={open ? 'sidebar sidebar-open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={20} /></div><div><strong>Atlas</strong><span>CertOps</span></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <div className="org-switcher"><div className="org-avatar">{organizationName.slice(0, 2).toUpperCase()}</div><div><strong>{organizationName}</strong><span>{isDemo ? 'Fictional demo organization' : 'Production organization'}</span></div><ChevronDown size={15} /></div>
      <nav>{nav.map(([to, label, Icon]) => <NavLink key={to} to={`${base}${to}`} end={to === ''} onClick={() => setOpen(false)}><Icon size={17} />{label}</NavLink>)}</nav>
      <div className="sidebar-footer">{isDemo && <div className="demo-cta"><strong>Ready for your own estate?</strong><Link to="/signup">Start free</Link></div>}<div className="security-note"><ShieldCheck size={16} /><div><strong>Metadata only</strong><span>Private keys are never stored.</span></div></div><div className="profile"><div className="avatar">{String(displayName ?? 'U').slice(0, 2).toUpperCase()}</div><div><strong>{displayName}</strong><span>{isDemo ? 'Demo organization owner' : `${auth.membership?.role ?? 'member'} role`}</span></div>{!isDemo && <button className="icon-button" onClick={() => void auth.signOut()} aria-label="Sign out">↗</button>}</div></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={20} /></button><div className="environment"><span className="live-dot" />{isDemo ? 'Demo workspace' : 'Production workspace'}</div><div className="topbar-actions">{isDemo && <Link className="topbar-cta" to="/signup">Create workspace</Link>}<span className="shortcut">⌘ K</span><button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} />{unread > 0 && <b>{unread}</b>}</button></div>{notificationsOpen && <div className="notification-panel"><header><strong>Notifications</strong><button onClick={() => void markNotificationsRead()}>Mark all read</button></header>{notifications.length === 0 && <p className="notification-empty">No notifications.</p>}{notifications.map((note) => <div className={`notification ${note.read ? '' : 'unread'}`} key={note.id}><span className={`severity-dot ${note.severity}`} /><div><strong>{note.title}</strong><p>{note.message}</p></div></div>)}</div>}</header>
      {isDemo && <div className="demo-banner"><span>DEMO WORKSPACE</span> Fictional operational data · Changes reset when refreshed. <Link to="/signup">Start free</Link></div>}
      <main className="content">{data.loading ? <div className="workspace-state">Loading production data…</div> : data.error ? <div className="workspace-error"><strong>Production data could not be loaded</strong><p>{data.error}</p><button className="button secondary" onClick={() => void data.refresh()}>Retry</button></div> : <Outlet />}</main>
    </div>
    {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
  </div>
}
