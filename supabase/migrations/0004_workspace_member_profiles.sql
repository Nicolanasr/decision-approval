begin;

alter table workspace_members
  add column if not exists member_email text,
  add column if not exists member_name text;

update workspace_members
set member_email = auth.users.email,
    member_name = auth.users.raw_user_meta_data->>'full_name'
from auth.users
where workspace_members.user_id = auth.users.id
  and (workspace_members.member_email is null or workspace_members.member_name is null);

create or replace function public.add_workspace_member_by_email(
  target_workspace_id uuid,
  target_email text,
  target_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  found_user_id uuid;
  found_email text;
  resolved_name text;
  new_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if target_email is null or btrim(target_email) = '' then
    raise exception 'Member email is required';
  end if;

  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'Not authorized for this workspace';
  end if;

  select id, email, raw_user_meta_data->>'full_name'
    into found_user_id, found_email, resolved_name
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if found_user_id is null then
    raise exception 'No user found for that email';
  end if;

  insert into workspace_members (workspace_id, user_id, role, member_email, member_name)
  values (
    target_workspace_id,
    found_user_id,
    'member',
    found_email,
    coalesce(nullif(target_name, ''), resolved_name)
  )
  on conflict (workspace_id, user_id)
  do update set
    member_email = excluded.member_email,
    member_name = coalesce(excluded.member_name, workspace_members.member_name)
  returning id into new_member_id;

  return new_member_id;
end;
$$;

grant execute on function public.add_workspace_member_by_email(uuid, text, text) to authenticated;

commit;
