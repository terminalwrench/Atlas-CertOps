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
    expect(screen.getByText('Validate Citrix endpoint')).toBeInTheDocument()
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
  it('does not load demo fixtures for an unavailable production provider', async () => {
    renderRoute('/app')
    expect(await screen.findByText('Sign in to Atlas')).toBeInTheDocument()
    expect(screen.queryByText('Acme Managed Services')).not.toBeInTheDocument()
  })
})
