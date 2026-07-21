import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { demoData } from './data/demo'

const renderRoute = (route: string) => render(<MemoryRouter initialEntries={[route]}><AuthProvider><App /></AuthProvider></MemoryRouter>)

describe('route isolation', () => {
  it('renders a public product landing page at the root route', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { name: 'Certificate lifecycle operations without enterprise PKI overhead.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Explore the live demo/ })).toHaveAttribute('href', '/demo')
  })
  it('renders the anonymous demo with fictional fixtures', async () => {
    renderRoute('/demo')
    expect(await screen.findByText('DEMO WORKSPACE')).toBeInTheDocument()
    expect(screen.getByText('Acme Managed Services')).toBeInTheDocument()
    expect(screen.getByText('Certificates monitored')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Account menu' })).not.toBeInTheDocument()
  })
  it.each(demoData.certificates.map((certificate) => [certificate.id, certificate.commonName]))(
    'renders demo certificate detail %s',
    async (id, commonName) => {
      renderRoute(`/demo/certificates/${id}`)
      expect(await screen.findByRole('heading', { name: commonName })).toBeInTheDocument()
      expect(screen.queryByText('Certificate not found')).not.toBeInTheDocument()
    },
  )
  it('shows the failed renewal and validation story for demo certificate cert-4', async () => {
    renderRoute('/demo/certificates/cert-4')
    expect(await screen.findByRole('heading', { name: 'citrix-stg.northstar-health.example' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Renewal workflow' })).toBeInTheDocument()
    expect(screen.getAllByText('Validate Citrix endpoint').length).toBeGreaterThan(0)
    expect(screen.getByText(/Endpoint still presents expired serial 77:31:A2:00:BA/)).toBeInTheDocument()
  })
  it.each(demoData.customers.map((customer) => [customer.id, customer.name]))(
    'renders demo customer detail %s',
    async (id, customerName) => {
      renderRoute(`/demo/customers/${id}`)
      expect(await screen.findByRole('heading', { name: customerName })).toBeInTheDocument()
      expect(screen.queryByText('Customer not found')).not.toBeInTheDocument()
    },
  )
  it.each(demoData.deployments.map((deployment) => [deployment.id, deployment.name]))(
    'renders demo deployment target detail %s',
    async (id, targetName) => {
      renderRoute(`/demo/deployments/${id}`)
      expect(await screen.findByRole('heading', { name: targetName })).toBeInTheDocument()
      expect(screen.queryByText('Deployment target not found')).not.toBeInTheDocument()
    },
  )
  it('supports certificate to target to customer navigation for the failed validation story', async () => {
    const certificateView = renderRoute('/demo/certificates/cert-4')
    expect(await screen.findByRole('link', { name: /Staging Citrix Gateway/ })).toHaveAttribute('href', '/demo/deployments/dep-6')
    certificateView.unmount()
    renderRoute('/demo/deployments/dep-6')
    expect(await screen.findByRole('heading', { name: 'Staging Citrix Gateway' })).toBeInTheDocument()
    expect(document.querySelector('a.simple-row[href="/demo/certificates/cert-4"]')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open Northstar Health/ })).toHaveAttribute('href', '/demo/customers/cust-northstar')
    expect(screen.getByText(/Observed: Endpoint still presents expired serial/)).toBeInTheDocument()
  })
  it('presents renewal lifecycle state, blockers, ownership, and validation closure requirements', async () => {
    renderRoute('/demo/renewals')
    expect(await screen.findByRole('heading', { name: 'Renewal operations' })).toBeInTheDocument()
    expect(screen.getAllByText('Current state').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Current owner').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Validation Failed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Vendor Waiting').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Cannot close until verified').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('list', { name: 'Renewal lifecycle' }).length).toBe(demoData.workflows.length)
  })
  it('renders public documentation and security routes', async () => {
    const docs = renderRoute('/docs')
    expect(await screen.findByRole('heading', { name: "Operate the certificate lifecycle’s last mile." })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Demo and production workspaces' })).toBeInTheDocument()
    docs.unmount()
    renderRoute('/security')
    expect(await screen.findByRole('heading', { name: 'Security at Atlas CertOps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Current controls' })).toBeInTheDocument()
    expect(screen.getByText(/does not claim a formal compliance certification/)).toBeInTheDocument()
  })
  it('shows a real not-found page for invalid public and demo routes', async () => {
    const publicView = renderRoute('/not-a-real-route')
    expect(await screen.findByRole('heading', { name: "This page isn’t in the Atlas map." })).toBeInTheDocument()
    publicView.unmount()
    renderRoute('/demo/not-a-real-route')
    expect(await screen.findByRole('heading', { name: "This page isn’t in the Atlas map." })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open demo' })).toHaveAttribute('href', '/demo')
  })
  it('does not load demo fixtures for an unavailable production provider', async () => {
    renderRoute('/app')
    expect(await screen.findByText('Sign in to Atlas')).toBeInTheDocument()
    expect(screen.queryByText('Acme Managed Services')).not.toBeInTheDocument()
  })
})
