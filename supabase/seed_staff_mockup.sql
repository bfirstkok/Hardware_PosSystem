-- Mockup staff for local/manual testing.
-- Create these users in Supabase Auth first, then run this file:
-- owner@demo.pos / password set in Auth UI
-- manager@demo.pos / password set in Auth UI
-- cashier@demo.pos / password set in Auth UI
--
-- Employee login usernames:
-- OWNER001
-- MGR001
-- EMP001

with main_branch as (
  select id
  from branches
  where code = 'MAIN'
  limit 1
),
auth_staff as (
  select
    id as user_id,
    email,
    case email
      when 'owner@demo.pos' then 'OWNER001'
      when 'manager@demo.pos' then 'MGR001'
      when 'cashier@demo.pos' then 'EMP001'
    end as employee_code,
    case email
      when 'owner@demo.pos' then 'เจ้าของร้าน Demo'
      when 'manager@demo.pos' then 'ผู้จัดการ Demo'
      when 'cashier@demo.pos' then 'พนักงานขาย Demo'
    end as display_name,
    case email
      when 'owner@demo.pos' then 'เจ้าของร้าน'
      when 'manager@demo.pos' then 'ผู้จัดการสาขา'
      when 'cashier@demo.pos' then 'พนักงานขายหน้าร้าน'
    end as job_title,
    case email
      when 'owner@demo.pos' then 'owner'
      when 'manager@demo.pos' then 'manager'
      when 'cashier@demo.pos' then 'cashier'
    end as role
  from auth.users
  where email in ('owner@demo.pos', 'manager@demo.pos', 'cashier@demo.pos')
)
insert into staff_profiles (
  user_id,
  auth_email,
  employee_code,
  display_name,
  phone,
  job_title,
  role,
  primary_branch_id,
  account_status,
  employment_status,
  password_status
)
select
  auth_staff.user_id,
  auth_staff.email,
  auth_staff.employee_code,
  auth_staff.display_name,
  null,
  auth_staff.job_title,
  auth_staff.role,
  main_branch.id,
  'active',
  'full_time',
  'default'
from auth_staff
cross join main_branch
where auth_staff.employee_code is not null
on conflict (user_id) do update
set auth_email = excluded.auth_email,
    employee_code = excluded.employee_code,
    display_name = excluded.display_name,
    job_title = excluded.job_title,
    role = excluded.role,
    primary_branch_id = excluded.primary_branch_id,
    account_status = excluded.account_status,
    employment_status = excluded.employment_status,
    updated_at = now();

insert into staff_branch_assignments (staff_user_id, branch_id, role_override, is_active)
select staff_profiles.user_id, branches.id, null, true
from staff_profiles
cross join branches
where branches.code = 'MAIN'
  and staff_profiles.employee_code in ('OWNER001', 'MGR001', 'EMP001')
on conflict (staff_user_id, branch_id) do update
set is_active = true;
