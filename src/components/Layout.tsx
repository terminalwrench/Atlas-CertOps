import { Activity, Bell, BookOpen, Boxes, ChevronDown, Gauge, KeyRound, Menu, RefreshCw, Settings, ShieldCheck, Users, X, Zap } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const nav = [
  ['/', 'Dashboard', Gauge], ['/certificates', 'Certificates', KeyRound], ['/renewals', 'Renewals', RefreshCw], ['/customers', 'Customers', Users], ['/deployments', 'Deployment Targets', Boxes], ['/runbooks', 'Runbooks', BookOpen], ['/activity', 'Activity', Activity], ['/integrations', 'Integrations', Zap], ['/settings', 'Settings', Settings],
] as const

export function Layout() {
  const [open, setOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const { user, isDemo } = useAuth()
  const { notifications, markNotificationsRead } = useData()
  const unread = notifications.filter((note) => !note.read).length
  return <div className="app-shell">
    <aside className={open ? 'sidebar sidebar-open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={20} /></div><div><strong>Atlas</strong><span>CertOps</span></div><button className="mobile-close" onClick={() => setOpen(false)}><X size={20} /></button></div>
      <div className="org-switcher"><div className="org-avatar">AS</div><div><strong>Acme Managed Services</strong><span>MSP organization</span></div><ChevronDown size={15} /></div>
      <nav>{nav.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}><Icon size={17} />{label}</NavLink>)}</nav>
      <div className="sidebar-footer"><div className="security-note"><ShieldCheck size={16} /><div><strong>Metadata only</strong><span>Private keys are never stored.</span></div></div><div className="profile"><div className="avatar">AM</div><div><strong>{user?.user_metadata.full_name ?? user?.email}</strong><span>Organization owner</span></div></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={20} /></button><div className="environment"><span className="live-dot" />{isDemo ? 'Demo workspace' : 'Production workspace'}</div><div className="topbar-actions"><span className="shortcut">⌘ K</span><button className="icon-button notification-button" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={18} />{unread > 0 && <b>{unread}</b>}</button></div>{notificationsOpen && <div className="notification-panel"><header><strong>Notifications</strong><button onClick={markNotificationsRead}>Mark all read</button></header>{notifications.map((note) => <div className={`notification ${note.read ? '' : 'unread'}`} key={note.id}><span className={`severity-dot ${note.severity}`} /><div><strong>{note.title}</strong><p>{note.message}</p></div></div>)}</div>}</header>
      {isDemo && <div className="demo-banner"><span>DEMO MODE</span> Using operational sample data. Configure Supabase environment variables for production persistence.</div>}
      <main className="content"><Outlet /></main>
    </div>
    {open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
  </div>
}
