drop policy if exists "staff insert customers" on public.customers;
create policy "staff insert customers" on public.customers
for insert to authenticated
with check (
  public.current_staff_role() in ('cashier', 'manager', 'owner')
  and is_active = true
  and member_status = 'active'
);

drop policy if exists "manager owner read loyalty settings" on public.loyalty_settings;
drop policy if exists "staff read loyalty settings" on public.loyalty_settings;
create policy "staff read loyalty settings" on public.loyalty_settings
for select to authenticated
using (public.current_staff_role() in ('cashier', 'manager', 'owner'));

create or replace function public.award_customer_points(
  request_customer_id bigint,
  request_points integer,
  request_amount numeric,
  request_reference_no text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance integer;
begin
  if public.current_staff_role() not in ('cashier', 'manager', 'owner') then
    raise exception 'Staff access required.';
  end if;

  if request_points <= 0 then
    raise exception 'Points must be positive.';
  end if;

  update public.customers
  set points_balance = points_balance + request_points
  where id = request_customer_id
    and is_active = true
    and member_status = 'active'
  returning points_balance into next_balance;

  if next_balance is null then
    raise exception 'Active member not found.';
  end if;

  insert into public.customer_point_transactions (
    customer_id,
    transaction_type,
    points,
    amount,
    reference_no,
    note,
    created_by
  )
  values (
    request_customer_id,
    'earn',
    request_points,
    greatest(coalesce(request_amount, 0), 0),
    nullif(request_reference_no, ''),
    'POS sale',
    auth.uid()
  );

  return next_balance;
end;
$$;

grant execute on function public.award_customer_points(bigint, integer, numeric, text) to authenticated;
