import { Check, CircleAlert, Clock3, Minus } from 'lucide-react'
import { formatDate } from '../lib/domain'
import { workflowEvidence } from '../lib/workflow'
import type { RenewalTask, RenewalWorkflow } from '../types'

export function WorkflowTimeline({ workflow, tasks, compact = false }: { workflow: RenewalWorkflow; tasks: RenewalTask[]; compact?: boolean }) {
  const evidence = workflowEvidence(workflow, tasks)
  return <div className={compact ? 'workflow-evidence compact' : 'workflow-evidence'}>
    <div className="workflow-state-strip">
      <div><span>Current state</span><strong>{evidence.currentState}</strong></div>
      <div><span>Previous state</span><strong>{evidence.previousState}</strong></div>
      <div><span>Current owner</span><strong>{evidence.currentOwner}</strong></div>
      <div><span>Expected completion</span><strong>{formatDate(workflow.dueDate)}</strong></div>
      <div><span>Vendor / reference</span><strong>{evidence.vendor ? `${evidence.vendor}${evidence.ticketNumber ? ` · ${evidence.ticketNumber}` : ''}` : 'No vendor dependency'}</strong></div>
    </div>
    {!compact && <ol className="workflow-timeline" aria-label="Renewal lifecycle">
      {evidence.stages.map((stage) => <li className={`lifecycle-${stage.state}`} key={stage.key}><span className="lifecycle-marker">{stage.state === 'complete' ? <Check /> : stage.state === 'blocked' ? <CircleAlert /> : stage.state === 'not-applicable' ? <Minus /> : <Clock3 />}</span><div><strong>{stage.label}</strong><small>{stage.evidence}</small></div></li>)}
    </ol>}
    <div className={evidence.blockers.length ? 'workflow-proof blocked' : 'workflow-proof'}><div><span>Blocking issues</span><strong>{evidence.blockers.length ? evidence.blockers.join(' · ') : 'No blocking issues recorded'}</strong></div><div><span>Completion requirement</span><strong>{evidence.completionRequirement}</strong></div></div>
  </div>
}
