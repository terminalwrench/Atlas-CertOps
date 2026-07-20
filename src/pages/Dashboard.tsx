import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, KeyRound, ShieldAlert, TimerOff, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { useData } from '../context/DataContext'
import { certificateStatus, daysUntil, formatDate, progressForTasks } from '../lib/domain'
import { useAppPath } from '../lib/routes'

export function Dashboard() {
  const data = useData()
  const { path } = useAppPath()
  const count = (status: string) => data.certificates.filter((cert) => certificateStatus(cert) === status).length
  const active = data.workflows.filter((workflow) => !['Completed'].includes(workflow.status))
  const vendorBlocked = data.tasks.filter((task) => task.type === 'Vendor Handoff' && task.status === 'Blocked')
  const needsAttention = data.certificates.filter((cert) => ['Critical', 'Expired', 'Validation Failed'].includes(certificateStatus(cert))).sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt))
  return <>
    <PageHeader eyebrow="Operations overview" title="Good morning, Alex." description="Here’s what can expire or break next across your managed estate." actions={<><button className="button secondary">Export report</button><Link className="button primary" to={path('/certificates')}>Add certificate</Link></>} />
    <section className="metric-grid">
      <Metric icon={<KeyRound />} label="Certificates monitored" value={data.certificates.length} sub="Across 3 customers" />
      <Metric icon={<Clock3 />} label="Expiring within 30 days" value={data.certificates.filter((cert) => { const days = daysUntil(cert.expiresAt); return days >= 0 && days <= 30 }).length} sub="Requires planning" tone="warning" />
      <Metric icon={<ShieldAlert />} label="Critical within 7 days" value={count('Critical') + count('Renewal In Progress')} sub="Immediate action" tone="critical" />
      <Metric icon={<TimerOff />} label="Expired" value={count('Expired') + count('Validation Failed')} sub="Service risk" tone="critical" />
      <Metric icon={<Users />} label="Vendor blocked" value={vendorBlocked.length} sub="External dependency" tone="warning" />
      <Metric icon={<AlertTriangle />} label="Failed validations" value={data.validations.filter((v) => !v.success).length} sub="Deployment incomplete" tone="critical" />
    </section>
    <div className="dashboard-grid">
      <section className="panel span-2"><div className="panel-heading"><div><h2>Needs attention</h2><p>Ordered by operational risk</p></div><Link to={path('/certificates')}>View inventory <ArrowRight size={14} /></Link></div><div className="attention-list">{needsAttention.map((cert) => { const customer = data.customers.find((item) => item.id === cert.customerId); return <Link className="attention-item" to={path(`/certificates/${cert.id}`)} key={cert.id}><div className="severity-icon"><AlertTriangle size={17} /></div><div className="grow"><strong>{cert.commonName}</strong><span>{customer?.name} · {cert.environment}</span></div><div className="expiry"><strong>{daysUntil(cert.expiresAt)}d</strong><span>{formatDate(cert.expiresAt)}</span></div><StatusBadge>{certificateStatus(cert)}</StatusBadge><ArrowRight size={15} /></Link> })}</div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Vendor blocked</h2><p>Waiting on external parties</p></div></div>{vendorBlocked.map((task) => <div className="vendor-card" key={task.id}><div><StatusBadge>{task.status}</StatusBadge><span className="ticket">{task.ticketNumber}</span></div><h3>{task.title}</h3><p>{task.vendor}</p><div className="vendor-footer"><span>Due {formatDate(task.dueDate)}</span><Link to={path('/renewals')}>Open task</Link></div></div>)}</section>
      <section className="panel span-2"><div className="panel-heading"><div><h2>Renewals in progress</h2><p>Deployment completion by workflow</p></div><Link to={path('/renewals')}>Open queue <ArrowRight size={14} /></Link></div><div className="workflow-list">{active.map((workflow) => { const cert = data.certificates.find((item) => item.id === workflow.certificateId)!; const tasks = data.tasks.filter((task) => task.workflowId === workflow.id); const progress = progressForTasks(tasks); return <Link to={path(`/certificates/${cert.id}`)} className="workflow-row" key={workflow.id}><div className="grow"><strong>{cert.commonName}</strong><span>{data.customers.find((c) => c.id === cert.customerId)?.name} · Owner {workflow.owner}</span></div><StatusBadge>{workflow.status}</StatusBadge><div className="progress-wrap"><div><span>{tasks.filter((t) => t.status === 'Completed').length}/{tasks.length} tasks</span><strong>{progress}%</strong></div><div className="progress"><i style={{ width: `${progress}%` }} /></div></div></Link> })}</div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest operational changes</p></div><Link to={path('/activity')}>View all</Link></div><div className="timeline">{data.auditEvents.slice(0, 4).map((event) => <div key={event.id}><span className={event.action.includes('failed') ? 'event-dot danger' : 'event-dot'}>{event.action.includes('completed') ? <CheckCircle2 size={12} /> : ''}</span><p><strong>{event.action.replaceAll('.', ' ')}</strong>{event.metadata}</p><time>{formatDate(event.timestamp)}</time></div>)}</div></section>
    </div>
  </>
}

function Metric({ icon, label, value, sub, tone = '' }: { icon: React.ReactNode; label: string; value: number; sub: string; tone?: string }) { return <div className={`metric ${tone}`}><div className="metric-top"><span>{icon}</span><small>LIVE</small></div><strong>{value}</strong><h3>{label}</h3><p>{sub}</p></div> }
