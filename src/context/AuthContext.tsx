import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Role } from '../types'

interface AuthState { user: User | null; session: Session | null; loading: boolean; isDemo: boolean; role: Role; signIn(email: string, password: string): Promise<void>; signOut(): Promise<void> }
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])
  const value = useMemo<AuthState>(() => ({
    user: session?.user ?? (isSupabaseConfigured ? null : ({ id: 'demo-user', email: 'operator@demo.atlascertops.com', user_metadata: { full_name: 'Alex Morgan' } } as unknown as User)),
    session, loading, isDemo: !isSupabaseConfigured, role: isSupabaseConfigured ? 'viewer' : 'owner',
    async signIn(email, password) { if (!supabase) return; const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error },
    async signOut() { if (supabase) await supabase.auth.signOut() },
  }), [session, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be inside AuthProvider'); return context }
