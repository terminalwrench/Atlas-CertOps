import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './context/AuthContext'
import { DemoDataProvider, SupabaseDataProvider } from './context/DataContext'
import { CertificateDetail } from './pages/CertificateDetail'
import { Certificates } from './pages/Certificates'
import { CustomerDetail, Customers } from './pages/Customers'
import { Dashboard } from './pages/Dashboard'
import { Login, Onboarding, Signup } from './pages/Login'
import { ActivityPage, Deployments, Integrations, Runbooks, SettingsPage } from './pages/Operations'
import { Renewals } from './pages/Renewals'

function WorkspaceRoutes() { return <><Route index element={<Dashboard />} /><Route path="certificates" element={<Certificates />} /><Route path="certificates/:id" element={<CertificateDetail />} /><Route path="renewals" element={<Renewals />} /><Route path="customers" element={<Customers />} /><Route path="customers/:id" element={<CustomerDetail />} /><Route path="deployments" element={<Deployments />} /><Route path="runbooks" element={<Runbooks />} /><Route path="activity" element={<ActivityPage />} /><Route path="integrations" element={<Integrations />} /><Route path="settings" element={<SettingsPage />} /></> }
function DemoShell() { return <DemoDataProvider><Layout /></DemoDataProvider> }
function ProductionGuard() { const auth = useAuth(); if (auth.loading || auth.membershipLoading) return <div className="app-loading">Loading secure Atlas workspace…</div>; if (auth.configurationError) return <main className="login-page"><div className="login-card"><h1>Production is not configured</h1><p>{auth.configurationError} The isolated demonstration remains available.</p><a className="button primary" href="/demo">Open demo workspace</a></div></main>; if (!auth.user) return <Navigate to="/login" replace />; if (auth.membershipError) return <main className="login-page"><div className="login-card"><h1>Unable to load membership</h1><p>{auth.membershipError}</p><button className="button secondary" onClick={() => void auth.refreshMembership()}>Retry</button></div></main>; if (!auth.membership) return <Navigate to="/onboarding" replace />; return <SupabaseDataProvider><Outlet /></SupabaseDataProvider> }

export default function App() { return <Routes>
  <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/onboarding" element={<Onboarding />} />
  <Route path="/demo" element={<DemoShell />}>{WorkspaceRoutes()}</Route>
  <Route element={<ProductionGuard />}><Route path="/app" element={<Layout />}>{WorkspaceRoutes()}</Route></Route>
  <Route path="/" element={<Navigate to="/demo" replace />} /><Route path="*" element={<Navigate to="/demo" replace />} />
</Routes> }
