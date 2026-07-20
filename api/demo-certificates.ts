import { promises as dns } from 'node:dns'
import { isIP } from 'node:net'
import * as tls from 'node:tls'
import type { DetailedPeerCertificate } from 'node:tls'
import type { IncomingMessage, ServerResponse } from 'node:http'

export const DEMO_TLS_ALLOWLIST = ['example.com', 'github.com', 'cloudflare.com', 'mozilla.org', 'wikipedia.org'] as const
const ALLOWED = new Set<string>(DEMO_TLS_ALLOWLIST)
const CACHE_TTL_MS = 10 * 60_000
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 12
const cache = new Map<string, { value: InspectionResult; expiresAt: number }>()
const requests = new Map<string, { count: number; resetsAt: number }>()

export interface InspectionResult { hostname: string; port: 443; commonName: string; sanNames: string[]; issuer: string; serialNumber: string; validFrom: string; expiresAt: string; fingerprint: string; tlsProtocol: string; inspectedAt: string }

function ipv4Number(address: string) { return address.split('.').reduce((value, part) => (value << 8) + Number(part), 0) >>> 0 }
function inCidr(address: string, base: string, bits: number) { const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0; return (ipv4Number(address) & mask) === (ipv4Number(base) & mask) }
export function isPublicAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 4) return ![['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4]].some(([base,bits]) => inCidr(address, String(base), Number(bits)))
  if (version === 6) { const normalized = address.toLowerCase(); if (normalized.startsWith('::ffff:')) return isPublicAddress(normalized.slice(7)); return !/^(::|::1|f[cd]|fe[89ab]|ff|2001:db8)/.test(normalized) }
  return false
}
export function isAllowedDemoTarget(hostname: string, port: number) { return port === 443 && ALLOWED.has(hostname.toLowerCase()) && isIP(hostname) === 0 }

async function resolvePublicAddress(hostname: string) { const addresses = await dns.lookup(hostname, { all: true, verbatim: true }); if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error('Target did not resolve exclusively to public addresses.'); return addresses[0] }
function issuerName(certificate: DetailedPeerCertificate) { return Object.entries(certificate.issuer ?? {}).map(([key, value]) => `${key}=${value}`).join(', ') }
function sans(certificate: DetailedPeerCertificate) { return (certificate.subjectaltname ?? '').split(/,\s*/).filter((value) => value.startsWith('DNS:')).map((value) => value.slice(4)) }
function firstValue(value: string | string[] | undefined, fallback = '') { return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback }

export async function inspectAllowlistedCertificate(hostname: string): Promise<InspectionResult> {
  if (!isAllowedDemoTarget(hostname, 443)) throw new Error('Target is not in the public demo allowlist.')
  const { address } = await resolvePublicAddress(hostname)
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: address, port: 443, servername: hostname, rejectUnauthorized: true }, () => {
      const certificate = socket.getPeerCertificate(true)
      if (!certificate || !certificate.valid_to) { socket.destroy(); reject(new Error('Peer certificate was unavailable.')); return }
      const result: InspectionResult = { hostname, port: 443, commonName: firstValue(certificate.subject?.CN, hostname), sanNames: sans(certificate), issuer: issuerName(certificate), serialNumber: certificate.serialNumber ?? '', validFrom: new Date(certificate.valid_from).toISOString(), expiresAt: new Date(certificate.valid_to).toISOString(), fingerprint: certificate.fingerprint256 ?? certificate.fingerprint ?? '', tlsProtocol: socket.getProtocol() ?? 'Unknown', inspectedAt: new Date().toISOString() }
      socket.end(); resolve(result)
    })
    socket.setTimeout(6_000, () => socket.destroy(new Error('TLS inspection timed out.')))
    socket.once('error', reject)
  })
}

async function cachedInspection(hostname: string, force: boolean) { const current = cache.get(hostname); if (!force && current && current.expiresAt > Date.now()) return { value: current.value, cached: true }; const value = await inspectAllowlistedCertificate(hostname); cache.set(hostname, { value, expiresAt: Date.now() + CACHE_TTL_MS }); return { value, cached: false } }
function rateLimited(key: string) { const now = Date.now(); const current = requests.get(key); if (!current || current.resetsAt <= now) { requests.set(key, { count: 1, resetsAt: now + RATE_WINDOW_MS }); return false } current.count += 1; return current.count > RATE_LIMIT }
function send(response: ServerResponse, status: number, body: unknown, cacheControl = 'no-store') { response.statusCode = status; response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', cacheControl); response.setHeader('X-Content-Type-Options', 'nosniff'); response.end(JSON.stringify(body)) }

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); send(response, 405, { error: 'Method not allowed.' }); return }
  const forwardedFor = request.headers['x-forwarded-for']
  const client = String(Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor ?? request.socket.remoteAddress ?? 'unknown').split(',')[0].trim()
  if (rateLimited(client)) { response.setHeader('Retry-After', '60'); send(response, 429, { error: 'Demo inspection rate limit exceeded.' }); return }
  const url = new URL(request.url ?? '/', 'https://atlas.invalid'); const requestedHost = url.searchParams.get('hostname')?.toLowerCase(); const port = Number(url.searchParams.get('port') ?? 443); const force = url.searchParams.get('refresh') === '1'
  if (requestedHost && !isAllowedDemoTarget(requestedHost, port)) { send(response, 400, { error: 'Only curated public demo endpoints on port 443 are available.' }); return }
  if (!requestedHost && port !== 443) { send(response, 400, { error: 'The public demo supports port 443 only.' }); return }
  const targets = requestedHost ? [requestedHost] : [...DEMO_TLS_ALLOWLIST]
  const settled = await Promise.allSettled(targets.map((hostname) => cachedInspection(hostname, force)))
  const items = settled.flatMap((result) => result.status === 'fulfilled' ? [result.value.value] : []); const errors = settled.flatMap((result, index) => result.status === 'rejected' ? [{ hostname: targets[index], error: 'Inspection temporarily unavailable.' }] : []); const servedFromCache = settled.some((result) => result.status === 'fulfilled' && result.value.cached)
  send(response, items.length ? 200 : 502, { items, errors, servedFromCache, inspectedAt: new Date().toISOString() }, force ? 'no-store' : 'public, max-age=60, s-maxage=300, stale-while-revalidate=300')
}
