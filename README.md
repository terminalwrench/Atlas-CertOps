# Atlas CertOps

Certificate lifecycle operations and deployment orchestration for MSPs and lean infrastructure teams.

Atlas CertOps tracks the operational last mile after a certificate is issued: where it is deployed, who owns each target, how replacement happens, which handoffs are blocked, and whether every required validation passed. It complements CAs and PKI platforms; it does not issue certificates, hold private keys, or act as a general-purpose vault.

## MVP capabilities

- Premium responsive operations dashboard focused on imminent risk
- Searchable/filterable certificate inventory with derived expiration health
- Certificate detail views with metadata, deployments, runbooks, validations, workflows, and audit history
- Urgency-sorted renewal queue with deployment, validation, and vendor-handoff tasks
- Interactive demo task completion, retry, manual certificate entry, notification state, and audit events
- MSP customer estate, deployment target inventory, runbooks, activity, integrations, and settings views
- Explicit demo mode when Supabase is not configured
- Supabase Auth session persistence and protected routes when configured
- Multi-tenant PostgreSQL schema, role-aware RLS, composite tenant foreign keys, append-oriented audit events, plan limits, and an atomic renewal completion guard
- Authenticated, bounded endpoint-reachability Edge Function with input validation and SSRF safeguards

## Architecture

Atlas is one React 19 + Vite + TypeScript web application. `AuthContext` isolates authentication, and `DataContext` is the application-facing data boundary. The current demo provider supplies operational sample data and in-memory mutations; production Supabase access can be implemented behind the same boundary without changing pages.

PostgreSQL is the authoritative production data store. Every operational record is scoped by `organization_id`; Supabase RLS checks organization membership and role. Owner/Admin manage inventory and configuration, Operator may execute workflows and validations, and Viewer is read-only. Database policies—not UI affordances—are the security boundary.

No table accepts certificate private keys. Future secret-bearing integrations should resolve external secret references through a trusted server-side adapter.

## Local development

Requirements: Node.js 20+ and pnpm 9+.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`. With no environment variables, Atlas clearly identifies itself as a demo workspace and loads realistic sample customers, expiration states, an active renewal, a vendor block, and a failed validation.

### Commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Supabase setup

1. Create a Supabase project.
2. Apply `supabase/migrations/202607190001_initial_schema.sql` with the Supabase CLI (`supabase db push`) or SQL editor.
3. Configure allowed authentication URLs and create the first user.
4. Through a trusted administrative session, create an organization and its initial `owner` membership. Do not expose service-role credentials to the browser.
5. Copy `.env.example` to `.env.local` and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Both values must be present to leave demo mode. Partial configuration is treated as demo mode, never as an ambiguous production fallback.

The migration creates the data model, indexes, role functions, RLS policies, update triggers, central plan limits, and `complete_renewal()` guard. Validate it against a staging Supabase project before production deployment.

### Endpoint inspection

`supabase/functions/inspect-tls/index.ts` is an authenticated Edge Function boundary. Deploy it with `supabase functions deploy inspect-tls`, set `ALLOWED_ORIGIN` to the exact application origin, and add platform rate limiting. It accepts only a hostname and port, rejects obvious private/local targets, follows no redirects, and times out quickly.

Supabase Edge Functions cannot expose the peer X.509 certificate, so the current function reports bounded TLS reachability rather than full certificate metadata. A production certificate inspector should be a hardened server-side worker with DNS resolution pinning, private-range checks after resolution, egress controls, request quotas, and explicit scan authorization. This limitation is deliberate; the function must not become an SSRF proxy.

## Data model

The hierarchy is `organizations → customers → environments → certificates → certificate_deployments`. Renewal workflows own ordered/dependent tasks; validations are attached to certificates and targets; runbooks hold structured public operating instructions; notifications and integrations remain tenant scoped. Composite foreign keys ensure a child cannot reference an entity from another tenant even before RLS is evaluated.

Expiration thresholds default to 30 days for warning and 7 days for critical and are organization-configurable in the schema. Subscription limits are centralized in `plan_limits` (Free 10, Pro 100, Team 500, Business 2,500) rather than scattered through feature code.

## Testing and production build

Vitest covers expiration boundaries, role permissions, renewal completion/validation handling, and endpoint input validation. CI should run:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Build output is emitted to `dist/` and can be deployed to any static host with SPA fallback to `index.html`. Provide only the public Supabase URL and anon key at build time. Never expose a service-role key.

## Security

See [docs/SECURITY.md](docs/SECURITY.md) for the threat model and deployment assumptions. Production readiness requires staging RLS tests using multiple real Auth users, exact CORS origins, function rate limiting, security headers at the CDN, monitored audit export, and a trusted bootstrap path for the first owner.

## Known limitations

- The UI currently uses the explicit demo provider; production CRUD mapping behind the provider boundary is the next credential-dependent step.
- Full TLS certificate extraction is not available in the Supabase Edge runtime; the checked-in function safely reports reachability only.
- External CA, cloud, appliance, email, Slack/Teams, billing, SSO, and secret-manager integrations require provider credentials and are represented as extension points.
- Automated private-network discovery requires a separately deployed, customer-authorized collector and is intentionally outside V1.

## Roadmap

Near-term work is a Supabase-backed provider, invitation/bootstrap flow, hardened certificate-inspection worker, scheduled expiration evaluation, in-app notification generation, and first metadata-only CA/cloud adapters. Later work may add SAML/OIDC, collectors, webhooks, and billing without changing the private-key custody boundary.
