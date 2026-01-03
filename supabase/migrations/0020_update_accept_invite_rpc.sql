begin;

create or replace function public.accept_workspace_invite(
  invite_token uuid,
  target_name text default null,
  target_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_row workspace_invites;
  user_email text;
  new_member_id uuid;
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
    raise exception 'Invite not found or already used';
  end if;

  select email into user_email
  from auth.users
  where id = auth.uid();

  if user_email is null or lower(user_email) <> lower(invite_row.email) then
    raise exception 'Invite email does not match your account';
  end if;

  insert into workspace_members (workspace_id, user_id, role, member_email, member_name, member_title)
  values (
    invite_row.workspace_id,
    auth.uid(),
    invite_row.role,
    user_email,
    nullif(target_name, ''),
    nullif(target_title, '')
  )
  on conflict (workspace_id, user_id)
  do update set
    member_email = excluded.member_email,
    member_name = coalesce(excluded.member_name, workspace_members.member_name),
    member_title = coalesce(excluded.member_title, workspace_members.member_title)
  returning id into new_member_id;

  update workspace_invites
  set accepted_at = now()
  where id = invite_row.id;

  return invite_row.workspace_id;
end;
$$;

grant execute on function public.accept_workspace_invite(uuid, text, text) to authenticated;

commit;
