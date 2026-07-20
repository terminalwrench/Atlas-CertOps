export type Role = 'owner' | 'admin' | 'operator' | 'viewer'
export type CertificateStatus = 'Healthy' | 'Expiring Soon' | 'Critical' | 'Expired' | 'Renewal In Progress' | 'Validation Failed'
export type WorkflowStatus = 'Upcoming' | 'Renewal Required' | 'Requested' | 'Issued' | 'Deployment In Progress' | 'Validation In Progress' | 'Completed' | 'Failed'
export type TaskStatus = 'Pending' | 'In Progress' | 'Blocked' | 'Completed' | 'Failed'
export type DeploymentMethod = 'Automated' | 'Manual' | 'Vendor Assisted' | 'External System'

export interface Organization { id: string; name: string; slug: string }
export interface Environment { id: string; customerId: string; name: string; kind: string }
export interface Customer { id: string; name: string; slug: string; industry: string; environments: string[] }
export interface Certificate {
  id: string; customerId: string; environment: string; commonName: string; sanNames: string[]; serialNumber: string; issuer: string; certificateAuthority: string; notBefore: string; expiresAt: string; fingerprint: string; renewalMethod: string; owner: string; ownerTeam: string; notes: string; statusOverride?: CertificateStatus
}
export interface Deployment { id: string; certificateId: string; name: string; type: string; hostname: string; environment: string; method: DeploymentMethod; owner: string; vendor?: string; vendorContact?: string; ticketNumber?: string; maintenanceWindow: string; automationStatus: string; validationMethod: string; lastDeployment?: string; lastValidation?: string; status: TaskStatus; dependencies: string[]; runbookId?: string }
export interface RenewalTask { id: string; workflowId: string; deploymentId?: string; title: string; type: 'Deployment' | 'Validation' | 'Vendor Handoff'; owner: string; status: TaskStatus; method: DeploymentMethod; instructions: string; dependencies: string[]; dueDate: string; completedAt?: string; validationResult?: 'Passed' | 'Failed'; vendor?: string; ticketNumber?: string }
export interface RenewalWorkflow { id: string; certificateId: string; status: WorkflowStatus; startedAt: string; dueDate: string; owner: string; taskIds: string[] }
export interface Runbook { id: string; deploymentId: string; title: string; description: string; steps: string[]; warnings: string[]; expectedValidation: string }
export interface ValidationCheck { id: string; certificateId: string; deploymentId: string; type: 'Automatic TLS' | 'Manual'; expected: string; actual: string; checkedAt: string; success: boolean }
export interface AuditEvent { id: string; action: string; entityType: string; entityId: string; actor: string; timestamp: string; metadata: string }
export interface Notification { id: string; title: string; message: string; severity: 'info' | 'warning' | 'critical'; read: boolean; createdAt: string }
export interface LiveCertificateMetadata { hostname: string; port: 443; commonName: string; sanNames: string[]; issuer: string; serialNumber: string; validFrom: string; expiresAt: string; fingerprint: string; tlsProtocol: string; inspectedAt: string }
export interface AtlasData { customers: Customer[]; environments: Environment[]; certificates: Certificate[]; deployments: Deployment[]; workflows: RenewalWorkflow[]; tasks: RenewalTask[]; runbooks: Runbook[]; validations: ValidationCheck[]; auditEvents: AuditEvent[]; notifications: Notification[] }
