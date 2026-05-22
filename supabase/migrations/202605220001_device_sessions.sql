create table if not exists public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique,
  device_name text not null,
  device_type text not null default 'Browser',
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  role text not null default 'ผู้ใช้งานที่ล็อกอิน',
  branch text not null default 'ระบุสาขาภายหลัง',
  ip_address text,
  location text,
  browser text,
  os text,
  login_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'online' check (status in ('online', 'idle', 'blocked', 'revoked')),
  trusted boolean not null default false,
  is_new_device boolean not null default true,
  source text not null default 'auto' check (source in ('auto', 'manual')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_audit_logs (
  id bigint generated always as identity primary key,
  device_session_id uuid references public.device_sessions(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  detail text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.device_sessions enable row level security;
alter table public.device_audit_logs enable row level security;

drop policy if exists "authenticated read device sessions" on public.device_sessions;
create policy "authenticated read device sessions" on public.device_sessions
  for select to authenticated using (true);

drop policy if exists "authenticated insert device sessions" on public.device_sessions;
create policy "authenticated insert device sessions" on public.device_sessions
  for insert to authenticated with check (auth.uid() = user_id or user_id is null);

drop policy if exists "authenticated update device sessions" on public.device_sessions;
create policy "authenticated update device sessions" on public.device_sessions
  for update to authenticated using (true) with check (true);

drop policy if exists "authenticated read device audit logs" on public.device_audit_logs;
create policy "authenticated read device audit logs" on public.device_audit_logs
  for select to authenticated using (true);

drop policy if exists "authenticated insert device audit logs" on public.device_audit_logs;
create policy "authenticated insert device audit logs" on public.device_audit_logs
  for insert to authenticated with check (auth.uid() = actor_id or actor_id is null);

create index if not exists device_sessions_user_id_idx on public.device_sessions (user_id);
create index if not exists device_sessions_status_idx on public.device_sessions (status);
create index if not exists device_sessions_last_seen_idx on public.device_sessions (last_seen_at desc);
create index if not exists device_sessions_new_device_idx on public.device_sessions (is_new_device) where is_new_device = true;
create index if not exists device_audit_logs_created_at_idx on public.device_audit_logs (created_at desc);
create index if not exists device_audit_logs_device_idx on public.device_audit_logs (device_session_id);
