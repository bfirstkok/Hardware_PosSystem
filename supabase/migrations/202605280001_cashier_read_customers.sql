""""""""""""drop policy if exists "manager owner read customers" on public.customers;
drop policy if exists "staff read active customers" on public.customers;

create policy "staff read active customers" on public.customers
for select to authenticated
using (
  public.current_staff_role() in ('cashier', 'manager', 'owner')
  and is_active = true
);
""""""""""""