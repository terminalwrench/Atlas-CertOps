import type { RenewalTask, RenewalWorkflow } from '../types'

export type LifecycleStageState = 'complete' | 'current' | 'blocked' | 'pending' | 'not-applicable'
export interface LifecycleStage { key: string; label: string; state: LifecycleStageState; evidence: string }

const complete = (tasks: RenewalTask[]) => tasks.length > 0 && tasks.every((task) => task.status === 'Completed')
const validationPassed = (tasks: RenewalTask[]) => tasks.length > 0 && tasks.every((task) => task.status === 'Completed' && task.validationResult === 'Passed')

export function workflowEvidence(workflow: RenewalWorkflow, tasks: RenewalTask[]) {
  const vendorTasks = tasks.filter((task) => task.type === 'Vendor Handoff')
  const deploymentTasks = tasks.filter((task) => task.type === 'Deployment' || task.type === 'Vendor Handoff')
  const validationTasks = tasks.filter((task) => task.type === 'Validation')
  const vendorBlocked = vendorTasks.some((task) => task.status === 'Blocked')
  const failedValidation = validationTasks.some((task) => task.status === 'Failed' || task.validationResult === 'Failed')
  const failedTask = tasks.find((task) => task.status === 'Failed')
  const deploymentComplete = complete(deploymentTasks)
  const verified = validationPassed(validationTasks)
  const closed = workflow.status === 'Completed' && verified

  let currentState = 'Assigned'
  let currentOwner = workflow.owner
  if (closed) currentState = 'Closed'
  else if (failedValidation) currentState = 'Validation Failed'
  else if (vendorBlocked) currentState = 'Vendor Waiting'
  else if (failedTask) currentState = 'Blocked'
  else if (verified) currentState = 'Verified — Closure Pending'
  else if (deploymentComplete && validationTasks.length) currentState = 'Validation Pending'
  else if (deploymentTasks.some((task) => task.status !== 'Pending')) currentState = 'Deployment In Progress'

  const activeTask = failedValidation
    ? validationTasks.find((task) => task.status === 'Failed' || task.validationResult === 'Failed')
    : vendorBlocked
      ? vendorTasks.find((task) => task.status === 'Blocked')
      : tasks.find((task) => task.status === 'In Progress') ?? tasks.find((task) => task.status === 'Pending')
  if (activeTask?.owner) currentOwner = activeTask.owner

  const blockers = tasks.filter((task) => task.status === 'Blocked' || task.status === 'Failed').map((task) => task.vendor ? `${task.title} — ${task.vendor}${task.ticketNumber ? ` · ${task.ticketNumber}` : ''}` : task.title)
  const completedStages = ['Discovered', 'Assigned']
  if (tasks.some((task) => task.status !== 'Pending')) completedStages.push('In Progress')
  if (vendorTasks.length && complete(vendorTasks)) completedStages.push('Vendor Handoff')
  if (deploymentComplete) completedStages.push('Deployment')
  if (verified) completedStages.push('Validation', 'Verified')
  if (closed) completedStages.push('Closed')

  const stages: LifecycleStage[] = [
    { key: 'discovered', label: 'Discovered', state: 'complete', evidence: 'Certificate and targets mapped' },
    { key: 'assigned', label: 'Assigned', state: 'complete', evidence: workflow.owner },
    { key: 'in-progress', label: 'In Progress', state: tasks.some((task) => task.status !== 'Pending') ? 'complete' : 'current', evidence: `${tasks.filter((task) => task.status === 'Completed').length}/${tasks.length} tasks complete` },
    { key: 'vendor', label: 'Vendor Handoff', state: !vendorTasks.length ? 'not-applicable' : vendorBlocked ? 'blocked' : complete(vendorTasks) ? 'complete' : 'current', evidence: !vendorTasks.length ? 'Not required' : vendorBlocked ? 'Waiting on external party' : complete(vendorTasks) ? 'Handoff complete' : 'Handoff open' },
    { key: 'deployment', label: 'Deployment', state: failedTask && !failedValidation ? 'blocked' : deploymentComplete ? 'complete' : vendorBlocked ? 'pending' : 'current', evidence: `${deploymentTasks.filter((task) => task.status === 'Completed').length}/${deploymentTasks.length} targets updated` },
    { key: 'validation', label: 'Validation', state: failedValidation ? 'blocked' : verified ? 'complete' : deploymentComplete ? 'current' : 'pending', evidence: failedValidation ? 'Observed state does not match expected' : verified ? 'All required checks passed' : 'Required before closure' },
    { key: 'verified', label: 'Verified', state: verified ? 'complete' : failedValidation ? 'blocked' : 'pending', evidence: verified ? 'Replacement proven on every target' : 'Awaiting successful validation' },
    { key: 'closed', label: 'Closed', state: closed ? 'complete' : workflow.status === 'Failed' ? 'blocked' : 'pending', evidence: closed ? 'Renewal complete' : 'Cannot close until verified' },
  ]

  return {
    stages,
    currentState,
    previousState: completedStages.at(-1) ?? 'Discovered',
    currentOwner,
    activeTask,
    blockers,
    vendor: activeTask?.vendor ?? vendorTasks.find((task) => task.vendor)?.vendor,
    ticketNumber: activeTask?.ticketNumber ?? vendorTasks.find((task) => task.ticketNumber)?.ticketNumber,
    verified,
    closed,
    completionRequirement: verified ? 'All required deployment validations passed.' : 'Every deployment target must be updated and every required validation must pass.',
  }
}
