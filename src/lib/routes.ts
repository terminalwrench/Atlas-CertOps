import { useLocation } from 'react-router-dom'

export const modeFromPath = (pathname: string): 'demo' | 'production' => pathname === '/demo' || pathname.startsWith('/demo/') ? 'demo' : 'production'
export const providerForPath = (pathname: string): 'demo' | 'supabase' => modeFromPath(pathname) === 'demo' ? 'demo' : 'supabase'
export const appPath = (mode: 'demo' | 'production', path = '') => `${mode === 'demo' ? '/demo' : '/app'}${path}`
export function useAppPath() { const { pathname } = useLocation(); const mode = modeFromPath(pathname); return { mode, path: (suffix = '') => appPath(mode, suffix) } }
