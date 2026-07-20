# Atlas CertOps

Certificate lifecycle operations and deployment orchestration for MSPs and lean infrastructure teams. Atlas tracks the operational last mile after issuance: every deployment location, owner, renewal task, external handoff, and validation result. It complements PKI platforms and never issues certificates or stores private keys.

## Operating modes

Atlas has two intentionally separate modes in the same build:

- `/demo` is a public sales workspace. `DemoDataProvider` loads fictional customers, environments, certificates, deployments, renewals, vendor blocks, validations, runbooks, notifications, and audit events. Mutations remain in browser memory and reset on refresh. A clearly separated panel asynchronously displays public certificate metadata from a small curated endpoint allowlist; it never initializes an operational Supabase repository.
- `/app` is the authenticated production workspace. `SupabaseDataProvider` starts empty, resolves the signed-in user’s organization, and loads/persists only RLS-visible PostgreSQL rows. A fetch or authorization failure produces a real error and never falls back to fixtures.
- `/login` and `/signup` use Supabase Auth. `/onboarding` atomically creates a first organization and Owner membership for an authenticated user with no membership.

Root traffic renders a concise public product and private-beta landing page. `/demo` remains anonymous and isolated; `/app` remains authenticated and tenant-scoped.

## Product capabilities

- Operational dashboard, certificate inventory/detail, renewal queue, vendor handoffs, deployment targets, validations, customers, runbooks, activity, notifications, integrations, and settings
- Persistent production reads across all core entities
- Production creation for customers, environments, certificate metadata, deployment targets, runbooks, renewals, tasks, validations, and audit events
- Persistent task completion/retry and notification read state
- Database-guarded renewal creation/completion rules
- Supabase Auth session persistence, signup, login, logout, protected routes, membership resolution, and organization bootstrap
- True multi-tenancy using `organization_id`, composite tenant foreign keys, role-aware RLS, and append-oriented audit history
- Responsive premium dark interface with intentional loading, failure, and empty states
- Authenticated, SSRF-conscious endpoint reachability function
- Curated, read-only live TLS certificate metadata in the public demo, with cached and unavailable states that never block the simulated workspace
- Public landing, beta plan preview, trust/legal placeholders, configurable support links, CSV inventory/audit exports, and a lightweight first-workspace checklist

## Architecture

Atlas is one React 19, Vite, and TypeScript application. Pages consume a shared `DataState` interface. The demo and production providers implement that interface independently; raw Supabase queries are centralized in `SupabaseDataRepository`.

Supabase PostgreSQL is authoritative in production. Owner and Admin manage operational inventory, Operator executes renewal/deployment/validation work, and Viewer is read-only. UI affordances are secondary; RLS is the security boundary.

## Local development

Requires Node.js 20+ and pnpm 9+.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173/demo`. Demo mode requires no account and works whether Supabase is configured or not.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Supabase setup

1. Create a Supabase project.
2. Apply all migrations in order:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   This applies the base schema/RLS migration and the organization-bootstrap/renewal-transition migration.
3. In Supabase Auth URL Configuration, set the production Site URL and allow redirects to `https://YOUR_APP_HOST/app` (plus the local equivalent for development).
4. Copy `.env.example` to `.env.local`:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
   VITE_PUBLIC_APP_URL=https://YOUR_APP_HOST
   VITE_SUPPORT_EMAIL=support@YOUR_DOMAIN
   VITE_DOCUMENTATION_URL=https://YOUR_DOCS_HOST
   ```

Only the Publishable Key belongs in frontend configuration. Never use a Supabase Secret Key, `service_role` key, or database password in Vite environment variables. `VITE_SUPABASE_ANON_KEY` is accepted temporarily as a compatibility fallback, but the Publishable Key is preferred.

5. Configure email confirmation policy in Supabase Auth. When confirmation is enabled, signup tells the user to confirm email before signing in. When disabled, the authenticated user proceeds directly to `/onboarding`.
6. Visit `/signup`, authenticate, and create the organization. The `bootstrap_organization` RPC creates only a new organization and assigns the caller Owner; it cannot join an existing tenant or run for a user who already has membership.

No local Supabase credentials are committed. If this checkout is not linked, migrations remain prepared but unapplied.

## Persistence and RLS

All operational tables carry `organization_id`. Composite foreign keys prevent cross-tenant child references. RLS membership checks cover reads, inserts, updates, and deletes. Viewers have no write policies; Operators can update operational task/workflow/deployment state and append validation/audit records; Admins and Owners manage inventory; only Owners manage memberships and ownership-sensitive organization settings.

`start_renewal()` generates target deployment and validation tasks inside PostgreSQL. `complete_renewal()` locks the workflow and refuses completion until every task is complete and every validation task explicitly passed. Important frontend mutations append persistent audit events.

## Production deployment

Build with `pnpm build` and host `dist/` on a provider configured to rewrite SPA routes to `index.html`. `vercel.json` includes SPA rewrites, security headers, and preserves the Node-compatible `/api/demo-certificates` serverless handler. Static-only hosting can point `VITE_DEMO_INSPECTION_URL` at a separately deployed handler. Supply only public frontend variables at build time. Apply migrations before enabling `/app`. Configure Supabase Auth URLs, an exact `ALLOWED_ORIGIN` for Edge Functions, Supabase abuse controls, and host-level rate limiting.

Environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | For `/app` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | For `/app` | Browser-safe Supabase Publishable Key |
| `VITE_PUBLIC_APP_URL` | Public beta | Canonical public application URL |
| `VITE_SUPPORT_EMAIL` | Public beta | Support and feedback destination |
| `VITE_DOCUMENTATION_URL` | Optional | External documentation link; defaults to the built-in `/docs` guide |
| `VITE_DEMO_INSPECTION_URL` | Static-only hosts | Separately hosted demo inspection endpoint; defaults to `/api/demo-certificates` |
| `ALLOWED_ORIGIN` | Production Edge Function | Exact browser origin permitted to call production inspection request boundary |

### Public demo certificate metadata

`api/demo-certificates.ts` inspects only the repository-defined hostname allowlist and only on port 443. It resolves DNS server-side, rejects the request if any answer is private or reserved, and connects to a validated public IP while preserving TLS SNI/hostname verification. It never accepts arbitrary scan targets, follows no redirects, and returns public X.509 metadata only—never private keys or credentials. Connections time out after six seconds. Successful results are cached in warm serverless instances for ten minutes, responses are CDN-cacheable for five minutes, and a per-client warm-instance request limit reduces casual abuse.

The demo renders its fictional operational data immediately and loads live metadata in the background. A successful response is also cached in browser storage, so a transient inspection failure can show the last successful result with an explicit **Cached** label. The in-memory server cache and rate limiter are defense-in-depth, not globally durable controls; production hosting should also apply platform-level quotas and rate limiting. Do not expand the allowlist without reviewing DNS and egress risk.

### Endpoint inspection

Deploy with `supabase functions deploy inspect-tls`. The function is a production request boundary: it verifies the Supabase user, Operator-or-higher tenant membership, organization/customer/environment ownership, hostname/port input, and explicit authorization acknowledgement. It appends an audit event and returns `501` without making a network connection. This is intentional: Supabase Edge Functions cannot safely expose and pin peer X.509 connections after DNS validation. Full customer endpoint extraction requires a hardened Node worker with public-address verification, DNS pinning, centralized tenant quotas, and a private-network collector design for non-public endpoints.

## Testing

Vitest covers expiration boundaries, permissions, renewal validation requirements, CSV exports, endpoint input and public-address restrictions, environment validation, provider selection, the public landing route, anonymous demo access, account sign-out, and production no-fallback behavior. Before release, run the full command set above and execute multi-user RLS tests in a staging Supabase project.

## Security and limitations

See [docs/SECURITY.md](docs/SECURITY.md). Privacy and Terms routes are explicitly draft placeholders and require professional legal review before broad commercial launch. External CA/cloud/appliance, email, Slack/Teams, billing, SSO, and private-network collectors remain intentionally out of scope and require external systems or credentials. A live Supabase project is required to execute end-to-end persistence and RLS integration tests; the application code and migrations are prepared without embedding privileged access.
