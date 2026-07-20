import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const publicHostname = /^(?=.{1,253}$)(?!-)[a-z0-9.-]+(?<!-)$/i
const forbidden = /(^localhost$)|(^.*\.local$)|(^.*\.internal$)|(^0\.)|(^10\.)|(^127\.)|(^169\.254\.)|(^172\.(1[6-9]|2\d|3[01])\.)|(^192\.168\.)|(^::1$)|(^fc)|(^fd)|(^fe80)/i

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors })
  try {
    const auth = request.headers.get('Authorization')
    if (!auth) return Response.json({ error: 'Authentication required' }, { status: 401, headers: cors })
    const { hostname, port = 443 } = await request.json()
    const host = String(hostname ?? '').trim().toLowerCase()
    const parsedPort = Number(port)
    if (!publicHostname.test(host) || forbidden.test(host) || !Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) return Response.json({ error: 'Only valid public hostnames and TCP ports are accepted' }, { status: 400, headers: cors })
    // Deno Deploy/Supabase Edge Functions do not expose the peer TLS certificate.
    // This bounded reachability check is an adapter boundary for a future dedicated validator.
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(`https://${host}:${parsedPort}/`, { method: 'HEAD', redirect: 'manual', signal: controller.signal })
    clearTimeout(timeout)
    return Response.json({ hostname: host, port: parsedPort, reachable: true, httpStatus: response.status, inspectedAt: new Date().toISOString(), limitation: 'Edge runtime confirms TLS reachability but does not expose peer certificate metadata.' }, { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (error) { return Response.json({ error: error instanceof Error && error.name === 'AbortError' ? 'Endpoint inspection timed out' : 'Endpoint inspection failed' }, { status: 502, headers: cors }) }
})
