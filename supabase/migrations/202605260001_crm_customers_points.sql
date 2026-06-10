create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_staff_role()
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  staff_role text;
begin
  if to_regclass('public.staff_profiles') is null then
    return null;
  end if;

  execute 'select role from public.staff_profiles where user_id = $1 and account_status = ''active'' limit 1'
  into staff_role
  using auth.uid();

  return staff_role;
end;
$$;

create table if not exists public.customers (
  id bigint generated always as identity primary key,
  member_code text not null unique,
  full_name text not null,
  phone text,
  email text,
  address text,
  customer_type text not null default 'retail'
    check (customer_type in ('retail', 'contractor', 'company')),
  member_status text not null default 'active'
    check (member_status in ('active', 'paused', 'blocked')),
  points_balance integer not null default 0 check (points_balance >= 0),
  note text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_phone_unique_idx
on public.customers (phone)
where phone is not null and phone <> '';

create index if not exists customers_search_idx
on public.customers (full_name, member_code, phone);

create table if not exists public.loyalty_settings (
  id smallint primary key default 1 check (id = 1),
  earn_amount numeric(12,2) not null default 100 check (earn_amount > 0),
  earn_points integer not null default 1 check (earn_points > 0),
  redeem_points integer not null default 100 check (redeem_points > 0),
  redeem_amount numeric(12,2) not null default 10 check (redeem_amount > 0),
  min_redeem_points integer not null default 100 check (min_redeem_points >= 0),
  points_expire_months integer not null default 12 check (points_expire_months >= 0),
  is_active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.loyalty_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.customer_point_transactions (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete cascade,
  transaction_type text not null
    check (transaction_type in ('earn', 'redeem', 'adjust')),
  points integer not null check (points <> 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  reference_no text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists customer_point_transactions_customer_date_idx
on public.customer_point_transactions (customer_id, created_at desc);

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at
before update on public.customers
for each row execute function public.touch_updated_at();

drop trigger if exists loyalty_settings_touch_updated_at on public.loyalty_settings;
create trigger loyalty_settings_touch_updated_at
before update on public.loyalty_settings
for each row execute function public.touch_updated_at();

alter table public.customers enable row level security;
alter table public.loyalty_settings enable row level security;
alter table public.customer_point_transactions enable row level security;

drop policy if exists "manager owner read customers" on public.customers;
drop policy if exists "staff read active customers" on public.customers;
create policy "staff read active customers" on public.customers
for select to authenticated using (
  public.current_staff_role() in ('cashier', 'manager', 'owner')
  and is_active = true
);

drop policy if exists "manager owner write customers" on public.customers;
create policy "manager owner write customers" on public.customers
for all to authenticated
using (public.current_staff_role() in ('manager', 'owner'))
with check (public.current_staff_role() in ('manager', 'owner'));

drop policy if exists "manager owner read loyalty settings" on public.loyalty_settings;
create policy "manager owner read loyalty settings" on public.loyalty_settings
for select to authenticated using (public.current_staff_role() in ('manager', 'owner'));

drop policy if exists "owner write loyalty settings" on public.loyalty_settings;
create policy "owner write loyalty settings" on public.loyalty_settings
for all to authenticated
using (public.current_staff_role() = 'owner')
with check (public.current_staff_role() = 'owner');

drop policy if exists "manager owner read point transactions" on public.customer_point_transactions;
create policy "manager owner read point transactions" on public.customer_point_transactions
for select to authenticated using (public.current_staff_role() in ('manager', 'owner'));

drop policy if exists "manager owner write point transactions" on public.customer_point_transactions;
create policy "manager owner write point transactions" on public.customer_point_transactions
for all to authenticated
using (public.current_staff_role() in ('manager', 'owner'))
with check (public.current_staff_role() in ('manager', 'owner'));
