import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? ''
const cors = { 'Access-Control-Allow-Origin': allowedOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const hostnamePattern = /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const forbiddenHostname = /(^localhost$)|(^.*\.(local|internal|localhost|home|lan)$)/i

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors })
  const authorization = request.headers.get('Authorization')
  if (!authorization) return Response.json({ error: 'Authentication required' }, { status: 401, headers: cors })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL'); const publishableKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !publishableKey) throw new Error('Function environment is incomplete')
    const client = createClient(supabaseUrl, publishableKey, { global: { headers: { Authorization: authorization } } })
    const { data: authData, error: authError } = await client.auth.getUser()
    if (authError || !authData.user) return Response.json({ error: 'Invalid authenticated session' }, { status: 401, headers: cors })

    const body = await request.json()
    const hostname = String(body.hostname ?? '').trim().toLowerCase(); const port = Number(body.port ?? 443)
    const organizationId = String(body.organizationId ?? ''); const customerId = String(body.customerId ?? ''); const environmentId = String(body.environmentId ?? '')
    if (body.authorizationAcknowledged !== true) return Response.json({ error: 'Endpoint management authorization must be acknowledged' }, { status: 400, headers: cors })
    if (!hostnamePattern.test(hostname) || forbiddenHostname.test(hostname) || !Number.isInteger(port) || port < 1 || port > 65535) return Response.json({ error: 'A valid public hostname and TCP port are required' }, { status: 400, headers: cors })
    if (![organizationId, customerId, environmentId].every((value) => uuidPattern.test(value))) return Response.json({ error: 'Organization, customer, and environment context are required' }, { status: 400, headers: cors })

    const { data: membership } = await client.from('organization_members').select('role').eq('organization_id', organizationId).eq('user_id', authData.user.id).maybeSingle()
    if (!membership || !['owner', 'admin', 'operator'].includes(membership.role)) return Response.json({ error: 'Organization operator permission required' }, { status: 403, headers: cors })
    const [{ data: customer }, { data: environment }] = await Promise.all([
      client.from('customers').select('id').eq('id', customerId).eq('organization_id', organizationId).maybeSingle(),
      client.from('environments').select('id').eq('id', environmentId).eq('customer_id', customerId).eq('organization_id', organizationId).maybeSingle(),
    ])
    if (!customer || !environment) return Response.json({ error: 'Customer or environment is outside the authenticated organization' }, { status: 403, headers: cors })

    const { error: auditError } = await client.from('audit_events').insert({ organization_id: organizationId, actor_user_id: authData.user.id, action: 'endpoint_inspection.requested', entity_type: 'environment', entity_id: environmentId, metadata: { hostname, port, authorizationAcknowledged: true, outcome: 'worker_required' } })
    if (auditError) throw auditError
    return Response.json({ error: 'Certificate inspection requires the hardened Node inspection worker. The authorized request was audited but no network connection was attempted.' }, { status: 501, headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch {
    return Response.json({ error: 'Endpoint inspection request could not be processed' }, { status: 500, headers: cors })
  }
})
