import type { ReactNode } from 'react'

export function StatusBadge({ children }: { children: ReactNode }) {
  const key = String(children).toLowerCase().replaceAll(' ', '-').replaceAll('/', '-')
  return <span className={`status status-${key}`}><span className="status-dot" />{children}</span>
}
