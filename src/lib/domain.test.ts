import { describe, expect, it } from 'vitest'
import { can, canCompleteRenewal, expirationStatus } from './domain'
import type { RenewalTask } from '../types'

const now = new Date('2026-01-01T12:00:00Z')
describe('expiration status', () => {
  it('classifies boundary dates', () => {
    expect(expirationStatus('2025-12-31T00:00:00Z', now)).toBe('Expired')
    expect(expirationStatus('2026-01-08T12:00:00Z', now)).toBe('Critical')
    expect(expirationStatus('2026-01-31T12:00:00Z', now)).toBe('Expiring Soon')
    expect(expirationStatus('2026-02-15T12:00:00Z', now)).toBe('Healthy')
  })
})
describe('role permissions', () => { it('keeps viewers read-only', () => { expect(can('viewer', 'read')).toBe(true); expect(can('viewer', 'operate')).toBe(false); expect(can('operator', 'manage')).toBe(false); expect(can('admin', 'manage')).toBe(true) }) })
describe('renewal completion', () => {
  const base = { workflowId: 'w', owner: 'Alex', method: 'Manual' as const, instructions: '', dependencies: [] as string[], dueDate: '2026-01-01' }
  it('requires every task and successful validation', () => {
    const tasks: RenewalTask[] = [{ ...base, id: '1', title: 'Deploy', type: 'Deployment', status: 'Completed' }, { ...base, id: '2', title: 'Validate', type: 'Validation', status: 'Completed', validationResult: 'Failed' }]
    expect(canCompleteRenewal(tasks)).toBe(false)
    tasks[1].validationResult = 'Passed'
    expect(canCompleteRenewal(tasks)).toBe(true)
  })
})
