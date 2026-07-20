import { describe, expect, it } from 'vitest'
import { appPath, modeFromPath, providerForPath } from './routes'
import { validateSupabaseEnvironment } from './supabase'

describe('application mode isolation', () => {
  it('always selects the demo provider for demo routes regardless of environment configuration', () => {
    expect(providerForPath('/demo')).toBe('demo')
    expect(providerForPath('/demo/certificates/cert-1')).toBe('demo')
    expect(validateSupabaseEnvironment('https://project.supabase.co', 'sb_publishable_test')).toBeNull()
    expect(providerForPath('/demo')).toBe('demo')
  })
  it('always selects Supabase for production routes and never demo fallback', () => {
    expect(providerForPath('/app')).toBe('supabase')
    expect(providerForPath('/app/customers')).toBe('supabase')
    expect(modeFromPath('/login')).toBe('production')
  })
  it('builds mode-scoped navigation paths', () => {
    expect(appPath('demo', '/renewals')).toBe('/demo/renewals')
    expect(appPath('production', '/renewals')).toBe('/app/renewals')
  })
})

describe('Supabase frontend environment', () => {
  it('requires URL and publishable key without privileged credentials', () => {
    expect(validateSupabaseEnvironment()).toBe('Supabase is not configured.')
    expect(validateSupabaseEnvironment('https://project.supabase.co')).toContain('PUBLISHABLE_KEY')
    expect(validateSupabaseEnvironment(undefined, 'sb_publishable_test')).toContain('URL')
  })
})
