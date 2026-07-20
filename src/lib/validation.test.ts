import { describe, expect, it } from 'vitest'
import { endpointInspectionSchema } from './validation'

describe('endpoint input', () => { it('accepts a public hostname and rejects URLs', () => { expect(endpointInspectionSchema.parse({ hostname: 'example.com', port: 443 })).toEqual({ hostname: 'example.com', port: 443 }); expect(endpointInspectionSchema.safeParse({ hostname: 'https://example.com' }).success).toBe(false) }) })
