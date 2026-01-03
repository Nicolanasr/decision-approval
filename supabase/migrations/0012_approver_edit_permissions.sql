begin;

drop policy if exists decision_approvers_insert on decision_approvers;
drop policy if exists decision_approvers_delete on decision_approvers;

create policy "decision_approvers_insert" on decision_approvers
  for insert
  with check (
    exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and decisions.status = 'pending'
        and (
          decisions.owner_user_id = auth.uid()
          or public.is_workspace_admin(decisions.workspace_id)
        )
    )
  );

create policy "decision_approvers_delete" on decision_approvers
  for delete
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and decisions.status = 'pending'
        and (
          decisions.owner_user_id = auth.uid()
          or public.is_workspace_admin(decisions.workspace_id)
        )
    )
  );

commit;
