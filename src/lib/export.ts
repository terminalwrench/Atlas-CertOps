import type { AuditEvent, Certificate, Customer, Deployment } from '../types'
import { certificateStatus, daysUntil } from './domain'

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
const csv = (rows: unknown[][]) => rows.map((row) => row.map(csvCell).join(',')).join('\r\n')

export function certificateInventoryCsv(certificates: Certificate[], customers: Customer[], deployments: Deployment[]) {
  return csv([
    ['Common name', 'SANs', 'Customer', 'Environment', 'Issuer', 'Certificate authority', 'Expires', 'Days remaining', 'Owner', 'Owner team', 'Deployment targets', 'Renewal method', 'Status'],
    ...certificates.map((certificate) => [certificate.commonName, certificate.sanNames.join('; '), customers.find((customer) => customer.id === certificate.customerId)?.name ?? '', certificate.environment, certificate.issuer, certificate.certificateAuthority, certificate.expiresAt, daysUntil(certificate.expiresAt), certificate.owner, certificate.ownerTeam, deployments.filter((deployment) => deployment.certificateId === certificate.id).length, certificate.renewalMethod, certificateStatus(certificate)]),
  ])
}

export function auditLogCsv(events: AuditEvent[]) {
  return csv([['Timestamp', 'Actor', 'Action', 'Entity type', 'Entity ID', 'Details'], ...events.map((event) => [event.timestamp, event.actor, event.action, event.entityType, event.entityId, event.metadata])])
}

export function downloadCsv(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url)
}
