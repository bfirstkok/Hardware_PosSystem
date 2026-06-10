create table if not exists public.promotion_trigger_products (
  id bigint generated always as identity primary key,
  promotion_id bigint not null references public.promotions(id) on delete cascade,
  product_id bigint references public.products(id) on delete cascade,
  required_qty numeric(12,2) not null default 0 check (required_qty >= 0),
  required_amount numeric(12,2) not null default 0 check (required_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists promotion_trigger_products_promotion_idx
on public.promotion_trigger_products (promotion_id);

create index if not exists promotion_trigger_products_product_idx
on public.promotion_trigger_products (product_id);

create table if not exists public.promotion_reward_products (
  id bigint generated always as identity primary key,
  promotion_id bigint not null references public.promotions(id) on delete cascade,
  product_id bigint references public.products(id) on delete cascade,
  reward_qty numeric(12,2) not null default 0 check (reward_qty >= 0),
  created_at timestamptz not null default now()
);

create index if not exists promotion_reward_products_promotion_idx
on public.promotion_reward_products (promotion_id);

create index if not exists promotion_reward_products_product_idx
on public.promotion_reward_products (product_id);

alter table public.promotion_trigger_products enable row level security;
alter table public.promotion_reward_products enable row level security;

drop policy if exists "staff read promotion trigger products" on public.promotion_trigger_products;
create policy "staff read promotion trigger products" on public.promotion_trigger_products
for select to authenticated using (public.current_staff_role() in ('cashier', 'manager', 'owner'));

drop policy if exists "manager owner write promotion trigger products" on public.promotion_trigger_products;
create policy "manager owner write promotion trigger products" on public.promotion_trigger_products
for all to authenticated
using (public.current_staff_role() in ('manager', 'owner'))
with check (public.current_staff_role() in ('manager', 'owner'));

drop policy if exists "staff read promotion reward products" on public.promotion_reward_products;
create policy "staff read promotion reward products" on public.promotion_reward_products
for select to authenticated using (public.current_staff_role() in ('cashier', 'manager', 'owner'));

drop policy if exists "manager owner write promotion reward products" on public.promotion_reward_products;
create policy "manager owner write promotion reward products" on public.promotion_reward_products
for all to authenticated
using (public.current_staff_role() in ('manager', 'owner'))
with check (public.current_staff_role() in ('manager', 'owner'));
