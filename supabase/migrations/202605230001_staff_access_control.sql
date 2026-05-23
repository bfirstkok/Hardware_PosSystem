create table if not exists branches (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into branches (code, name)
values ('MAIN', 'สาขาหลัก')
on conflict (code) do nothing;

create table if not exists staff_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  auth_email text not null unique,
  employee_code text not null unique,
  display_name text not null,
  phone text,
  job_title text,
  role text not null default 'cashier' check (role in ('cashier', 'manager', 'owner')),
  primary_branch_id bigint references branches(id) on delete set null,
  account_status text not null default 'invited'
    check (account_status in ('invited', 'active', 'suspended', 'archived')),
  employment_status text not null default 'probation'
    check (employment_status in ('probation', 'full_time', 'part_time', 'resigned')),
  password_status text not null default 'default' check (password_status in ('default', 'changed')),
  permission_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_branch_assignments (
  staff_user_id uuid not null references staff_profiles(user_id) on delete cascade,
  branch_id bigint not null references branches(id) on delete cascade,
  role_override text check (role_override in ('cashier', 'manager', 'owner')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (staff_user_id, branch_id)
);

create table if not exists staff_activity_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  branch_id bigint references branches(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.sales') is not null then
    alter table sales add column if not exists branch_id bigint references branches(id) on delete set null;
  end if;

  if to_regclass('public.stock_movements') is not null then
    alter table stock_movements add column if not exists branch_id bigint references branches(id) on delete set null;
  end if;
end $$;

create index if not exists staff_profiles_role_status_idx
on staff_profiles (role, account_status, employment_status);

create index if not exists staff_profiles_branch_idx
on staff_profiles (primary_branch_id);

create index if not exists staff_activity_logs_actor_date_idx
on staff_activity_logs (actor_user_id, created_at desc);

create index if not exists staff_activity_logs_action_date_idx
on staff_activity_logs (action, created_at desc);

do $$
begin
  if to_regclass('public.sales') is not null then
    create index if not exists sales_branch_date_idx
    on sales (branch_id, sale_date desc);
  end if;

  if to_regclass('public.stock_movements') is not null then
    create index if not exists stock_movements_branch_date_idx
    on stock_movements (branch_id, movement_date desc);
  end if;
end $$;

create or replace function current_staff_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from staff_profiles
  where user_id = auth.uid()
    and account_status = 'active'
  limit 1
$$;

create or replace function current_staff_branch_ids()
returns bigint[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(branch_id), '{}'::bigint[])
  from staff_branch_assignments
  where staff_user_id = auth.uid()
    and is_active = true
$$;

alter table branches enable row level security;
alter table staff_profiles enable row level security;
alter table staff_branch_assignments enable row level security;
alter table staff_activity_logs enable row level security;

drop policy if exists "authenticated read active branches" on branches;
create policy "authenticated read active branches" on branches
for select to authenticated using (is_active = true or current_staff_role() = 'owner');

drop policy if exists "owner manage branches" on branches;
create policy "owner manage branches" on branches
for all to authenticated using (current_staff_role() = 'owner') with check (current_staff_role() = 'owner');

drop policy if exists "staff read own profile" on staff_profiles;
create policy "staff read own profile" on staff_profiles
for select to authenticated using (user_id = auth.uid());

drop policy if exists "manager owner read staff profiles" on staff_profiles;
create policy "manager owner read staff profiles" on staff_profiles
for select to authenticated using (current_staff_role() in ('manager', 'owner'));

drop policy if exists "manager owner insert staff profiles" on staff_profiles;
create policy "manager owner insert staff profiles" on staff_profiles
for insert to authenticated
with check (
  current_staff_role() = 'owner'
  or (current_staff_role() = 'manager' and role = 'cashier')
);

drop policy if exists "owner update staff profiles" on staff_profiles;
create policy "owner update staff profiles" on staff_profiles
for update to authenticated
using (current_staff_role() = 'owner')
with check (current_staff_role() = 'owner');

drop policy if exists "manager update cashier profiles" on staff_profiles;
create policy "manager update cashier profiles" on staff_profiles
for update to authenticated
using (current_staff_role() = 'manager' and role = 'cashier')
with check (current_staff_role() = 'manager' and role = 'cashier');

drop policy if exists "manager owner read branch assignments" on staff_branch_assignments;
create policy "manager owner read branch assignments" on staff_branch_assignments
for select to authenticated using (
  staff_user_id = auth.uid()
  or current_staff_role() in ('manager', 'owner')
);

drop policy if exists "owner manage branch assignments" on staff_branch_assignments;
create policy "owner manage branch assignments" on staff_branch_assignments
for all to authenticated using (current_staff_role() = 'owner') with check (current_staff_role() = 'owner');

drop policy if exists "manager owner read activity logs" on staff_activity_logs;
create policy "manager owner read activity logs" on staff_activity_logs
for select to authenticated using (
  actor_user_id = auth.uid()
  or current_staff_role() in ('manager', 'owner')
);

drop policy if exists "authenticated insert own activity logs" on staff_activity_logs;
create policy "authenticated insert own activity logs" on staff_activity_logs
for insert to authenticated with check (actor_user_id = auth.uid());
