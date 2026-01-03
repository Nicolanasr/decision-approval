begin;

drop function if exists public.get_invite_workspace(uuid);

create function public.get_invite_workspace(invite_token uuid)
returns table (
  workspace_name text,
  workspace_description text,
  workspace_role text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_row workspace_invites;
  user_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into invite_row
  from workspace_invites
  where token = invite_token
    and accepted_at is null
  limit 1;

  if invite_row.id is null then
    raise exception 'Invite not found';
  end if;

  select email into user_email
  from auth.users
  where id = auth.uid();

  if user_email is null or lower(user_email) <> lower(invite_row.email) then
    raise exception 'Invite email does not match your account';
  end if;

  return query
  select workspaces.name, workspaces.description, invite_row.role
  from workspaces
  where workspaces.id = invite_row.workspace_id;
end;
$$;

grant execute on function public.get_invite_workspace(uuid) to authenticated;

commit;
