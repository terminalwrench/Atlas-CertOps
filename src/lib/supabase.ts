import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const validateSupabaseEnvironment = (candidateUrl?: string, candidateKey?: string): string | null => !candidateUrl && !candidateKey ? 'Supabase is not configured.' : !candidateUrl ? 'VITE_SUPABASE_URL is missing.' : !candidateKey ? 'VITE_SUPABASE_PUBLISHABLE_KEY is missing.' : null
export const supabaseConfigurationError = validateSupabaseEnvironment(url, publishableKey)
export const isSupabaseConfigured = supabaseConfigurationError === null
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, publishableKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null
