import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AuthProvider } from './context/AuthContext'

const renderRoute = (route: string) => render(<MemoryRouter initialEntries={[route]}><AuthProvider><App /></AuthProvider></MemoryRouter>)

describe('route isolation', () => {
  it('renders the anonymous demo with fictional fixtures', async () => {
    renderRoute('/demo')
    expect(await screen.findByText('DEMO WORKSPACE')).toBeInTheDocument()
    expect(screen.getByText('Acme Managed Services')).toBeInTheDocument()
    expect(screen.getByText('Certificates monitored')).toBeInTheDocument()
  })
  it('does not load demo fixtures for an unavailable production provider', async () => {
    renderRoute('/app')
    expect(await screen.findByText('Sign in to Atlas')).toBeInTheDocument()
    expect(screen.queryByText('Acme Managed Services')).not.toBeInTheDocument()
  })
})
