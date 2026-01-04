create or replace function public.set_default_workspace(target_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'Not a member of this workspace';
  end if;

  update workspace_members
  set is_default = false
  where user_id = auth.uid();

  update workspace_members
  set is_default = true
  where user_id = auth.uid()
    and workspace_id = target_workspace_id;
end;
$$;
