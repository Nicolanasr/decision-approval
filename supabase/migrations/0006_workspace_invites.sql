begin;

create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists workspace_invites_token_idx on workspace_invites (token);
create index if not exists workspace_invites_workspace_idx on workspace_invites (workspace_id);

alter table workspace_invites enable row level security;

drop policy if exists workspace_invites_select on workspace_invites;
drop policy if exists workspace_invites_insert on workspace_invites;
drop policy if exists workspace_invites_update on workspace_invites;
drop policy if exists workspace_invites_delete on workspace_invites;

create policy "workspace_invites_select" on workspace_invites
  for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace_invites_insert" on workspace_invites
  for insert
  with check (public.is_workspace_member(workspace_id));

create policy "workspace_invites_update" on workspace_invites
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace_invites_delete" on workspace_invites
  for delete
  using (public.is_workspace_member(workspace_id));

create or replace function public.create_workspace_invite(
  target_workspace_id uuid,
  target_email text,
  target_role text default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_token uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if target_email is null or btrim(target_email) = '' then
    raise exception 'Invite email is required';
  end if;

  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'Not authorized for this workspace';
  end if;

  insert into workspace_invites (workspace_id, email, role)
  values (target_workspace_id, lower(target_email), target_role)
  returning token into new_token;

  return new_token;
end;
$$;

grant execute on function public.create_workspace_invite(uuid, text, text) to authenticated;

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
    member_title = coalesce(excluded.member_title, workspace_members.member_title);

  update workspace_invites
  set accepted_at = now()
  where id = invite_row.id;

  return invite_row.workspace_id;
end;
$$;

grant execute on function public.accept_workspace_invite(uuid) to authenticated;

commit;
