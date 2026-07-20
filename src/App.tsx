import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './context/AuthContext'
import { DemoDataProvider, SupabaseDataProvider } from './context/DataContext'
import { Login, Onboarding, Signup } from './pages/Login'
import { ContactPage, DocumentationPage, Landing, NotFoundPage, TrustPage } from './pages/Public'

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const Certificates = lazy(() => import('./pages/Certificates').then((module) => ({ default: module.Certificates })))
const CertificateDetail = lazy(() => import('./pages/CertificateDetail').then((module) => ({ default: module.CertificateDetail })))
const Renewals = lazy(() => import('./pages/Renewals').then((module) => ({ default: module.Renewals })))
const Customers = lazy(() => import('./pages/Customers').then((module) => ({ default: module.Customers })))
const CustomerDetail = lazy(() => import('./pages/Customers').then((module) => ({ default: module.CustomerDetail })))
const Deployments = lazy(() => import('./pages/Operations').then((module) => ({ default: module.Deployments })))
const DeploymentDetail = lazy(() => import('./pages/DeploymentDetail').then((module) => ({ default: module.DeploymentDetail })))
const Runbooks = lazy(() => import('./pages/Operations').then((module) => ({ default: module.Runbooks })))
const ActivityPage = lazy(() => import('./pages/Operations').then((module) => ({ default: module.ActivityPage })))
const Integrations = lazy(() => import('./pages/Operations').then((module) => ({ default: module.Integrations })))
const SettingsPage = lazy(() => import('./pages/Operations').then((module) => ({ default: module.SettingsPage })))

function WorkspaceRoutes() { return <><Route index element={<Dashboard />} /><Route path="certificates" element={<Certificates />} /><Route path="certificates/:id" element={<CertificateDetail />} /><Route path="renewals" element={<Renewals />} /><Route path="customers" element={<Customers />} /><Route path="customers/:id" element={<CustomerDetail />} /><Route path="deployments" element={<Deployments />} /><Route path="deployments/:id" element={<DeploymentDetail />} /><Route path="runbooks" element={<Runbooks />} /><Route path="activity" element={<ActivityPage />} /><Route path="integrations" element={<Integrations />} /><Route path="settings" element={<SettingsPage />} /><Route path="*" element={<NotFoundPage workspace />}/></> }
function DemoShell() { return <DemoDataProvider><Layout /></DemoDataProvider> }
function ProductionGuard() { const auth = useAuth(); if (auth.loading || auth.membershipLoading) return <div className="app-loading">Loading secure Atlas workspace…</div>; if (auth.configurationError) return <main className="login-page"><div className="login-card"><h1>Production is not configured</h1><p>{auth.configurationError} The isolated demonstration remains available.</p><a className="button primary" href="/demo">Open demo workspace</a></div></main>; if (!auth.user) return <Navigate to="/login" replace />; if (auth.membershipError) return <main className="login-page"><div className="login-card"><h1>Unable to load membership</h1><p>{auth.membershipError}</p><button className="button secondary" onClick={() => void auth.refreshMembership()}>Retry</button></div></main>; if (!auth.membership) return <Navigate to="/onboarding" replace />; return <SupabaseDataProvider><Outlet /></SupabaseDataProvider> }

export default function App() { return <Suspense fallback={<div className="app-loading">Loading Atlas CertOps…</div>}><Routes>
  <Route path="/" element={<Landing />} /><Route path="/docs" element={<DocumentationPage />} /><Route path="/privacy" element={<TrustPage kind="privacy" />} /><Route path="/terms" element={<TrustPage kind="terms" />} /><Route path="/security" element={<TrustPage kind="security" />} /><Route path="/contact" element={<ContactPage />} />
  <Route path="/login" element={<Login />} /><Route path="/signup" element={<Signup />} /><Route path="/onboarding" element={<Onboarding />} />
  <Route path="/demo" element={<DemoShell />}>{WorkspaceRoutes()}</Route>
  <Route element={<ProductionGuard />}><Route path="/app" element={<Layout />}>{WorkspaceRoutes()}</Route></Route>
  <Route path="*" element={<NotFoundPage />} />
</Routes></Suspense> }
