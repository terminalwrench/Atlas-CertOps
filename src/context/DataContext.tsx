import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { demoData } from '../data/demo'
import { canCompleteRenewal } from '../lib/domain'
import { supabase } from '../lib/supabase'
import { SupabaseDataRepository } from '../services/supabaseData'
import { fetchDemoCertificates, readCachedDemoCertificates } from '../services/demoCertificateService'
import type { AtlasData, Certificate, LiveCertificateMetadata, RenewalTask } from '../types'
import { useAuth } from './AuthContext'

export interface DataState extends AtlasData {
  mode: 'demo' | 'production'; loading: boolean; error: string | null; refresh(): Promise<void>
  liveCertificates: LiveCertificateMetadata[]; liveCertificateStatus: 'unavailable' | 'cached' | 'refreshing' | 'live' | 'error'; liveCertificateError: string | null; liveCertificatesRefreshedAt: string | null; refreshLiveCertificates(force?: boolean): Promise<void>
  completeTask(taskId: string): Promise<void>; retryTask(taskId: string): Promise<void>; addCertificate(certificate: Certificate): Promise<void>
  updateCertificate(id: string, changes: Partial<Certificate>): Promise<void>; updateCustomer(id: string, input: { name: string; industry: string }): Promise<void>
  startRenewal(certificateId: string): Promise<void>
  addCustomer(input: { name: string; industry: string }): Promise<void>; addEnvironment(input: { customerId: string; name: string; kind: string }): Promise<void>
  addDeployment(input: { certificateId: string; name: string; type: string; hostname: string; method: string; vendor: string; maintenanceWindow: string; validationMethod: string }): Promise<void>
  addRunbook(input: { deploymentId: string; title: string; description: string; steps: string[]; warnings: string[]; expectedValidation: string }): Promise<void>
  deleteRecord(table: 'customers' | 'environments' | 'certificates' | 'certificate_deployments' | 'runbooks' | 'integration_configs', id: string): Promise<void>
  markNotificationsRead(): Promise<void>
}
const DataContext = createContext<DataState | null>(null)
export const emptyData: AtlasData = { customers: [], environments: [], certificates: [], deployments: [], workflows: [], tasks: [], runbooks: [], validations: [], auditEvents: [], notifications: [] }

export function DemoDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AtlasData>(() => structuredClone(demoData))
  const cached = useMemo(() => readCachedDemoCertificates(), []); const [liveCertificates, setLiveCertificates] = useState<LiveCertificateMetadata[]>(cached?.items ?? []); const [liveCertificateStatus, setLiveCertificateStatus] = useState<DataState['liveCertificateStatus']>(cached ? 'cached' : 'unavailable'); const [liveCertificateError, setLiveCertificateError] = useState<string | null>(null); const [liveCertificatesRefreshedAt, setLiveCertificatesRefreshedAt] = useState<string | null>(cached?.refreshedAt ?? null)
  const refreshLiveCertificates = useCallback(async (force = false) => { setLiveCertificateStatus('refreshing'); setLiveCertificateError(null); try { const result = await fetchDemoCertificates(force); setLiveCertificates(result.items); setLiveCertificatesRefreshedAt(result.refreshedAt); setLiveCertificateStatus('live') } catch (cause) { setLiveCertificateError(cause instanceof Error ? cause.message : 'Live inspection is temporarily unavailable.'); setLiveCertificateStatus(liveCertificates.length ? 'cached' : 'error') } }, [liveCertificates.length])
  const inspectionStarted = useRef(false); useEffect(() => { if (inspectionStarted.current) return; inspectionStarted.current = true; void refreshLiveCertificates(false) }, [refreshLiveCertificates])
  const value = useMemo<DataState>(() => ({ ...data, mode: 'demo', loading: false, error: null, liveCertificates, liveCertificateStatus, liveCertificateError, liveCertificatesRefreshedAt, refreshLiveCertificates, async refresh() {},
    async completeTask(taskId) { setData((current) => { const tasks = current.tasks.map((task): RenewalTask => task.id === taskId ? { ...task, status: 'Completed', completedAt: new Date().toISOString(), validationResult: task.type === 'Validation' ? 'Passed' : task.validationResult } : task); const changed = tasks.find((task) => task.id === taskId); const workflows = current.workflows.map((workflow) => workflow.id === changed?.workflowId && canCompleteRenewal(tasks.filter((task) => task.workflowId === workflow.id)) ? { ...workflow, status: 'Completed' as const } : workflow); return { ...current, tasks, workflows, auditEvents: changed ? [{ id: crypto.randomUUID(), action: 'task.completed', entityType: 'renewal_task', entityId: changed.id, actor: 'Alex Morgan', timestamp: new Date().toISOString(), metadata: `${changed.title} marked complete in demo mode.` }, ...current.auditEvents] : current.auditEvents } }) },
    async retryTask(taskId) { setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status: 'In Progress', validationResult: undefined } : task) })) },
    async startRenewal() {},
    async addCertificate(certificate) { setData((current) => ({ ...current, certificates: [certificate, ...current.certificates], auditEvents: [{ id: crypto.randomUUID(), action: 'certificate.added', entityType: 'certificate', entityId: certificate.id, actor: 'Alex Morgan', timestamp: new Date().toISOString(), metadata: `${certificate.commonName} added manually in demo mode.` }, ...current.auditEvents] })) },
    async updateCertificate(id, changes) { setData((current) => ({ ...current, certificates: current.certificates.map((certificate) => certificate.id === id ? { ...certificate, ...changes } : certificate) })) },
    async addCustomer(input) { const customer = { id: crypto.randomUUID(), name: input.name, industry: input.industry, slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), environments: [] }; setData((current) => ({ ...current, customers: [customer, ...current.customers] })) },
    async updateCustomer(id, input) { setData((current) => ({ ...current, customers: current.customers.map((customer) => customer.id === id ? { ...customer, ...input } : customer) })) },
    async addEnvironment(input) { setData((current) => ({ ...current, environments: [...current.environments, { id: crypto.randomUUID(), ...input }], customers: current.customers.map((customer) => customer.id === input.customerId ? { ...customer, environments: [...customer.environments, input.name] } : customer) })) },
    async addDeployment(input) { const certificate = data.certificates.find((item) => item.id === input.certificateId); setData((current) => ({ ...current, deployments: [{ id: crypto.randomUUID(), certificateId: input.certificateId, name: input.name, type: input.type, hostname: input.hostname, environment: certificate?.environment ?? 'Unassigned', method: input.method.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') as 'Automated' | 'Manual' | 'Vendor Assisted' | 'External System', owner: 'Alex Morgan', vendor: input.vendor || undefined, maintenanceWindow: input.maintenanceWindow, automationStatus: input.method === 'automated' ? 'Automated' : 'Manual coordination', validationMethod: input.validationMethod, status: 'Pending', dependencies: [] }, ...current.deployments] })) },
    async addRunbook(input) { const id = crypto.randomUUID(); setData((current) => ({ ...current, runbooks: [{ id, ...input }, ...current.runbooks], deployments: current.deployments.map((deployment) => deployment.id === input.deploymentId ? { ...deployment, runbookId: id } : deployment) })) },
    async deleteRecord(table, id) { if (table === 'customers') setData((current) => ({ ...current, customers: current.customers.filter((item) => item.id !== id) })); if (table === 'certificates') setData((current) => ({ ...current, certificates: current.certificates.filter((item) => item.id !== id) })) },
    async markNotificationsRead() { setData((current) => ({ ...current, notifications: current.notifications.map((note) => ({ ...note, read: true })) })) },
  }), [data, liveCertificates, liveCertificateStatus, liveCertificateError, liveCertificatesRefreshedAt, refreshLiveCertificates])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function SupabaseDataProvider({ children }: { children: ReactNode }) {
  const { user, membership } = useAuth(); const [data, setData] = useState<AtlasData>(emptyData); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null)
  const repository = useMemo(() => supabase && user && membership ? new SupabaseDataRepository(supabase, membership.organization.id, user.id) : null, [user, membership])
  const refresh = useCallback(async () => { if (!repository) { setData(emptyData); setLoading(false); return } setLoading(true); setError(null); try { setData(await repository.load()) } catch (cause) { setData(emptyData); setError(cause instanceof Error ? cause.message : 'Unable to load production workspace.') } finally { setLoading(false) } }, [repository])
  useEffect(() => { void refresh() }, [refresh])
  const mutate = useCallback(async (operation: (repo: SupabaseDataRepository) => Promise<void>) => { if (!repository) throw new Error('Production data provider is unavailable.'); setError(null); try { await operation(repository); await refresh() } catch (cause) { const message = cause instanceof Error ? cause.message : 'Production operation failed.'; setError(message); throw new Error(message) } }, [repository, refresh])
  const value = useMemo<DataState>(() => ({ ...data, mode: 'production', loading, error, refresh, liveCertificates: [], liveCertificateStatus: 'unavailable', liveCertificateError: null, liveCertificatesRefreshedAt: null, async refreshLiveCertificates() {},
    completeTask: (id) => mutate((repo) => repo.completeTask(id)), retryTask: (id) => mutate((repo) => repo.retryTask(id)), startRenewal: (id) => mutate((repo) => repo.startRenewal(id)), addCertificate: (certificate) => mutate((repo) => repo.createCertificate(certificate)), updateCertificate: (id, changes) => mutate((repo) => repo.updateCertificate(id, changes)), addCustomer: (input) => mutate((repo) => repo.createCustomer(input)), updateCustomer: (id, input) => mutate((repo) => repo.updateCustomer(id, input)), addEnvironment: (input) => mutate((repo) => repo.createEnvironment(input)), addDeployment: (input) => mutate((repo) => repo.createDeployment(input)), addRunbook: (input) => mutate((repo) => repo.createRunbook(input)), deleteRecord: (table, id) => mutate((repo) => repo.deleteRecord(table, id)), markNotificationsRead: () => mutate((repo) => repo.markNotificationsRead()),
  }), [data, loading, error, refresh, mutate])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
export const useData = () => { const context = useContext(DataContext); if (!context) throw new Error('useData must be inside a mode-specific provider'); return context }
