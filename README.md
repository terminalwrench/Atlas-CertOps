# Atlas CertOps

Certificate lifecycle operations and deployment orchestration for MSPs and lean infrastructure teams. Atlas tracks the operational last mile after issuance: every deployment location, owner, renewal task, external handoff, and validation result. It complements PKI platforms and never issues certificates or stores private keys.

## Operating modes

Atlas has two intentionally separate modes in the same build:

- `/demo` is a public sales workspace. `DemoDataProvider` loads fictional customers, environments, certificates, deployments, renewals, vendor blocks, validations, runbooks, notifications, and audit events. Mutations remain in browser memory and reset on refresh. It never initializes an operational Supabase repository.
- `/app` is the authenticated production workspace. `SupabaseDataProvider` starts empty, resolves the signed-in user’s organization, and loads/persists only RLS-visible PostgreSQL rows. A fetch or authorization failure produces a real error and never falls back to fixtures.
- `/login` and `/signup` use Supabase Auth. `/onboarding` atomically creates a first organization and Owner membership for an authenticated user with no membership.

Root traffic redirects to `/demo`, so a configured production deployment can still be used for prospect demonstrations without exposing customer data.

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
   ```

Only the Publishable Key belongs in frontend configuration. Never use a Supabase Secret Key, `service_role` key, or database password in Vite environment variables. `VITE_SUPABASE_ANON_KEY` is accepted temporarily as a compatibility fallback, but the Publishable Key is preferred.

5. Configure email confirmation policy in Supabase Auth. When confirmation is enabled, signup tells the user to confirm email before signing in. When disabled, the authenticated user proceeds directly to `/onboarding`.
6. Visit `/signup`, authenticate, and create the organization. The `bootstrap_organization` RPC creates only a new organization and assigns the caller Owner; it cannot join an existing tenant or run for a user who already has membership.

No local Supabase credentials are committed. If this checkout is not linked, migrations remain prepared but unapplied.

## Persistence and RLS

All operational tables carry `organization_id`. Composite foreign keys prevent cross-tenant child references. RLS membership checks cover reads, inserts, updates, and deletes. Viewers have no write policies; Operators can update operational task/workflow/deployment state and append validation/audit records; Admins and Owners manage inventory; only Owners manage memberships and ownership-sensitive organization settings.

`start_renewal()` generates target deployment and validation tasks inside PostgreSQL. `complete_renewal()` locks the workflow and refuses completion until every task is complete and every validation task explicitly passed. Important frontend mutations append persistent audit events.

## Production deployment

Build with `pnpm build` and host `dist/` on a static provider configured to rewrite SPA routes to `index.html`. Supply only the URL and Publishable Key at build time. Apply migrations before enabling `/app`. Configure security headers, an exact `ALLOWED_ORIGIN` for Edge Functions, Supabase abuse controls, and rate limiting.

### Endpoint inspection

Deploy with `supabase functions deploy inspect-tls`. The function requires authentication, accepts only a hostname and port, rejects obvious local/private targets, follows no redirects, and times out. Supabase Edge Functions do not expose peer X.509 metadata, so V1 reports bounded reachability. Full certificate extraction needs a hardened egress-controlled worker with post-DNS private-range checks and request quotas.

## Testing

Vitest covers expiration boundaries, permissions, renewal validation requirements, endpoint input, environment validation, provider selection, route isolation, anonymous demo access, and production no-fallback behavior. Before release, run the full command set above and execute multi-user RLS tests in a staging Supabase project.

## Security and limitations

See [docs/SECURITY.md](docs/SECURITY.md). External CA/cloud/appliance, email, Slack/Teams, billing, SSO, and private-network collectors remain intentionally out of scope and require external systems or credentials. A live Supabase project is required to execute end-to-end persistence and RLS integration tests; the application code and migrations are prepared without embedding privileged access.
