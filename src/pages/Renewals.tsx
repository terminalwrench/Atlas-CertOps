import { AlertTriangle, Check, ChevronDown, CircleAlert, Clock3, RotateCw, Server } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { WorkflowTimeline } from '../components/WorkflowTimeline'
import { useData } from '../context/DataContext'
import { daysUntil, formatDate, progressForTasks } from '../lib/domain'
import { useAppPath } from '../lib/routes'
import { workflowEvidence } from '../lib/workflow'

export function Renewals() {
  const data = useData()
  const { path } = useAppPath()
  const [showStart, setShowStart] = useState(false)
  const workflows = [...data.workflows].sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
  return <>
    <PageHeader eyebrow="Lifecycle operations" title="Renewal operations" description="A renewal stays open until every deployment target is updated and every required validation passes." actions={<button className="button primary" onClick={() => setShowStart(true)} disabled={data.certificates.length === 0} title={data.certificates.length === 0 ? 'Add a certificate before starting a renewal.' : undefined}><RotateCw size={16} /> Start renewal</button>} />
    <div className="queue-summary"><span><AlertTriangle /> Critical renewals <strong>{workflows.filter((workflow) => daysUntil(workflow.dueDate) <= 7 && workflow.status !== 'Completed').length}</strong></span><span><Clock3 /> Blocked tasks <strong>{data.tasks.filter((task) => task.status === 'Blocked').length}</strong></span><span><CircleAlert /> Failed validations <strong>{data.tasks.filter((task) => task.type === 'Validation' && (task.status === 'Failed' || task.validationResult === 'Failed')).length}</strong></span><span><Check /> Verified and closed <strong>{workflows.filter((workflow) => workflow.status === 'Completed').length}</strong></span></div>
    {workflows.length === 0 ? <EmptyState title="No renewals in progress" description="Start a renewal after adding a certificate and its deployment targets." /> : <div className="renewal-stack">{workflows.map((workflow) => {
      const certificate = data.certificates.find((item) => item.id === workflow.certificateId)
      if (!certificate) return null
      const customer = data.customers.find((item) => item.id === certificate.customerId)
      const tasks = data.tasks.filter((task) => task.workflowId === workflow.id)
      const evidence = workflowEvidence(workflow, tasks)
      const progress = progressForTasks(tasks)
      return <details className={`renewal-card ${evidence.blockers.length ? 'renewal-blocked' : ''}`} id={workflow.id} key={workflow.id} open>
        <summary><div className="urgency"><strong>{daysUntil(certificate.expiresAt)}</strong><span>days left</span></div><div className="grow"><h2>{certificate.commonName}</h2><p>{customer?.name} · {certificate.environment}</p><div className="tags"><StatusBadge>{evidence.currentState}</StatusBadge>{evidence.blockers.length > 0 && <StatusBadge>{`${evidence.blockers.length} Blocking`}</StatusBadge>}</div></div><div className="renewal-owner"><span>Current owner</span><strong>{evidence.currentOwner}</strong><small>Due {formatDate(workflow.dueDate)}</small></div><div className="renewal-progress"><div><span>{tasks.filter((task) => task.status === 'Completed').length}/{tasks.length} tasks</span><strong>{progress}%</strong></div><div className="progress"><i style={{ width: `${progress}%` }} /></div><small>{evidence.verified ? 'Validation passed' : 'Validation required for closure'}</small></div><ChevronDown /></summary>
        <div className="renewal-operations"><WorkflowTimeline workflow={workflow} tasks={tasks} /><div className="expanded-tasks"><div className="task-section-heading"><div><strong>Execution tasks</strong><span>Deployment completion does not close the renewal.</span></div><Link to={path(`/certificates/${certificate.id}`)}>Open certificate</Link></div>{tasks.map((task) => <div className="task-row" key={task.id}><span className={`task-check ${task.status === 'Completed' ? 'done' : task.status === 'Failed' || task.status === 'Blocked' ? 'failed' : ''}`}>{task.status === 'Completed' ? <Check size={14} /> : task.status === 'Failed' || task.status === 'Blocked' ? <CircleAlert size={14} /> : <Clock3 size={14} />}</span><div className="grow"><strong>{task.title}</strong><span>{task.type} · {task.method} · Owner {task.owner} · Due {formatDate(task.dueDate)}</span>{task.vendor && <small>External handoff: {task.vendor} · Ticket {task.ticketNumber ?? 'not recorded'}</small>}{task.deploymentId && <Link className="task-target-link" to={path(`/deployments/${task.deploymentId}`)}><Server size={12} /> Open deployment target</Link>}</div><StatusBadge>{task.type === 'Validation' && task.validationResult ? `${task.status} · ${task.validationResult}` : task.status}</StatusBadge>{['Pending', 'In Progress'].includes(task.status) && <button className="button tiny" onClick={() => void data.completeTask(task.id)}>Mark complete</button>}{task.status === 'Failed' && <button className="button tiny" onClick={() => void data.retryTask(task.id)}>Retry</button>}</div>)}</div></div>
      </details>
    })}</div>}
    {showStart && <StartRenewal onClose={() => setShowStart(false)} />}
  </>
}

function StartRenewal({ onClose }: { onClose(): void }) {
  const data = useData()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try { await data.startRenewal(String(new FormData(event.currentTarget).get('certificateId'))); onClose() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to start renewal.') }
    finally { setBusy(false) }
  }
  return <Modal title="Start certificate renewal" onClose={onClose}><form className="form-grid" onSubmit={submit}><div className="form-note">Atlas generates deployment and validation tasks from configured targets. It does not issue the certificate, and deployment alone never closes the renewal.</div><label className="full">Certificate<select name="certificateId" required>{data.certificates.map((certificate) => <option value={certificate.id} key={certificate.id}>{certificate.commonName} · {certificate.environment}</option>)}</select></label>{error && <p className="form-error full">{error}</p>}<div className="form-actions full"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Starting…' : 'Generate renewal tasks'}</button></div></form></Modal>
}
