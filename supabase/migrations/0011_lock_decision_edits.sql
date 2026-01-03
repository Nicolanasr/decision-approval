begin;

drop policy if exists decisions_update on decisions;

create policy "decisions_update" on decisions
  for update
  using (
    status = 'pending'
    and (
      owner_user_id = auth.uid()
      or public.is_workspace_admin(workspace_id)
    )
  )
  with check (
    status = 'pending'
    and (
      owner_user_id = auth.uid()
      or public.is_workspace_admin(workspace_id)
    )
  );

commit;
