import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { demoData } from '../data/demo'
import { canCompleteRenewal } from '../lib/domain'
import { isSupabaseConfigured } from '../lib/supabase'
import type { AtlasData, Certificate, RenewalTask } from '../types'

interface DataState extends AtlasData {
  completeTask(taskId: string): void
  retryTask(taskId: string): void
  addCertificate(certificate: Certificate): void
  markNotificationsRead(): void
}
const DataContext = createContext<DataState | null>(null)
const emptyData: AtlasData = { customers: [], certificates: [], deployments: [], workflows: [], tasks: [], runbooks: [], validations: [], auditEvents: [], notifications: [] }

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AtlasData>(isSupabaseConfigured ? emptyData : demoData)
  const value = useMemo<DataState>(() => ({
    ...data,
    completeTask(taskId) {
      setData((current) => {
        const tasks = current.tasks.map((task): RenewalTask => task.id === taskId ? { ...task, status: 'Completed', completedAt: new Date().toISOString(), validationResult: task.type === 'Validation' ? 'Passed' : task.validationResult } : task)
        const changed = tasks.find((task) => task.id === taskId)
        const workflows = current.workflows.map((workflow) => workflow.id === changed?.workflowId && canCompleteRenewal(tasks.filter((task) => task.workflowId === workflow.id)) ? { ...workflow, status: 'Completed' as const } : workflow)
        return { ...current, tasks, workflows, auditEvents: changed ? [{ id: crypto.randomUUID(), action: 'task.completed', entityType: 'renewal_task', entityId: changed.id, actor: 'Alex Morgan', timestamp: new Date().toISOString(), metadata: `${changed.title} marked complete in demo mode.` }, ...current.auditEvents] : current.auditEvents }
      })
    },
    retryTask(taskId) { setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: 'In Progress', validationResult: undefined } : task) })) },
    addCertificate(certificate) { setData((current) => ({ ...current, certificates: [certificate, ...current.certificates], auditEvents: [{ id: crypto.randomUUID(), action: 'certificate.added', entityType: 'certificate', entityId: certificate.id, actor: 'Alex Morgan', timestamp: new Date().toISOString(), metadata: `${certificate.commonName} added manually in demo mode.` }, ...current.auditEvents] })) },
    markNotificationsRead() { setData((current) => ({ ...current, notifications: current.notifications.map((note) => ({ ...note, read: true })) })) },
  }), [data])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
export const useData = () => { const context = useContext(DataContext); if (!context) throw new Error('useData must be inside DataProvider'); return context }
