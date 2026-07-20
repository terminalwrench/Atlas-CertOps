import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary, isChunkLoadError } from './AppErrorBoundary'

function BrokenPage(): ReactElement { throw new Error('Unexpected render failure') }

describe('AppErrorBoundary', () => {
  it('recognizes stale deployment chunk failures', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true)
    expect(isChunkLoadError(new Error('Database request failed'))).toBe(false)
  })

  it('shows a visible recovery screen instead of a blank application', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(<AppErrorBoundary><BrokenPage /></AppErrorBoundary>)
    expect(screen.getByRole('heading', { name: 'This page couldn’t be loaded.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload Atlas' })).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
