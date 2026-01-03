begin;

create or replace function public.is_workspace_member(target_workspace_id uuid)
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
  );
$$;

create or replace function public.workspace_member_count(target_workspace_id uuid)
returns integer
language sql
security definer
set search_path = public, auth
as $$
  select count(*)::int
  from workspace_members
  where workspace_members.workspace_id = target_workspace_id;
$$;

drop policy if exists workspaces_select on workspaces;
drop policy if exists workspaces_insert on workspaces;
drop policy if exists workspaces_update on workspaces;
drop policy if exists workspaces_delete on workspaces;

drop policy if exists workspace_members_select on workspace_members;
drop policy if exists workspace_members_insert on workspace_members;
drop policy if exists workspace_members_update on workspace_members;
drop policy if exists workspace_members_delete on workspace_members;

drop policy if exists decisions_select on decisions;
drop policy if exists decisions_insert on decisions;
drop policy if exists decisions_update on decisions;
drop policy if exists decisions_delete on decisions;

drop policy if exists decision_approvers_select on decision_approvers;
drop policy if exists decision_approvers_insert on decision_approvers;
drop policy if exists decision_approvers_update on decision_approvers;
drop policy if exists decision_approvers_delete on decision_approvers;

drop policy if exists decision_comments_select on decision_comments;
drop policy if exists decision_comments_insert on decision_comments;
drop policy if exists decision_comments_update on decision_comments;
drop policy if exists decision_comments_delete on decision_comments;

drop policy if exists decision_links_select on decision_links;
drop policy if exists decision_links_insert on decision_links;
drop policy if exists decision_links_update on decision_links;
drop policy if exists decision_links_delete on decision_links;

drop policy if exists decision_events_select on decision_events;
drop policy if exists decision_events_insert on decision_events;
drop policy if exists decision_events_update on decision_events;
drop policy if exists decision_events_delete on decision_events;

create policy "workspaces_select" on workspaces
  for select
  using (public.is_workspace_member(id));

create policy "workspaces_insert" on workspaces
  for insert
  with check (auth.uid() is not null);

create policy "workspaces_update" on workspaces
  for update
  using (public.is_workspace_member(id))
  with check (public.is_workspace_member(id));

create policy "workspaces_delete" on workspaces
  for delete
  using (public.is_workspace_member(id));

create policy "workspace_members_select" on workspace_members
  for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert" on workspace_members
  for insert
  with check (
    auth.uid() = user_id
    and (
      public.workspace_member_count(workspace_id) = 0
      or public.is_workspace_member(workspace_id)
    )
  );

create policy "workspace_members_update" on workspace_members
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "workspace_members_delete" on workspace_members
  for delete
  using (public.is_workspace_member(workspace_id));

create policy "decisions_select" on decisions
  for select
  using (public.is_workspace_member(workspace_id));

create policy "decisions_insert" on decisions
  for insert
  with check (
    public.is_workspace_member(workspace_id)
    and owner_user_id = auth.uid()
  );

create policy "decisions_update" on decisions
  for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "decisions_delete" on decisions
  for delete
  using (public.is_workspace_member(workspace_id));

create policy "decision_approvers_select" on decision_approvers
  for select
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_approvers_insert" on decision_approvers
  for insert
  with check (
    exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and public.is_workspace_member(decisions.workspace_id)
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
        and public.is_workspace_member(decisions.workspace_id)
    )
  )
  with check (
    approver_user_id = auth.uid()
    and exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_approvers_delete" on decision_approvers
  for delete
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_approvers.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_comments_select" on decision_comments
  for select
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_comments.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_comments_insert" on decision_comments
  for insert
  with check (
    public.is_workspace_member(
      (select decisions.workspace_id from decisions where decisions.id = decision_comments.decision_id)
    )
    and user_id = auth.uid()
  );

create policy "decision_comments_update" on decision_comments
  for update
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_comments.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from decisions
      where decisions.id = decision_comments.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_comments_delete" on decision_comments
  for delete
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_comments.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_links_select" on decision_links
  for select
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_links.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_links_insert" on decision_links
  for insert
  with check (
    public.is_workspace_member(
      (select decisions.workspace_id from decisions where decisions.id = decision_links.decision_id)
    )
  );

create policy "decision_links_update" on decision_links
  for update
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_links.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from decisions
      where decisions.id = decision_links.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_links_delete" on decision_links
  for delete
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_links.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_events_select" on decision_events
  for select
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_events.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_events_insert" on decision_events
  for insert
  with check (
    public.is_workspace_member(
      (select decisions.workspace_id from decisions where decisions.id = decision_events.decision_id)
    )
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

create policy "decision_events_update" on decision_events
  for update
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_events.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  )
  with check (
    exists (
      select 1
      from decisions
      where decisions.id = decision_events.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

create policy "decision_events_delete" on decision_events
  for delete
  using (
    exists (
      select 1
      from decisions
      where decisions.id = decision_events.decision_id
        and public.is_workspace_member(decisions.workspace_id)
    )
  );

commit;
