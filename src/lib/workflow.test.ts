import { describe, expect, it } from 'vitest'
import { workflowEvidence } from './workflow'
import type { RenewalTask, RenewalWorkflow } from '../types'

const workflow: RenewalWorkflow = { id: 'wf', certificateId: 'cert', status: 'Deployment In Progress', startedAt: '2026-01-01', dueDate: '2026-01-10', owner: 'Operator', taskIds: [] }
const base = { workflowId: 'wf', owner: 'Operator', method: 'Manual' as const, instructions: '', dependencies: [] as string[], dueDate: '2026-01-10' }

describe('workflow operational evidence', () => {
  it('keeps a vendor-blocked renewal open', () => {
    const tasks: RenewalTask[] = [{ ...base, id: 'vendor', title: 'Vendor installs certificate', type: 'Vendor Handoff', status: 'Blocked', vendor: 'Vendor Co', ticketNumber: 'VEN-42' }, { ...base, id: 'validation', title: 'Validate endpoint', type: 'Validation', status: 'Pending' }]
    const evidence = workflowEvidence(workflow, tasks)
    expect(evidence.currentState).toBe('Vendor Waiting')
    expect(evidence.blockers).toEqual(['Vendor installs certificate — Vendor Co · VEN-42'])
    expect(evidence.closed).toBe(false)
    expect(evidence.stages.find((stage) => stage.key === 'vendor')?.state).toBe('blocked')
  })

  it('does not close after deployment when validation failed', () => {
    const tasks: RenewalTask[] = [{ ...base, id: 'deploy', title: 'Deploy', type: 'Deployment', status: 'Completed' }, { ...base, id: 'validation', title: 'Validate', type: 'Validation', status: 'Failed', validationResult: 'Failed' }]
    const evidence = workflowEvidence({ ...workflow, status: 'Failed' }, tasks)
    expect(evidence.currentState).toBe('Validation Failed')
    expect(evidence.verified).toBe(false)
    expect(evidence.stages.find((stage) => stage.key === 'validation')?.state).toBe('blocked')
    expect(evidence.stages.find((stage) => stage.key === 'closed')?.state).toBe('blocked')
  })
})
