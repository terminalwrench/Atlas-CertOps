import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { demoData } from '../data/demo'
import { SupabaseDataRepository } from './supabaseData'

describe('Supabase certificate persistence boundary', () => {
  it('scopes certificate create and update writes to the active organization', async () => {
    const inserts: Array<{ table: string; payload: Record<string, unknown> }> = []
    const updates: Array<{ table: string; payload: Record<string, unknown> }> = []
    const equalityFilters: Array<[string, unknown]> = []
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'environments') {
          const query = { select: () => query, eq: (field: string, value: unknown) => { equalityFilters.push([field, value]); return query }, maybeSingle: async () => ({ data: { id: 'environment-1' }, error: null }) }
          return query
        }
        if (table === 'certificates') {
          const result = { select: () => result, single: async () => ({ data: { id: 'certificate-1' }, error: null }), eq: (field: string, value: unknown) => { equalityFilters.push([field, value]); return result }, then: (resolve: (value: { error: null }) => void) => resolve({ error: null }) }
          return { insert: (payload: Record<string, unknown>) => { inserts.push({ table, payload }); return result }, update: (payload: Record<string, unknown>) => { updates.push({ table, payload }); return result } }
        }
        return { insert: async (payload: Record<string, unknown>) => { inserts.push({ table, payload }); return { error: null } } }
      }),
    } as unknown as SupabaseClient
    const repository = new SupabaseDataRepository(client, 'organization-1', 'user-1')

    await repository.createCertificate(demoData.certificates[0])
    await repository.updateCertificate('certificate-1', { notes: 'Updated operational note' })

    expect(inserts.find((write) => write.table === 'certificates')?.payload.organization_id).toBe('organization-1')
    expect(inserts.find((write) => write.table === 'certificates')?.payload).not.toHaveProperty('private_key')
    expect(updates[0].payload).toEqual({ notes: 'Updated operational note' })
    expect(equalityFilters).toContainEqual(['organization_id', 'organization-1'])
  })
})
