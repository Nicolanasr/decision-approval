begin;

drop policy if exists decision_events_insert on decision_events;

create policy "decision_events_insert" on decision_events
  for insert
  with check (
    public.is_workspace_approver(
      (select decisions.workspace_id from decisions where decisions.id = decision_events.decision_id)
    )
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

commit;
