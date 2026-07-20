# Atlas CertOps security model

Atlas CertOps is an operational metadata system, not a CA or secret store. The schema deliberately has no private-key, password, or secret-value fields. Integration credentials belong in platform-managed secrets; `integration_configs.secret_reference` stores only a locator.

## Trust boundaries

- Supabase Auth establishes identity. Organization membership maps identity to one role. `/app` refuses access until both are resolved; `/demo` uses a separate fixture provider and never opens an operational repository.
- RLS is the authoritative tenant boundary. Every tenant table carries `organization_id`; policies resolve membership from `auth.uid()`.
- UI permissions improve usability but do not replace RLS.
- Audit events are append-oriented. Operators may insert them but no client policy permits update or delete.
- Production endpoint inspection requires authentication, validates hostname/port, rejects obvious local/private address forms, uses a timeout, and follows no redirects. The Supabase Edge Function performs bounded reachability checks only.
- Public demo certificate inspection is a separate Node handler with a compile-time hostname allowlist and fixed port 443. It resolves every DNS answer, rejects the target if any address is private/reserved, pins the connection to the validated address, and retains the hostname for TLS SNI and certificate verification. It returns public peer-certificate metadata only. The handler cannot read production workspace data and is never called by `SupabaseDataProvider`.

## Assumptions and residual risks

The `bootstrap_organization` security-definer RPC is the only self-service bootstrap path. It requires `auth.uid()`, creates a new organization, refuses users with an existing membership, and assigns only the caller as Owner; it never accepts an organization ID or role from the browser. Before production, test every RLS policy against a dedicated staging project with users in different tenants and roles, configure an exact `ALLOWED_ORIGIN`, enable Supabase abuse controls, and place platform-level rate limiting in front of endpoint inspection. The demo handler's warm-instance cache and limiter are not globally durable. DNS pinning prevents a second lookup at connection time, but public DNS and routing remain external dependencies; do not extend discovery to arbitrary scanning without a network-isolated collector, centralized quotas, and explicit authorization records.

Frontend deployments may receive only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Supabase Secret Keys, `service_role`, database passwords, private keys, vendor credentials, and secret values must never enter the browser bundle.
