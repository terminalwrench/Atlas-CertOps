import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('public metadata', () => {
  it('uses the canonical production URL and contains no stale preview hostname', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain('<link rel="canonical" href="https://atlas-cert-ops.vercel.app/"')
    expect(html).toContain('<meta property="og:url" content="https://atlas-cert-ops.vercel.app/"')
    expect(html).not.toContain('atlas-else.pplx.app')
  })
})
