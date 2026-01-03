begin;

create extension if not exists "pgcrypto";

create type decision_status as enum ('pending', 'approved', 'rejected');
create type decision_approver_status as enum ('pending', 'approved', 'rejected');

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  summary text not null,
  context text not null,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  status decision_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table decision_approvers (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  approver_user_id uuid not null references auth.users(id) on delete restrict,
  status decision_approver_status not null default 'pending',
  decided_at timestamptz
);

create table decision_comments (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);

create table decision_links (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table decision_events (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index decisions_workspace_created_idx on decisions (workspace_id, created_at);
create index decisions_title_idx on decisions (title);

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table decisions enable row level security;
alter table decision_approvers enable row level security;
alter table decision_comments enable row level security;
alter table decision_links enable row level security;
alter table decision_events enable row level security;

create policy "workspaces_select" on workspaces
  for select
  using (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspaces_insert" on workspaces
  for insert
  with check (auth.uid() is not null);

create policy "workspaces_update" on workspaces
  for update
  using (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspaces_delete" on workspaces
  for delete
  using (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "workspace_members_select" on workspace_members
  for select
  using (
    exists (
      select 1
      from workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace_members_insert" on workspace_members
  for insert
  with check (
    auth.uid() is not null
    and (
      auth.uid() = user_id
      or exists (
        select 1
        from workspace_members as wm
        where wm.workspace_id = workspace_members.workspace_id
          and wm.user_id = auth.uid()
      )
    )
  );

create policy "workspace_members_update" on workspace_members
  for update
  using (
    exists (
      select 1
      from workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "workspace_members_delete" on workspace_members
  for delete
  using (
    exists (
      select 1
      from workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
    )
  );

create policy "decisions_select" on decisions
  for select
  using (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = decisions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decisions_insert" on decisions
  for insert
  with check (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = decisions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
    and owner_user_id = auth.uid()
  );

create policy "decisions_update" on decisions
  for update
  using (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = decisions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = decisions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decisions_delete" on decisions
  for delete
  using (
    exists (
      select 1
      from workspace_members
      where workspace_members.workspace_id = decisions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_approvers_select" on decision_approvers
  for select
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_approvers.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_approvers_insert" on decision_approvers
  for insert
  with check (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_approvers.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_approvers_update" on decision_approvers
  for update
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_approvers.decision_id
        and workspace_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_approvers.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_approvers_delete" on decision_approvers
  for delete
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_approvers.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_comments_select" on decision_comments
  for select
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_comments.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_comments_insert" on decision_comments
  for insert
  with check (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_comments.decision_id
        and workspace_members.user_id = auth.uid()
    )
    and user_id = auth.uid()
  );

create policy "decision_comments_update" on decision_comments
  for update
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_comments.decision_id
        and workspace_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_comments.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_comments_delete" on decision_comments
  for delete
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_comments.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_links_select" on decision_links
  for select
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_links.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_links_insert" on decision_links
  for insert
  with check (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_links.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_links_update" on decision_links
  for update
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_links.decision_id
        and workspace_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_links.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_links_delete" on decision_links
  for delete
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_links.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_events_select" on decision_events
  for select
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_events.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_events_insert" on decision_events
  for insert
  with check (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_events.decision_id
        and workspace_members.user_id = auth.uid()
    )
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

create policy "decision_events_update" on decision_events
  for update
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_events.decision_id
        and workspace_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_events.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "decision_events_delete" on decision_events
  for delete
  using (
    exists (
      select 1
      from decisions
      join workspace_members
        on workspace_members.workspace_id = decisions.workspace_id
      where decisions.id = decision_events.decision_id
        and workspace_members.user_id = auth.uid()
    )
  );

commit;
