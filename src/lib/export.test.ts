import { describe, expect, it } from 'vitest'
import { demoData } from '../data/demo'
import { auditLogCsv, certificateInventoryCsv } from './export'

describe('CSV exports', () => {
  it('exports operational metadata without secret material', () => {
    const output = certificateInventoryCsv(demoData.certificates, demoData.customers, demoData.deployments)
    expect(output).toContain('Common name')
    expect(output).toContain('*.northstar-health.example')
    expect(output).not.toMatch(/private.?key/i)
  })

  it('escapes audit fields safely', () => {
    const output = auditLogCsv([{ ...demoData.auditEvents[0], metadata: 'Changed "VIP", then validated' }])
    expect(output).toContain('"Changed ""VIP"", then validated"')
  })
})
