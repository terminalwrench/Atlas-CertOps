-- Atlas CertOps production schema. Metadata only: there are intentionally no private-key columns.
create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner', 'admin', 'operator', 'viewer');
create type public.certificate_status as enum ('healthy', 'expiring_soon', 'critical', 'expired', 'renewal_in_progress', 'validation_failed');
create type public.workflow_status as enum ('upcoming', 'renewal_required', 'requested', 'issued', 'deployment_in_progress', 'validation_in_progress', 'completed', 'failed');
create type public.task_status as enum ('pending', 'in_progress', 'blocked', 'completed', 'failed');
create type public.deployment_method as enum ('automated', 'manual', 'vendor_assisted', 'external_system');

create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  plan_key text not null default 'free', expiration_warning_days integer not null default 30 check (expiration_warning_days > 0),
  expiration_critical_days integer not null default 7 check (expiration_critical_days > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
  organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid not null references auth.users on delete cascade, role public.organization_role not null default 'viewer',
  display_name text, created_at timestamptz not null default now(), primary key (organization_id, user_id)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  name text not null, slug text not null, industry text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id, slug), unique (id, organization_id)
);
create table public.environments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  customer_id uuid not null, name text not null, kind text, created_at timestamptz not null default now(),
  unique (customer_id, name), unique (id, organization_id), foreign key (customer_id, organization_id) references public.customers (id, organization_id) on delete cascade
);
create table public.certificates (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  customer_id uuid not null, environment_id uuid, common_name text not null, san_names text[] not null default '{}',
  serial_number text, issuer text, certificate_authority text, not_before timestamptz, expires_at timestamptz not null,
  fingerprint text, status_override public.certificate_status, renewal_method text, owner_user_id uuid references auth.users on delete set null,
  owner_team text, notes text, source text not null default 'manual', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id), foreign key (customer_id, organization_id) references public.customers (id, organization_id) on delete cascade,
  foreign key (environment_id, organization_id) references public.environments (id, organization_id) on delete set null
);
create table public.runbooks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  title text not null, description text, steps jsonb not null default '[]', warnings jsonb not null default '[]', expected_validation text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id, organization_id),
  check (jsonb_typeof(steps) = 'array'), check (jsonb_typeof(warnings) = 'array')
);
create table public.certificate_deployments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  certificate_id uuid not null, customer_id uuid not null, environment_id uuid, name text not null, target_type text not null,
  hostname_or_reference text, deployment_method public.deployment_method not null default 'manual', owner_user_id uuid references auth.users on delete set null,
  owner_team text, vendor text, vendor_contact text, maintenance_window text, automation_status text, runbook_id uuid,
  validation_method text, dependencies text[] not null default '{}', last_deployment_at timestamptz, last_validation_at timestamptz,
  status public.task_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id), foreign key (certificate_id, organization_id) references public.certificates (id, organization_id) on delete cascade,
  foreign key (customer_id, organization_id) references public.customers (id, organization_id) on delete cascade,
  foreign key (environment_id, organization_id) references public.environments (id, organization_id) on delete set null,
  foreign key (runbook_id, organization_id) references public.runbooks (id, organization_id) on delete set null
);
create table public.renewal_workflows (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  certificate_id uuid not null, status public.workflow_status not null default 'upcoming', owner_user_id uuid references auth.users on delete set null,
  started_at timestamptz, due_date timestamptz, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id), foreign key (certificate_id, organization_id) references public.certificates (id, organization_id) on delete cascade
);
create table public.renewal_tasks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  workflow_id uuid not null, deployment_id uuid, title text not null, task_type text not null check (task_type in ('deployment','validation','vendor_handoff')),
  owner_user_id uuid references auth.users on delete set null, status public.task_status not null default 'pending', method public.deployment_method not null default 'manual',
  instructions text, dependency_task_ids uuid[] not null default '{}', due_date timestamptz, completed_at timestamptz,
  validation_result text check (validation_result is null or validation_result in ('passed','failed')), vendor text, vendor_contact text,
  ticket_number text, requested_at timestamptz, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, organization_id), foreign key (workflow_id, organization_id) references public.renewal_workflows (id, organization_id) on delete cascade,
  foreign key (deployment_id, organization_id) references public.certificate_deployments (id, organization_id) on delete set null
);
create table public.validation_checks (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  certificate_id uuid not null, deployment_id uuid, check_type text not null, expected_result jsonb not null default '{}', actual_result jsonb not null default '{}',
  checked_at timestamptz not null default now(), success boolean not null, error_message text, created_at timestamptz not null default now(),
  foreign key (certificate_id, organization_id) references public.certificates (id, organization_id) on delete cascade,
  foreign key (deployment_id, organization_id) references public.certificate_deployments (id, organization_id) on delete set null
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  actor_user_id uuid references auth.users on delete set null, action text not null, entity_type text not null, entity_id uuid,
  metadata jsonb not null default '{}', occurred_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  user_id uuid references auth.users on delete cascade, title text not null, message text not null, severity text not null default 'info',
  trigger_key text, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.integration_configs (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade,
  provider text not null, display_name text not null, enabled boolean not null default false, config jsonb not null default '{}',
  secret_reference text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id, provider, display_name)
);
create table public.plan_limits (
  plan_key text primary key, display_name text not null, certificate_limit integer not null check (certificate_limit > 0), settings jsonb not null default '{}'
);
insert into public.plan_limits values ('free','Free',10,'{}'),('pro','Pro',100,'{}'),('team','Team',500,'{}'),('business','Business',2500,'{}');

create index certificates_tenant_expiry_idx on public.certificates (organization_id, expires_at);
create index deployments_certificate_idx on public.certificate_deployments (organization_id, certificate_id);
create index workflows_status_due_idx on public.renewal_workflows (organization_id, status, due_date);
create index tasks_workflow_status_idx on public.renewal_tasks (organization_id, workflow_id, status);
create index audit_tenant_time_idx on public.audit_events (organization_id, occurred_at desc);

create or replace function public.current_org_role(target_org uuid) returns public.organization_role language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.organization_members where organization_id = target_org and user_id = auth.uid()
$$;
revoke all on function public.current_org_role(uuid) from public; grant execute on function public.current_org_role(uuid) to authenticated;
create or replace function public.has_org_permission(target_org uuid, allowed_roles public.organization_role[]) returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.organization_members where organization_id = target_org and user_id = auth.uid() and role = any(allowed_roles))
$$;
revoke all on function public.has_org_permission(uuid, public.organization_role[]) from public; grant execute on function public.has_org_permission(uuid, public.organization_role[]) to authenticated;

alter table public.organizations enable row level security; alter table public.organization_members enable row level security;
alter table public.customers enable row level security; alter table public.environments enable row level security; alter table public.certificates enable row level security;
alter table public.certificate_deployments enable row level security; alter table public.renewal_workflows enable row level security; alter table public.renewal_tasks enable row level security;
alter table public.runbooks enable row level security; alter table public.validation_checks enable row level security; alter table public.audit_events enable row level security;
alter table public.notifications enable row level security; alter table public.integration_configs enable row level security; alter table public.plan_limits enable row level security;

create policy "members read organizations" on public.organizations for select using (public.current_org_role(id) is not null);
create policy "owners update organizations" on public.organizations for update using (public.has_org_permission(id, array['owner']::public.organization_role[])) with check (public.has_org_permission(id, array['owner']::public.organization_role[]));
create policy "members read memberships" on public.organization_members for select using (public.current_org_role(organization_id) is not null);
create policy "owners manage memberships" on public.organization_members for all using (public.has_org_permission(organization_id, array['owner']::public.organization_role[])) with check (public.has_org_permission(organization_id, array['owner']::public.organization_role[]));

do $$ declare tbl text; begin
  foreach tbl in array array['customers','environments','certificates','certificate_deployments','renewal_workflows','renewal_tasks','runbooks','integration_configs'] loop
    execute format('create policy "tenant members read" on public.%I for select using (public.current_org_role(organization_id) is not null)', tbl);
    execute format('create policy "admins manage" on public.%I for all using (public.has_org_permission(organization_id, array[''owner'',''admin'']::public.organization_role[])) with check (public.has_org_permission(organization_id, array[''owner'',''admin'']::public.organization_role[]))', tbl);
  end loop;
end $$;
create policy "operators update deployments" on public.certificate_deployments for update using (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[])) with check (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[]));
create policy "operators update workflows" on public.renewal_workflows for update using (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[])) with check (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[]));
create policy "operators update tasks" on public.renewal_tasks for update using (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[])) with check (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[]));
create policy "tenant reads validation" on public.validation_checks for select using (public.current_org_role(organization_id) is not null);
create policy "operators create validation" on public.validation_checks for insert with check (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[]));
create policy "tenant reads audit" on public.audit_events for select using (public.current_org_role(organization_id) is not null);
create policy "operators append audit" on public.audit_events for insert with check (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[]) and (actor_user_id is null or actor_user_id = auth.uid()));
create policy "users read notifications" on public.notifications for select using (public.current_org_role(organization_id) is not null and (user_id is null or user_id = auth.uid()));
create policy "users update own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "authenticated read plans" on public.plan_limits for select to authenticated using (true);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public, pg_temp as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare tbl text; begin foreach tbl in array array['organizations','customers','certificates','certificate_deployments','renewal_workflows','renewal_tasks','runbooks','integration_configs'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', tbl); end loop; end $$;

-- Atomic completion guard: every task must be complete and validation tasks must pass.
create or replace function public.complete_renewal(target_workflow uuid) returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare target_org uuid; incomplete_count integer;
begin
  select organization_id into target_org from public.renewal_workflows where id = target_workflow for update;
  if target_org is null or not public.has_org_permission(target_org, array['owner','admin','operator']::public.organization_role[]) then raise exception 'not authorized'; end if;
  select count(*) into incomplete_count from public.renewal_tasks where workflow_id = target_workflow and (status <> 'completed' or (task_type = 'validation' and validation_result <> 'passed'));
  if incomplete_count > 0 or not exists(select 1 from public.renewal_tasks where workflow_id = target_workflow) then return false; end if;
  update public.renewal_workflows set status = 'completed', completed_at = now() where id = target_workflow;
  return true;
end $$;
