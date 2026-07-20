import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, supabaseConfigurationError } from '../lib/supabase'
import type { Organization, Role } from '../types'

interface Membership { organization: Organization; role: Role; displayName: string | null }
interface AuthState {
  user: User | null; session: Session | null; loading: boolean; membershipLoading: boolean; membership: Membership | null; membershipError: string | null; configurationError: string | null
  signIn(email: string, password: string): Promise<void>; signUp(email: string, password: string, fullName: string): Promise<{ confirmationRequired: boolean }>
  signOut(): Promise<void>; bootstrapOrganization(name: string): Promise<void>; refreshMembership(): Promise<void>
}
const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [membershipError, setMembershipError] = useState<string | null>(null)

  const refreshMembership = useCallback(async () => {
    if (!supabase) { setMembership(null); return }
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { setMembership(null); return }
    setMembershipLoading(true)
    setMembershipError(null)
    try {
      const { data: member, error } = await supabase.from('organization_members').select('organization_id, role, display_name').eq('user_id', authData.user.id).maybeSingle()
      if (error) throw error
      if (!member) { setMembership(null); return }
      const { data: organization, error: organizationError } = await supabase.from('organizations').select('id, name, slug').eq('id', member.organization_id).single()
      if (organizationError) throw organizationError
      setMembership({ organization: organization as Organization, role: member.role as Role, displayName: member.display_name as string | null })
    } catch (cause) {
      setMembership(null); setMembershipError(cause instanceof Error ? cause.message : 'Unable to resolve organization membership.')
    } finally { setMembershipLoading(false) }
  }, [])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    void supabase.auth.getSession().then(({ data, error }) => { if (!error) setSession(data.session); setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); if (!next) setMembership(null) })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (session?.user) void refreshMembership() }, [session?.user, refreshMembership])

  const value = useMemo<AuthState>(() => ({
    user: session?.user ?? null, session, loading, membershipLoading, membership, membershipError, configurationError: supabaseConfigurationError,
    async signIn(email, password) { if (!supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is unavailable.'); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error },
    async signUp(email, password, fullName) { if (!supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is unavailable.'); const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/app` } }); if (error) throw error; return { confirmationRequired: !data.session } },
    async signOut() { if (!supabase) return; const { error } = await supabase.auth.signOut(); if (error) throw error },
    async bootstrapOrganization(name) { if (!supabase) throw new Error('Supabase is unavailable.'); const { error } = await supabase.rpc('bootstrap_organization', { organization_name: name }); if (error) throw error; await refreshMembership() },
    refreshMembership,
  }), [session, loading, membershipLoading, membership, membershipError, refreshMembership])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth = () => { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be inside AuthProvider'); return context }
