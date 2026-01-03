begin;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
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
      and workspace_members.role = 'admin'
  );
$$;

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

drop policy if exists workspace_members_insert on workspace_members;
drop policy if exists workspace_members_update on workspace_members;
drop policy if exists workspace_members_delete on workspace_members;

create policy "workspace_members_insert" on workspace_members
  for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_members_update" on workspace_members
  for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_members_delete" on workspace_members
  for delete
  using (public.is_workspace_admin(workspace_id));

drop policy if exists decisions_insert on decisions;
drop policy if exists decisions_update on decisions;
drop policy if exists decisions_delete on decisions;

create policy "decisions_insert" on decisions
  for insert
  with check (
    public.is_workspace_editor(workspace_id)
    and owner_user_id = auth.uid()
  );

create policy "decisions_update" on decisions
  for update
  using (
    owner_user_id = auth.uid()
    or public.is_workspace_admin(workspace_id)
  )
  with check (
    owner_user_id = auth.uid()
    or public.is_workspace_admin(workspace_id)
  );

create policy "decisions_delete" on decisions
  for delete
  using (public.is_workspace_admin(workspace_id));

drop policy if exists decision_approvers_insert on decision_approvers;
drop policy if exists decision_approvers_update on decision_approvers;
drop policy if exists decision_approvers_delete on decision_approvers;

create policy "decision_approvers_insert" on decision_approvers
  for insert
  with check (
    exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and public.is_workspace_editor(decisions.workspace_id)
    )
  );

create policy "decision_approvers_update" on decision_approvers
  for update
  using (
    approver_user_id = auth.uid()
    and exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and public.is_workspace_editor(decisions.workspace_id)
    )
  )
  with check (
    approver_user_id = auth.uid()
    and exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and public.is_workspace_editor(decisions.workspace_id)
    )
  );

create policy "decision_approvers_delete" on decision_approvers
  for delete
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and public.is_workspace_editor(decisions.workspace_id)
    )
  );

drop policy if exists decision_comments_insert on decision_comments;
drop policy if exists decision_comments_update on decision_comments;
drop policy if exists decision_comments_delete on decision_comments;

create policy "decision_comments_insert" on decision_comments
  for insert
  with check (
    public.is_workspace_editor(
      (select decisions.workspace_id from decisions where decisions.id = decision_comments.decision_id)
    )
    and user_id = auth.uid()
  );

create policy "decision_comments_update" on decision_comments
  for update
  using (
    public.is_workspace_editor(
      (select decisions.workspace_id from decisions where decisions.id = decision_comments.decision_id)
    )
  )
  with check (
    public.is_workspace_editor(
      (select decisions.workspace_id from decisions where decisions.id = decision_comments.decision_id)
    )
  );

create policy "decision_comments_delete" on decision_comments
  for delete
  using (
    public.is_workspace_editor(
      (select decisions.workspace_id from decisions where decisions.id = decision_comments.decision_id)
    )
  );

drop policy if exists decision_links_insert on decision_links;
drop policy if exists decision_links_update on decision_links;
drop policy if exists decision_links_delete on decision_links;

create policy "decision_links_insert" on decision_links
  for insert
  with check (
    public.is_workspace_editor(
      (select decisions.workspace_id from decisions where decisions.id = decision_links.decision_id)
    )
  );

create policy "decision_links_update" on decision_links
  for update
  using (
    public.is_workspace_editor(
      (select decisions.workspace_id from decisions where decisions.id = decision_links.decision_id)
    )
  )
  with check (
    public.is_workspace_editor(
      (select decisions.workspace_id from decisions where decisions.id = decision_links.decision_id)
    )
  );

create policy "decision_links_delete" on decision_links
  for delete
  using (
    public.is_workspace_editor(
      (select decisions.workspace_id from decisions where decisions.id = decision_links.decision_id)
    )
  );

drop policy if exists decision_events_insert on decision_events;
drop policy if exists decision_events_update on decision_events;
drop policy if exists decision_events_delete on decision_events;

create policy "decision_events_insert" on decision_events
  for insert
  with check (
    public.is_workspace_editor(
      (select decisions.workspace_id from decisions where decisions.id = decision_events.decision_id)
    )
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

create policy "decision_events_update" on decision_events
  for update
  using (
    public.is_workspace_admin(
      (select decisions.workspace_id from decisions where decisions.id = decision_events.decision_id)
    )
  )
  with check (
    public.is_workspace_admin(
      (select decisions.workspace_id from decisions where decisions.id = decision_events.decision_id)
    )
  );

create policy "decision_events_delete" on decision_events
  for delete
  using (
    public.is_workspace_admin(
      (select decisions.workspace_id from decisions where decisions.id = decision_events.decision_id)
    )
  );

drop policy if exists workspace_invites_insert on workspace_invites;
drop policy if exists workspace_invites_update on workspace_invites;
drop policy if exists workspace_invites_delete on workspace_invites;

create policy "workspace_invites_insert" on workspace_invites
  for insert
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_invites_update" on workspace_invites
  for update
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "workspace_invites_delete" on workspace_invites
  for delete
  using (public.is_workspace_admin(workspace_id));

commit;
