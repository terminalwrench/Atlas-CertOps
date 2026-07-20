import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useAuth } from './context/AuthContext'
import { Dashboard } from './pages/Dashboard'
import { CertificateDetail } from './pages/CertificateDetail'
import { Certificates } from './pages/Certificates'
import { CustomerDetail, Customers } from './pages/Customers'
import { Login } from './pages/Login'
import { ActivityPage, Deployments, Integrations, Runbooks, SettingsPage } from './pages/Operations'
import { Renewals } from './pages/Renewals'

function Protected() { const { user, loading } = useAuth(); if (loading) return <div className="app-loading">Loading Atlas workspace…</div>; return user ? <Layout /> : <Navigate to="/login" replace /> }
export default function App() { return <Routes><Route path="/login" element={<Login />} /><Route element={<Protected />}><Route index element={<Dashboard />} /><Route path="certificates" element={<Certificates />} /><Route path="certificates/:id" element={<CertificateDetail />} /><Route path="renewals" element={<Renewals />} /><Route path="customers" element={<Customers />} /><Route path="customers/:id" element={<CustomerDetail />} /><Route path="deployments" element={<Deployments />} /><Route path="runbooks" element={<Runbooks />} /><Route path="activity" element={<ActivityPage />} /><Route path="integrations" element={<Integrations />} /><Route path="settings" element={<SettingsPage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes> }
