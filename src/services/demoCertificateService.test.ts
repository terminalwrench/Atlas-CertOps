import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchDemoCertificates, readCachedDemoCertificates } from './demoCertificateService'

const certificate = {
  hostname: 'github.com',
  port: 443 as const,
  commonName: 'github.com',
  sanNames: ['github.com'],
  issuer: 'CN=Public CA',
  serialNumber: '01',
  validFrom: '2026-01-01T00:00:00.000Z',
  expiresAt: '2027-01-01T00:00:00.000Z',
  fingerprint: 'AA:BB',
  tlsProtocol: 'TLSv1.3',
  inspectedAt: '2026-07-19T20:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('demo certificate service', () => {
  it('requests the isolated demo endpoint and caches a valid response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [certificate], inspectedAt: certificate.inspectedAt }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchDemoCertificates(true)).resolves.toEqual({ items: [certificate], refreshedAt: certificate.inspectedAt })
    expect(fetchMock).toHaveBeenCalledWith('/api/demo-certificates?refresh=1', { headers: { Accept: 'application/json' } })
    expect(readCachedDemoCertificates()).toEqual({ items: [certificate], refreshedAt: certificate.inspectedAt })
  })

  it('rejects invalid or rate-limited responses with a user-facing error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })))
    await expect(fetchDemoCertificates()).rejects.toThrow('Refresh limit reached')
  })

  it('does not expose a non-JSON hosting response to the demo UI', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('server source', { status: 200 })))
    await expect(fetchDemoCertificates()).rejects.toThrow('temporarily unavailable')
  })
})
