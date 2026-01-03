begin;

alter table workspace_members
  add column if not exists member_title text;

commit;
