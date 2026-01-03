begin;

drop policy if exists decisions_update on decisions;

create policy "decisions_update" on decisions
  for update
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = decisions.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role = 'admin'
    )
  )
  with check (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = decisions.workspace_id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role = 'admin'
    )
  );

commit;
