import { Component, type ErrorInfo, type ReactNode } from 'react'

const RELOAD_KEY = 'atlas-chunk-recovery-at'
const RELOAD_COOLDOWN_MS = 30_000

export function isChunkLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /failed to fetch dynamically imported module|importing a module script failed|loading (css )?chunk|chunkloaderror/i.test(message)
}

interface State { error: Error | null }

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Atlas application render failure', error, info.componentStack)
    if (!isChunkLoadError(error)) return
    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return <main className="fatal-error-page"><div className="fatal-error-card"><span>ATLAS CERTOPS</span><h1>This page couldn’t be loaded.</h1><p>{isChunkLoadError(this.state.error) ? 'A newer Atlas release is available, but this browser still has an older application file. Reload to continue with the current version.' : 'Atlas encountered an unexpected interface error. Your certificate data was not changed.'}</p><div><button className="button primary" type="button" onClick={() => window.location.reload()}>Reload Atlas</button><a className="button secondary" href="/">Return home</a></div></div></main>
  }
}
