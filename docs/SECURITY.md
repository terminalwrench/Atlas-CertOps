# Atlas CertOps security model

Atlas CertOps is an operational metadata system, not a CA or secret store. The schema deliberately has no private-key, password, or secret-value fields. Integration credentials belong in platform-managed secrets; `integration_configs.secret_reference` stores only a locator.

## Trust boundaries

- Supabase Auth establishes identity. Organization membership maps identity to one role.
- RLS is the authoritative tenant boundary. Every tenant table carries `organization_id`; policies resolve membership from `auth.uid()`.
- UI permissions improve usability but do not replace RLS.
- Audit events are append-oriented. Operators may insert them but no client policy permits update or delete.
- Endpoint inspection requires authentication, validates hostname/port, rejects obvious local/private address forms, uses a timeout, and follows no redirects. DNS rebinding protection and certificate extraction require a hardened server/worker with DNS resolution controls; the Edge Function therefore only performs bounded reachability checks today.

## Assumptions and residual risks

The initial organization and owner membership must be provisioned through a trusted administrative path. Before production, test every RLS policy against a dedicated staging project, configure an exact `ALLOWED_ORIGIN`, enable Supabase abuse controls, and place function-level rate limiting in front of endpoint inspection. Public DNS can change between resolution and connection, so do not extend discovery to arbitrary scanning without a network-isolated collector and explicit authorization records.
