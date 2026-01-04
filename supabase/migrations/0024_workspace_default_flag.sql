alter table workspace_members
add column if not exists is_default boolean not null default false;
