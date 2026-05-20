create table if not exists public.product_price_history (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete restrict,
  old_retail_price numeric(12,2) not null default 0 check (old_retail_price >= 0),
  new_retail_price numeric(12,2) not null default 0 check (new_retail_price >= 0),
  old_wholesale_price numeric(12,2) not null default 0 check (old_wholesale_price >= 0),
  new_wholesale_price numeric(12,2) not null default 0 check (new_wholesale_price >= 0),
  old_cost_price numeric(12,2) not null default 0 check (old_cost_price >= 0),
  new_cost_price numeric(12,2) not null default 0 check (new_cost_price >= 0),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists product_price_history_product_changed_idx
on public.product_price_history (product_id, changed_at desc);

alter table public.product_price_history enable row level security;

drop policy if exists "authenticated read product price history" on public.product_price_history;
create policy "authenticated read product price history" on public.product_price_history
for select to authenticated using (true);

drop policy if exists "authenticated insert product price history" on public.product_price_history;
create policy "authenticated insert product price history" on public.product_price_history
for insert to authenticated with check (true);
