create table if not exists promotions (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  promotion_type text not null default 'threshold'
    check (promotion_type in ('threshold', 'buy_x_get_y', 'price_drop', 'bundle')),
  buy_qty numeric(12,2) not null default 0 check (buy_qty >= 0),
  get_qty numeric(12,2) not null default 0 check (get_qty >= 0),
  min_purchase_amount numeric(12,2) not null default 0 check (min_purchase_amount >= 0),
  reward_text text,
  starts_at date,
  ends_at date,
  priority integer not null default 10 check (priority >= 0),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists discount_rules (
  id bigint generated always as identity primary key,
  name text not null,
  code text unique,
  discount_type text not null default 'percent'
    check (discount_type in ('percent', 'amount')),
  value numeric(12,2) not null default 0 check (value >= 0),
  applies_to text not null default 'bill'
    check (applies_to in ('bill', 'coupon', 'member')),
  min_purchase_amount numeric(12,2) not null default 0 check (min_purchase_amount >= 0),
  max_discount_amount numeric(12,2) not null default 0 check (max_discount_amount >= 0),
  requires_approval boolean not null default false,
  starts_at date,
  ends_at date,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists promotions_touch_updated_at on promotions;
create trigger promotions_touch_updated_at
before update on promotions
for each row execute function touch_updated_at();

drop trigger if exists discount_rules_touch_updated_at on discount_rules;
create trigger discount_rules_touch_updated_at
before update on discount_rules
for each row execute function touch_updated_at();

alter table promotions enable row level security;
alter table discount_rules enable row level security;

drop policy if exists "authenticated read promotions" on promotions;
create policy "authenticated read promotions" on promotions
for select to authenticated using (true);

drop policy if exists "authenticated write promotions" on promotions;
create policy "authenticated write promotions" on promotions
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read discount rules" on discount_rules;
create policy "authenticated read discount rules" on discount_rules
for select to authenticated using (true);

drop policy if exists "authenticated write discount rules" on discount_rules;
create policy "authenticated write discount rules" on discount_rules
for all to authenticated using (true) with check (true);
