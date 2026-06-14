-- Migration: Add columns for void/refund and audit logs

-- Alter sales table
alter table public.sales add column if not exists voided_at timestamptz;
alter table public.sales add column if not exists voided_by uuid references auth.users(id) on delete set null;
alter table public.sales add column if not exists void_reason text;
alter table public.sales add column if not exists refunded_at timestamptz;
alter table public.sales add column if not exists refunded_by uuid references auth.users(id) on delete set null;
alter table public.sales add column if not exists refund_reason text;

-- Add check constraints to enforce reason when status changes to voided/refunded
alter table public.sales drop constraint if exists sales_void_reason_check;
alter table public.sales add constraint sales_void_reason_check 
  check (status != 'voided' or (status = 'voided' and void_reason is not null and length(trim(void_reason)) > 0));

alter table public.sales drop constraint if exists sales_refund_reason_check;
alter table public.sales add constraint sales_refund_reason_check 
  check (status != 'refunded' or (status = 'refunded' and refund_reason is not null and length(trim(refund_reason)) > 0));

-- Alter sale_items table
alter table public.sale_items add column if not exists discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0);

-- Create transaction_events table
create table if not exists public.transaction_events (
  id bigint generated always as identity primary key,
  sale_id bigint not null references public.sales(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'voided', 'refunded')),
  amount numeric(12,2) not null,
  reason text,
  metadata jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Enable RLS on transaction_events
alter table public.transaction_events enable row level security;

drop policy if exists "authenticated read transaction events" on public.transaction_events;
create policy "authenticated read transaction events" on public.transaction_events
  for select to authenticated using (true);

drop policy if exists "authenticated insert transaction events" on public.transaction_events;
create policy "authenticated insert transaction events" on public.transaction_events
  for insert to authenticated with check (true);

-- Create activity_logs table
create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id bigint,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS on activity_logs
alter table public.activity_logs enable row level security;

drop policy if exists "authenticated read activity logs" on public.activity_logs;
create policy "authenticated read activity logs" on public.activity_logs
  for select to authenticated using (true);

drop policy if exists "authenticated insert activity logs" on public.activity_logs;
create policy "authenticated insert activity logs" on public.activity_logs
  for insert to authenticated with check (true);

-- Performance Indexes
create index if not exists sales_status_idx on public.sales (status);
create index if not exists sales_payment_method_idx on public.sales (payment_method);
create index if not exists sales_sale_date_idx on public.sales (sale_date desc);
create index if not exists sales_sale_no_idx on public.sales (sale_no);

create index if not exists transaction_events_sale_id_idx on public.transaction_events (sale_id);
create index if not exists transaction_events_created_at_idx on public.transaction_events (created_at desc);

create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_actor_action_idx on public.activity_logs (actor_id, action);
create index if not exists activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);
