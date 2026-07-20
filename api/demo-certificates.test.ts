// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { DEMO_TLS_ALLOWLIST, isAllowedDemoTarget, isPublicAddress } from './demo-certificates'

describe('curated TLS inspection boundary', () => {
  it('accepts only allowlisted hostnames on port 443', () => { expect(DEMO_TLS_ALLOWLIST.length).toBeGreaterThan(2); expect(isAllowedDemoTarget('github.com', 443)).toBe(true); expect(isAllowedDemoTarget('github.com', 8443)).toBe(false); expect(isAllowedDemoTarget('internal.example', 443)).toBe(false); expect(isAllowedDemoTarget('127.0.0.1', 443)).toBe(false) })
  it('rejects private, loopback, link-local, documentation, and reserved addresses', () => { for (const address of ['10.0.0.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','192.0.2.1','198.51.100.2','203.0.113.2','::1','fd00::1','fe80::1','2001:db8::1']) expect(isPublicAddress(address), address).toBe(false); expect(isPublicAddress('1.1.1.1')).toBe(true); expect(isPublicAddress('2606:4700:4700::1111')).toBe(true) })
})
