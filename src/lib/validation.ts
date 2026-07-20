import { z } from 'zod'

export const endpointInspectionSchema = z.object({
  hostname: z.string().trim().min(1).max(253).toLowerCase().refine((host) => !host.includes('://'), 'Enter a hostname without a protocol').refine((host) => /^(?=.{1,253}$)(?!-)[a-z0-9.-]+(?<!-)$/.test(host), 'Enter a valid public hostname'),
  port: z.coerce.number().int().min(1).max(65535).default(443),
})

export const certificateInputSchema = z.object({ commonName: z.string().trim().min(1).max(253), customerId: z.string().min(1), environment: z.string().min(1), expiresAt: z.string().datetime(), issuer: z.string().trim().min(1), renewalMethod: z.string().trim().min(1) })
