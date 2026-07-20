import { ChevronUp, LogOut, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import type { Role } from '../types'

interface AccountMenuProps { name: string; email: string; role: Role; onSignOut(): Promise<void> }

export function AccountMenu({ name, email, role, onSignOut }: AccountMenuProps) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const root = useRef<HTMLDivElement>(null); const menuId = useId()
  useEffect(() => { if (!open) return; const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }; const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }; document.addEventListener('pointerdown', close); document.addEventListener('keydown', escape); return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) } }, [open])
  async function signOut() { setBusy(true); setError(''); try { await onSignOut() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign out.'); setBusy(false) } }
  const initials = (name || email).split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <div className="account-menu" ref={root}><button className="account-trigger" type="button" aria-label="Account menu" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)}><span className="avatar">{initials}</span><span className="account-trigger-copy"><strong>{name || email}</strong><span>{role} role</span></span><ChevronUp size={15} className={open ? '' : 'account-chevron-closed'} /></button>{open && <div className="account-popover" id={menuId} role="menu" aria-label="Account"><div className="account-identity"><UserRound size={16} /><div><strong>{name || 'Signed-in user'}</strong><span>{email}</span><small>{role} · Production organization</small></div></div><button role="menuitem" type="button" onClick={() => void signOut()} disabled={busy}><LogOut size={15} />{busy ? 'Signing out…' : 'Sign out'}</button>{error && <p role="alert">{error}</p>}</div>}</div>
}
