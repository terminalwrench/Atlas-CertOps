-- Secure self-service bootstrap and renewal transitions for the persistent application.
create or replace function public.bootstrap_organization(organization_name text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_organization_id uuid;
  clean_name text := btrim(organization_name);
  generated_slug text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(clean_name) < 2 or length(clean_name) > 100 then raise exception 'organization name must be between 2 and 100 characters'; end if;
  if exists (select 1 from public.organization_members where user_id = auth.uid()) then raise exception 'user already belongs to an organization'; end if;
  generated_slug := trim(both '-' from regexp_replace(lower(clean_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
  insert into public.organizations (name, slug) values (clean_name, generated_slug) returning id into new_organization_id;
  insert into public.organization_members (organization_id, user_id, role, display_name)
  values (new_organization_id, auth.uid(), 'owner', coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'email'));
  insert into public.audit_events (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (new_organization_id, auth.uid(), 'organization.created', 'organization', new_organization_id, jsonb_build_object('name', clean_name));
  return new_organization_id;
end $$;
revoke all on function public.bootstrap_organization(text) from public;
grant execute on function public.bootstrap_organization(text) to authenticated;

-- Operators can create operational workflow records but cannot manage inventory or membership.
create policy "operators create workflows" on public.renewal_workflows for insert
with check (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[]));
create policy "operators create tasks" on public.renewal_tasks for insert
with check (public.has_org_permission(organization_id, array['owner','admin','operator']::public.organization_role[]));

create or replace function public.complete_renewal(target_workflow uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare target_org uuid; incomplete_count integer;
begin
  select organization_id into target_org from public.renewal_workflows where id = target_workflow for update;
  if target_org is null or not public.has_org_permission(target_org, array['owner','admin','operator']::public.organization_role[]) then raise exception 'not authorized'; end if;
  select count(*) into incomplete_count from public.renewal_tasks
  where workflow_id = target_workflow and (status <> 'completed' or (task_type = 'validation' and validation_result is distinct from 'passed'));
  if incomplete_count > 0 or not exists(select 1 from public.renewal_tasks where workflow_id = target_workflow) then return false; end if;
  update public.renewal_workflows set status = 'completed', completed_at = now() where id = target_workflow;
  insert into public.audit_events (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_org, auth.uid(), 'renewal.completed', 'renewal_workflow', target_workflow, '{}');
  return true;
end $$;

create or replace function public.start_renewal(target_certificate uuid, target_due_date timestamptz default null)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare target_org uuid; workflow_id uuid; deployment record; deployment_task uuid;
begin
  select organization_id into target_org from public.certificates where id = target_certificate;
  if target_org is null or not public.has_org_permission(target_org, array['owner','admin','operator']::public.organization_role[]) then raise exception 'not authorized'; end if;
  if exists(select 1 from public.renewal_workflows where certificate_id = target_certificate and status not in ('completed','failed')) then raise exception 'an active renewal already exists'; end if;
  insert into public.renewal_workflows (organization_id, certificate_id, status, owner_user_id, started_at, due_date)
  values (target_org, target_certificate, 'renewal_required', auth.uid(), now(), coalesce(target_due_date, now() + interval '14 days')) returning id into workflow_id;
  for deployment in select * from public.certificate_deployments where certificate_id = target_certificate loop
    insert into public.renewal_tasks (organization_id, workflow_id, deployment_id, title, task_type, owner_user_id, status, method, instructions, due_date, vendor, vendor_contact)
    values (target_org, workflow_id, deployment.id, 'Deploy to ' || deployment.name, case when deployment.deployment_method = 'vendor_assisted' then 'vendor_handoff' else 'deployment' end, auth.uid(), 'pending', deployment.deployment_method, 'Follow the associated deployment runbook.', coalesce(target_due_date, now() + interval '14 days'), deployment.vendor, deployment.vendor_contact)
    returning id into deployment_task;
    insert into public.renewal_tasks (organization_id, workflow_id, deployment_id, title, task_type, owner_user_id, status, method, instructions, dependency_task_ids, due_date)
    values (target_org, workflow_id, deployment.id, 'Validate ' || deployment.name, 'validation', auth.uid(), 'pending', case when deployment.validation_method ilike 'automatic%' then 'automated' else 'manual' end, 'Confirm the expected certificate, hostname, expiration, and chain.', array[deployment_task], coalesce(target_due_date, now() + interval '14 days'));
  end loop;
  insert into public.audit_events (organization_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_org, auth.uid(), 'renewal.started', 'renewal_workflow', workflow_id, jsonb_build_object('certificate_id', target_certificate));
  return workflow_id;
end $$;
grant execute on function public.start_renewal(uuid, timestamptz) to authenticated;
