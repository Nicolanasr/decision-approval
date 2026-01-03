begin;

create or replace function public.is_workspace_editor(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from workspace_members
    where workspace_members.workspace_id = target_workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'member')
  );
$$;

create or replace function public.is_workspace_approver(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from workspace_members
    where workspace_members.workspace_id = target_workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('admin', 'member', 'approver')
  );
$$;

drop policy if exists decision_approvers_update on decision_approvers;

create policy "decision_approvers_update" on decision_approvers
  for update
  using (
    approver_user_id = auth.uid()
    and exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and decisions.status = 'pending'
        and public.is_workspace_approver(decisions.workspace_id)
    )
  )
  with check (
    approver_user_id = auth.uid()
    and exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and decisions.status = 'pending'
        and public.is_workspace_approver(decisions.workspace_id)
    )
  );

commit;
