begin;

create or replace function public.update_decision_status_from_approvals(
  target_decision_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  has_rejected boolean;
  all_approved boolean;
  approver_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from decision_approvers
    join decisions on decisions.id = decision_approvers.decision_id
    where decision_approvers.decision_id = target_decision_id
      and decision_approvers.approver_user_id = auth.uid()
  ) then
    raise exception 'Not authorized to update status';
  end if;

  select count(*)::int into approver_count
  from decision_approvers
  where decision_id = target_decision_id;

  select exists (
    select 1
    from decision_approvers
    where decision_id = target_decision_id
      and status = 'rejected'
  ) into has_rejected;

  select (count(*) = approver_count) into all_approved
  from decision_approvers
  where decision_id = target_decision_id
    and status = 'approved';

  update decisions
  set status = case
    when has_rejected then 'rejected'::decision_status
    when approver_count > 0 and all_approved then 'approved'::decision_status
    else 'pending'::decision_status
  end
  where id = target_decision_id
    and status = 'pending';
end;
$$;

grant execute on function public.update_decision_status_from_approvals(uuid) to authenticated;

commit;
