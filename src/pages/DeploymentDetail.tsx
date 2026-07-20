import { ArrowLeft, ArrowRight, BookOpen, Building2, CalendarClock, Server, ShieldCheck, User } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useData } from '../context/DataContext'
import { certificateStatus, formatDate } from '../lib/domain'
import { useAppPath } from '../lib/routes'

export function DeploymentDetail() {
  const { id } = useParams()
  const data = useData()
  const { path } = useAppPath()
  const deployment = data.deployments.find((item) => item.id === id)
  if (!deployment) return <EmptyState title="Deployment target not found" description="This target may have been removed or is outside your organization." />

  const certificate = data.certificates.find((item) => item.id === deployment.certificateId)
  const customer = certificate ? data.customers.find((item) => item.id === certificate.customerId) : undefined
  const validations = data.validations.filter((item) => item.deploymentId === deployment.id)
  const latestValidation = [...validations].sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())[0]
  const tasks = data.tasks.filter((item) => item.deploymentId === deployment.id)
  const workflowIds = new Set(tasks.map((item) => item.workflowId))
  const workflows = data.workflows.filter((item) => workflowIds.has(item.id))
  const currentWorkflow = workflows.find((item) => !['Completed', 'Failed'].includes(item.status)) ?? workflows[0]
  const runbook = data.runbooks.find((item) => item.deploymentId === deployment.id)
  const relatedIds = new Set([deployment.id, certificate?.id, ...tasks.map((item) => item.id)].filter(Boolean))
  const events = data.auditEvents.filter((item) => relatedIds.has(item.entityId))

  return <>
    <Link to={path('/deployments')} className="back-link"><ArrowLeft size={15} /> Deployment targets</Link>
    <PageHeader eyebrow={`${customer?.name ?? 'Unassigned customer'} / ${deployment.environment}`} title={deployment.name} description={`${deployment.type} · ${deployment.hostname}`} actions={<StatusBadge>{deployment.status}</StatusBadge>} />
    <section className="cert-hero deployment-hero">
      <div><StatusBadge>{deployment.method}</StatusBadge><h2>{deployment.automationStatus}</h2><p>{deployment.validationMethod} validation</p></div>
      <div className="hero-stat"><User /><span>Operational owner<strong>{deployment.owner}</strong><small>{certificate?.ownerTeam ?? 'Team not assigned'}</small></span></div>
      <div className="hero-stat"><CalendarClock /><span>Maintenance window<strong>{deployment.maintenanceWindow || 'Not recorded'}</strong><small>{deployment.lastDeployment ? `Last deployed ${formatDate(deployment.lastDeployment)}` : 'No deployment recorded'}</small></span></div>
      <div className="hero-stat"><ShieldCheck /><span>Last validation<strong>{latestValidation ? (latestValidation.success ? 'Passed' : 'Failed') : 'Not validated'}</strong><small>{latestValidation ? formatDate(latestValidation.checkedAt) : 'No checks recorded'}</small></span></div>
    </section>
    <div className="detail-grid">
      <section className="panel span-2"><div className="panel-heading"><div><h2>Certificates</h2><p>Certificate metadata currently associated with this target</p></div></div>{certificate ? <Link className="simple-row" to={path(`/certificates/${certificate.id}`)}><div className="system-icon"><Server size={18} /></div><div className="grow"><strong>{certificate.commonName}</strong><span>{certificate.sanNames[0] ?? deployment.hostname} · Expires {formatDate(certificate.expiresAt)}</span></div><StatusBadge>{certificateStatus(certificate)}</StatusBadge><ArrowRight size={15} /></Link> : <EmptyState title="No associated certificate" description="Associate certificate metadata with this deployment target to track replacement state." />}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Target overview</h2><p>Location and deployment controls</p></div></div><dl className="metadata"><dt>Type</dt><dd>{deployment.type}</dd><dt>Hostname / reference</dt><dd className="mono">{deployment.hostname}</dd><dt>Environment</dt><dd>{deployment.environment}</dd><dt>Method</dt><dd>{deployment.method}</dd><dt>Maintenance window</dt><dd>{deployment.maintenanceWindow || 'Not recorded'}</dd><dt>Dependencies</dt><dd>{deployment.dependencies.join(', ') || 'None recorded'}</dd></dl></section>
      <section className="panel"><div className="panel-heading"><div><h2>Ownership</h2><p>Accountability and external handoff</p></div></div><dl className="metadata"><dt>Owner</dt><dd>{deployment.owner}</dd><dt>Responsible team</dt><dd>{certificate?.ownerTeam ?? 'Not assigned'}</dd><dt>Vendor</dt><dd>{deployment.vendor ?? 'Not applicable'}</dd><dt>Vendor contact</dt><dd>{deployment.vendorContact ?? 'Not recorded'}</dd><dt>Ticket / reference</dt><dd>{deployment.ticketNumber ?? tasks.find((item) => item.ticketNumber)?.ticketNumber ?? 'Not recorded'}</dd><dt>Due date</dt><dd>{tasks[0] ? formatDate(tasks[0].dueDate) : 'No active task'}</dd></dl>{customer && <Link className="related-object-link" to={path(`/customers/${customer.id}`)}><Building2 size={15} /> Open {customer.name} <ArrowRight size={14} /></Link>}</section>
      <section className="panel span-2"><div className="panel-heading"><div><h2>Operational state</h2><p>Deployment, renewal, and validation status</p></div>{currentWorkflow && <StatusBadge>{currentWorkflow.status}</StatusBadge>}</div><div className="operational-facts"><div><span>Last deployment</span><strong>{deployment.lastDeployment ? formatDate(deployment.lastDeployment) : 'Never'}</strong></div><div><span>Last validation</span><strong>{deployment.lastValidation ? formatDate(deployment.lastValidation) : 'Never'}</strong></div><div><span>Validation result</span><strong className={latestValidation && !latestValidation.success ? 'text-danger' : ''}>{latestValidation ? (latestValidation.success ? 'Passed' : 'Failed') : 'Not checked'}</strong></div><div><span>Workflow</span><strong>{currentWorkflow?.status ?? 'No renewal workflow'}</strong></div></div>{latestValidation && <div className={`validation-row ${latestValidation.success ? '' : 'validation-failed'}`}><div className={latestValidation.success ? 'validation-icon success' : 'validation-icon failure'}><ShieldCheck size={17} /></div><div className="grow"><strong>{latestValidation.type} · {latestValidation.success ? 'Passed' : 'Failed'}</strong><span>Expected: {latestValidation.expected}</span><small>Observed: {latestValidation.actual}</small></div><time>{formatDate(latestValidation.checkedAt)}</time></div>}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Runbook</h2><p>Target-specific operating procedure</p></div></div>{runbook ? <Link className="runbook-link" to={path('/runbooks')}><div><strong>{runbook.title}</strong><span>{runbook.steps.length} ordered steps · {runbook.warnings.length} warnings</span></div><BookOpen size={15} /></Link> : <p className="muted">No runbook is associated with this target.</p>}</section>
      <section className="panel span-2"><div className="panel-heading"><div><h2>Activity</h2><p>Relevant append-oriented audit history</p></div><Link to={path('/activity')}>View all activity</Link></div>{events.length ? events.map((event) => <div className="mini-event" key={event.id}><span /><div><strong>{event.action.replaceAll('.', ' ')}</strong><p>{event.metadata}</p><small>{event.actor} · {formatDate(event.timestamp)}</small></div></div>) : <p className="muted">No activity has been recorded for this target.</p>}</section>
    </div>
  </>
}
