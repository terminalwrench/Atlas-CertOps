import { X } from 'lucide-react'
import type { ReactNode } from 'react'
export function Modal({ title, onClose, children }: { title: string; onClose(): void; children: ReactNode }) { return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></header>{children}</div></div> }
