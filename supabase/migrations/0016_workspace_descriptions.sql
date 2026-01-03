begin;

alter table workspaces
  add column if not exists description text;

commit;
