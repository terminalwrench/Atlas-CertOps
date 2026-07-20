import type { Certificate, CertificateStatus, RenewalTask, Role } from '../types'

export const daysUntil = (date: string, now = new Date()): number => Math.ceil((new Date(date).getTime() - now.getTime()) / 86_400_000)

export function expirationStatus(expiresAt: string, now = new Date()): CertificateStatus {
  const days = daysUntil(expiresAt, now)
  if (days < 0) return 'Expired'
  if (days <= 7) return 'Critical'
  if (days <= 30) return 'Expiring Soon'
  return 'Healthy'
}

export function certificateStatus(certificate: Certificate): CertificateStatus {
  return certificate.statusOverride ?? expirationStatus(certificate.expiresAt)
}

const grants: Record<Role, readonly string[]> = {
  owner: ['read', 'operate', 'manage', 'members', 'billing'],
  admin: ['read', 'operate', 'manage', 'members'],
  operator: ['read', 'operate'],
  viewer: ['read'],
}
export const can = (role: Role, permission: 'read' | 'operate' | 'manage' | 'members' | 'billing') => grants[role].includes(permission)

export const canCompleteRenewal = (tasks: RenewalTask[]): boolean => tasks.length > 0 && tasks.every((task) => task.status === 'Completed' && (task.type !== 'Validation' || task.validationResult === 'Passed'))

export const progressForTasks = (tasks: RenewalTask[]): number => tasks.length ? Math.round((tasks.filter((task) => task.status === 'Completed').length / tasks.length) * 100) : 0

export const formatDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
