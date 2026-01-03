begin;

create or replace function public.create_workspace_with_admin(workspace_name text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_workspace_id uuid;
begin
  if workspace_name is null or btrim(workspace_name) = '' then
    raise exception 'Workspace name is required';
  end if;

  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into workspaces (name)
  values (workspace_name)
  returning id into new_workspace_id;

  insert into workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'admin');

  return new_workspace_id;
end;
$$;

grant execute on function public.create_workspace_with_admin(text) to authenticated;

commit;
