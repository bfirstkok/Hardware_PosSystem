-- Add status, provider and metadata to payments for manual verification
alter table payments
  add column if not exists status text not null default 'pending';

alter table payments
  add column if not exists provider text;

alter table payments
  add column if not exists metadata jsonb;

create index if not exists payments_status_idx on payments(status);
create index if not exists payments_provider_idx on payments(provider);
