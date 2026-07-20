import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AccountMenu } from './AccountMenu'

describe('AccountMenu', () => {
  it('exposes identity and role through an accessible menu', () => {
    render(<AccountMenu name="Maya Chen" email="maya@example.com" organizationName="Acme Operations" role="admin" onOpenSettings={vi.fn()} onSignOut={vi.fn()} />)
    const trigger = screen.getByRole('button', { name: 'Account menu' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByText('maya@example.com')).toBeInTheDocument()
    expect(screen.getByText('Acme Operations · admin')).toBeInTheDocument()
  })

  it('awaits session sign-out and invokes the authenticated-shell redirect', async () => {
    let sessionActive = true; let destination = ''
    const signOutAndRedirect = vi.fn(async () => { sessionActive = false; destination = '/login' })
    render(<AccountMenu name="Maya Chen" email="maya@example.com" organizationName="Acme Operations" role="operator" onOpenSettings={vi.fn()} onSignOut={signOutAndRedirect} />)
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    await waitFor(() => expect(signOutAndRedirect).toHaveBeenCalledOnce())
    expect(sessionActive).toBe(false)
    expect(destination).toBe('/login')
  })

  it('opens account and organization settings from the menu', () => {
    const openSettings = vi.fn()
    render(<AccountMenu name="Maya Chen" email="maya@example.com" organizationName="Acme Operations" role="owner" onOpenSettings={openSettings} onSignOut={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Account & organization' }))
    expect(openSettings).toHaveBeenCalledOnce()
  })
})
