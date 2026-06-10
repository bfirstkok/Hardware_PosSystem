create extension if not exists pgcrypto;

create table if not exists product_categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists units (
  id bigint generated always as identity primary key,
  name text not null unique,
  short_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id bigint generated always as identity primary key,
  sku text not null unique,
  barcode text unique,
  name text not null,
  image_url text,
  category_id bigint references product_categories(id) on delete set null,
  base_unit_id bigint references units(id) on delete set null,
  retail_price numeric(12,2) not null default 0 check (retail_price >= 0),
  wholesale_price numeric(12,2) not null default 0 check (wholesale_price >= 0),
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  min_stock numeric(12,2) not null default 0 check (min_stock >= 0),
  stock_qty numeric(12,2) not null default 0 check (stock_qty >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products add column if not exists image_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated read product images" on storage.objects;
create policy "authenticated read product images" on storage.objects
for select to authenticated using (bucket_id = 'product-images');

drop policy if exists "authenticated upload product images" on storage.objects;
create policy "authenticated upload product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists "authenticated update product images" on storage.objects;
create policy "authenticated update product images" on storage.objects
for update to authenticated using (bucket_id = 'product-images') with check (bucket_id = 'product-images');

create table if not exists sales (
  id bigint generated always as identity primary key,
  sale_no text not null unique,
  sale_date timestamptz not null default now(),
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  payment_method text not null default 'cash',
  status text not null default 'completed',
  idempotency_key text unique,
  client_invoice_no text,
  offline_created_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table sales add column if not exists idempotency_key text unique;
alter table sales add column if not exists client_invoice_no text;
alter table sales add column if not exists offline_created_at timestamptz;

create table if not exists sale_items (
  id bigint generated always as identity primary key,
  sale_id bigint not null references sales(id) on delete cascade,
  product_id bigint not null references products(id) on delete restrict,
  qty numeric(12,2) not null check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id bigint generated always as identity primary key,
  sale_id bigint not null references sales(id) on delete cascade,
  payment_date timestamptz not null default now(),
  payment_method text not null default 'cash',
  amount numeric(12,2) not null check (amount >= 0),
  reference_no text,
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists stock_movements (
  id bigint generated always as identity primary key,
  movement_date timestamptz not null default now(),
  product_id bigint not null references products(id) on delete restrict,
  movement_type text not null,
  qty_in numeric(12,2) not null default 0,
  qty_out numeric(12,2) not null default 0,
  ref_type text,
  ref_id bigint,
  note text,
  created_by uuid references auth.users(id) on delete set null
);

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
  reward_product_id bigint references products(id) on delete set null,
  starts_at date,
  ends_at date,
  priority integer not null default 10 check (priority >= 0),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists promotion_trigger_products (
  id bigint generated always as identity primary key,
  promotion_id bigint not null references promotions(id) on delete cascade,
  product_id bigint references products(id) on delete cascade,
  required_qty numeric(12,2) not null default 0 check (required_qty >= 0),
  required_amount numeric(12,2) not null default 0 check (required_amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists promotion_reward_products (
  id bigint generated always as identity primary key,
  promotion_id bigint not null references promotions(id) on delete cascade,
  product_id bigint references products(id) on delete cascade,
  reward_qty numeric(12,2) not null default 0 check (reward_qty >= 0),
  created_at timestamptz not null default now()
);

create table if not exists discount_rules (
  id bigint generated always as identity primary key,
  name text not null,
  code text unique,
  discount_type text not null default 'percent'
    check (discount_type = 'percent'),
  value numeric(12,2) not null default 1 check (value >= 1 and value <= 100),
  applies_to text not null default 'member'
    check (applies_to = 'member'),
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

create table if not exists customers (
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
on customers (phone)
where phone is not null and phone <> '';

create index if not exists customers_search_idx
on customers (full_name, member_code, phone);

create table if not exists loyalty_settings (
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

insert into loyalty_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists customer_point_transactions (
  id bigint generated always as identity primary key,
  customer_id bigint not null references customers(id) on delete cascade,
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
on customer_point_transactions (customer_id, created_at desc);

create table if not exists product_price_history (
  id bigint generated always as identity primary key,
  product_id bigint not null references products(id) on delete restrict,
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
on product_price_history (product_id, changed_at desc);

create index if not exists stock_movements_type_date_idx
on stock_movements (movement_type, movement_date desc);

create index if not exists stock_movements_product_type_date_idx
on stock_movements (product_id, movement_type, movement_date desc);

create index if not exists promotions_reward_product_idx
on promotions (reward_product_id);

create index if not exists promotion_trigger_products_promotion_idx
on promotion_trigger_products (promotion_id);

create index if not exists promotion_trigger_products_product_idx
on promotion_trigger_products (product_id);

create index if not exists promotion_reward_products_promotion_idx
on promotion_reward_products (promotion_id);

create index if not exists promotion_reward_products_product_idx
on promotion_reward_products (product_id);

create index if not exists sale_items_sale_product_idx
on sale_items (sale_id, product_id);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function current_staff_role()
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

drop trigger if exists products_touch_updated_at on products;
create trigger products_touch_updated_at
before update on products
for each row execute function touch_updated_at();

drop trigger if exists promotions_touch_updated_at on promotions;
create trigger promotions_touch_updated_at
before update on promotions
for each row execute function touch_updated_at();

drop trigger if exists discount_rules_touch_updated_at on discount_rules;
create trigger discount_rules_touch_updated_at
before update on discount_rules
for each row execute function touch_updated_at();

drop trigger if exists customers_touch_updated_at on customers;
create trigger customers_touch_updated_at
before update on customers
for each row execute function touch_updated_at();

drop trigger if exists loyalty_settings_touch_updated_at on loyalty_settings;
create trigger loyalty_settings_touch_updated_at
before update on loyalty_settings
for each row execute function touch_updated_at();

create or replace function complete_pos_sale(payload jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_sale_id bigint;
  new_sale_no text;
  item jsonb;
  line_product_id bigint;
  line_qty numeric(12,2);
  line_unit_price numeric(12,2);
  line_total numeric(12,2);
  sale_total numeric(12,2) := 0;
  discount_total numeric(12,2) := greatest(coalesce((payload->>'discount_amount')::numeric, 0), 0);
  paid_total numeric(12,2) := coalesce((payload->>'paid_amount')::numeric, 0);
  due_total numeric(12,2);
  current_stock numeric(12,2);
  method text := coalesce(payload->>'payment_method', 'cash');
  reference text := nullif(payload->>'reference_no', '');
  customer text := nullif(payload->>'customer_name', '');
  request_idempotency_key text := nullif(payload->>'idempotency_key', '');
  request_client_invoice_no text := nullif(payload->>'client_invoice_no', '');
  request_offline_created_at timestamptz := nullif(payload->>'offline_created_at', '')::timestamptz;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if request_idempotency_key is not null and length(request_idempotency_key) > 80 then
    raise exception 'Invalid idempotency key.';
  end if;

  if request_client_invoice_no is not null and length(request_client_invoice_no) > 80 then
    raise exception 'Invalid offline invoice number.';
  end if;

  if request_offline_created_at is not null and request_offline_created_at > now() + interval '5 minutes' then
    raise exception 'Invalid offline created timestamp.';
  end if;

  if request_idempotency_key is not null then
    select sale_no into new_sale_no
    from sales
    where idempotency_key = request_idempotency_key
      and created_by = current_user_id;

    if new_sale_no is not null then
      return new_sale_no;
    end if;
  end if;

  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Sale items are required.';
  end if;

  if method not in ('cash', 'transfer', 'qr', 'card') then
    raise exception 'Invalid payment method.';
  end if;

  if discount_total < 0 or paid_total < 0 then
    raise exception 'Invalid payment amount.';
  end if;

  new_sale_no := 'SALE-' || to_char(now(), 'YYYYMMDDHH24MISSMS');

  insert into sales (
    sale_no,
    payment_method,
    status,
    idempotency_key,
    client_invoice_no,
    offline_created_at,
    created_by
  )
  values (
    new_sale_no,
    method,
    'completed',
    request_idempotency_key,
    request_client_invoice_no,
    request_offline_created_at,
    current_user_id
  )
  returning id into new_sale_id;

  for item in select * from jsonb_array_elements(payload->'items')
  loop
    line_product_id := (item->>'product_id')::bigint;
    line_qty := (item->>'qty')::numeric;
    line_unit_price := (item->>'unit_price')::numeric;

    if line_qty <= 0 then
      raise exception 'Invalid quantity for product %.', line_product_id;
    end if;

    if line_unit_price < 0 then
      raise exception 'Invalid unit price for product %.', line_product_id;
    end if;

    select stock_qty into current_stock
    from products
    where id = line_product_id and is_active = true
    for update;

    if current_stock is null then
      raise exception 'Product % not found.', line_product_id;
    end if;

    if current_stock < line_qty then
      raise exception 'Insufficient stock for product %.', line_product_id;
    end if;

    line_total := line_qty * line_unit_price;
    sale_total := sale_total + line_total;

    insert into sale_items (sale_id, product_id, qty, unit_price, line_total)
    values (new_sale_id, line_product_id, line_qty, line_unit_price, line_total);

    update products
    set stock_qty = stock_qty - line_qty
    where id = line_product_id;

    insert into stock_movements (
      product_id,
      movement_type,
      qty_out,
      ref_type,
      ref_id,
      created_by
    )
    values (
      line_product_id,
      'sale',
      line_qty,
      'sales',
      new_sale_id,
      current_user_id
    );
  end loop;

  if discount_total > sale_total then
    discount_total := sale_total;
  end if;

  due_total := sale_total - discount_total;
  if method = 'cash' and paid_total < due_total then
    raise exception 'Paid amount is less than total amount.';
  end if;

  if paid_total > 0 and paid_total < due_total then
    raise exception 'Paid amount is less than total amount.';
  end if;

  update sales
  set subtotal = sale_total,
      discount_amount = discount_total,
      total_amount = due_total
  where id = new_sale_id;

  insert into payments (sale_id, payment_method, amount, reference_no, created_by)
  values (
    new_sale_id,
    method,
    case when paid_total > 0 then paid_total else due_total end,
    concat_ws(' / ', reference, customer),
    current_user_id
  );

  return new_sale_no;
end;
$$;

create or replace function receive_stock(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  line_product_id bigint := (payload->>'product_id')::bigint;
  line_qty numeric(12,2) := (payload->>'qty')::numeric;
  line_note text := nullif(payload->>'note', '');
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if line_product_id is null or line_qty <= 0 then
    raise exception 'Valid product and quantity are required.';
  end if;

  update products
  set stock_qty = stock_qty + line_qty
  where id = line_product_id and is_active = true;

  if not found then
    raise exception 'Product % not found.', line_product_id;
  end if;

  insert into stock_movements (
    product_id,
    movement_type,
    qty_in,
    ref_type,
    note,
    created_by
  )
  values (
    line_product_id,
    'receive',
    line_qty,
    'manual',
    line_note,
    current_user_id
  );
end;
$$;

create or replace function award_customer_points(
  request_customer_id bigint,
  request_points integer,
  request_amount numeric,
  request_reference_no text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_balance integer;
begin
  if current_staff_role() not in ('cashier', 'manager', 'owner') then
    raise exception 'Staff access required.';
  end if;

  if request_points <= 0 then
    raise exception 'Points must be positive.';
  end if;

  update customers
  set points_balance = points_balance + request_points
  where id = request_customer_id
    and is_active = true
    and member_status = 'active'
  returning points_balance into next_balance;

  if next_balance is null then
    raise exception 'Active member not found.';
  end if;

  insert into customer_point_transactions (
    customer_id,
    transaction_type,
    points,
    amount,
    reference_no,
    note,
    created_by
  )
  values (
    request_customer_id,
    'earn',
    request_points,
    greatest(coalesce(request_amount, 0), 0),
    nullif(request_reference_no, ''),
    'POS sale',
    auth.uid()
  );

  return next_balance;
end;
$$;

alter table product_categories enable row level security;
alter table units enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table payments enable row level security;
alter table stock_movements enable row level security;
alter table promotions enable row level security;
alter table promotion_trigger_products enable row level security;
alter table promotion_reward_products enable row level security;
alter table discount_rules enable row level security;
alter table customers enable row level security;
alter table loyalty_settings enable row level security;
alter table customer_point_transactions enable row level security;
alter table product_price_history enable row level security;

drop policy if exists "authenticated read categories" on product_categories;
create policy "authenticated read categories" on product_categories
for select to authenticated using (true);

drop policy if exists "authenticated read units" on units;
create policy "authenticated read units" on units
for select to authenticated using (true);

drop policy if exists "authenticated read products" on products;
create policy "authenticated read products" on products
for select to authenticated using (true);

drop policy if exists "authenticated insert products" on products;
create policy "authenticated insert products" on products
for insert to authenticated with check (true);

drop policy if exists "authenticated update products" on products;
create policy "authenticated update products" on products
for update to authenticated using (true) with check (true);

drop policy if exists "authenticated read sales" on sales;
create policy "authenticated read sales" on sales
for select to authenticated using (true);

drop policy if exists "authenticated read sale items" on sale_items;
create policy "authenticated read sale items" on sale_items
for select to authenticated using (true);

drop policy if exists "authenticated read payments" on payments;
create policy "authenticated read payments" on payments
for select to authenticated using (true);

drop policy if exists "authenticated read stock movements" on stock_movements;
create policy "authenticated read stock movements" on stock_movements
for select to authenticated using (true);

drop policy if exists "authenticated read promotions" on promotions;
create policy "authenticated read promotions" on promotions
for select to authenticated using (true);

drop policy if exists "authenticated write promotions" on promotions;
create policy "authenticated write promotions" on promotions
for all to authenticated using (true) with check (true);

drop policy if exists "staff read promotion trigger products" on promotion_trigger_products;
create policy "staff read promotion trigger products" on promotion_trigger_products
for select to authenticated using (current_staff_role() in ('cashier', 'manager', 'owner'));

drop policy if exists "manager owner write promotion trigger products" on promotion_trigger_products;
create policy "manager owner write promotion trigger products" on promotion_trigger_products
for all to authenticated
using (current_staff_role() in ('manager', 'owner'))
with check (current_staff_role() in ('manager', 'owner'));

drop policy if exists "staff read promotion reward products" on promotion_reward_products;
create policy "staff read promotion reward products" on promotion_reward_products
for select to authenticated using (current_staff_role() in ('cashier', 'manager', 'owner'));

drop policy if exists "manager owner write promotion reward products" on promotion_reward_products;
create policy "manager owner write promotion reward products" on promotion_reward_products
for all to authenticated
using (current_staff_role() in ('manager', 'owner'))
with check (current_staff_role() in ('manager', 'owner'));

drop policy if exists "authenticated read discount rules" on discount_rules;
create policy "authenticated read discount rules" on discount_rules
for select to authenticated using (true);

drop policy if exists "authenticated write discount rules" on discount_rules;
create policy "authenticated write discount rules" on discount_rules
for all to authenticated using (true) with check (true);

drop policy if exists "manager owner read customers" on customers;
drop policy if exists "staff read active customers" on customers;
create policy "staff read active customers" on customers
for select to authenticated using (
  current_staff_role() in ('cashier', 'manager', 'owner')
  and is_active = true
);

drop policy if exists "manager owner write customers" on customers;
create policy "manager owner write customers" on customers
for all to authenticated
using (current_staff_role() in ('manager', 'owner'))
with check (current_staff_role() in ('manager', 'owner'));

drop policy if exists "staff insert customers" on customers;
create policy "staff insert customers" on customers
for insert to authenticated
with check (
  current_staff_role() in ('cashier', 'manager', 'owner')
  and is_active = true
  and member_status = 'active'
);

drop policy if exists "manager owner read loyalty settings" on loyalty_settings;
drop policy if exists "staff read loyalty settings" on loyalty_settings;
create policy "staff read loyalty settings" on loyalty_settings
for select to authenticated using (current_staff_role() in ('cashier', 'manager', 'owner'));

drop policy if exists "owner write loyalty settings" on loyalty_settings;
create policy "owner write loyalty settings" on loyalty_settings
for all to authenticated
using (current_staff_role() = 'owner')
with check (current_staff_role() = 'owner');

drop policy if exists "manager owner read point transactions" on customer_point_transactions;
create policy "manager owner read point transactions" on customer_point_transactions
for select to authenticated using (current_staff_role() in ('manager', 'owner'));

drop policy if exists "manager owner write point transactions" on customer_point_transactions;
create policy "manager owner write point transactions" on customer_point_transactions
for all to authenticated
using (current_staff_role() in ('manager', 'owner'))
with check (current_staff_role() in ('manager', 'owner'));

drop policy if exists "authenticated read product price history" on product_price_history;
create policy "authenticated read product price history" on product_price_history
for select to authenticated using (true);

drop policy if exists "authenticated insert product price history" on product_price_history;
create policy "authenticated insert product price history" on product_price_history
for insert to authenticated with check (true);

insert into product_categories (name)
values
  ('วัสดุก่อสร้าง'),
  ('ไฟฟ้า'),
  ('ประปา'),
  ('สีและเคมีภัณฑ์'),
  ('เครื่องมือช่าง'),
  ('น็อตและสกรู')
on conflict (name) do nothing;

insert into units (name, short_name)
values
  ('อัน', 'อัน'),
  ('กล่อง', 'กล่อง'),
  ('เส้น', 'เส้น'),
  ('กระสอบ', 'กระสอบ'),
  ('ถัง', 'ถัง')
on conflict (name) do nothing;

insert into products (sku, barcode, name, category_id, base_unit_id, retail_price, wholesale_price, cost_price, min_stock, stock_qty)
select 'CEM001', null, 'ปูนซีเมนต์ปอร์ตแลนด์ 50 กก.', c.id, u.id, 145, 138, 128, 20, 80
from product_categories c, units u
where c.name = 'วัสดุก่อสร้าง' and u.name = 'กระสอบ'
on conflict (sku) do nothing;

insert into products (sku, barcode, name, category_id, base_unit_id, retail_price, wholesale_price, cost_price, min_stock, stock_qty)
select 'PVC012', null, 'ท่อ PVC 1/2 นิ้ว ชั้น 8.5', c.id, u.id, 85, 78, 65, 30, 120
from product_categories c, units u
where c.name = 'ประปา' and u.name = 'เส้น'
on conflict (sku) do nothing;

insert into products (sku, barcode, name, category_id, base_unit_id, retail_price, wholesale_price, cost_price, min_stock, stock_qty)
select 'SCR101', null, 'สกรูปลายสว่าน 1 นิ้ว', c.id, u.id, 180, 165, 140, 10, 35
from product_categories c, units u
where c.name = 'น็อตและสกรู' and u.name = 'กล่อง'
on conflict (sku) do nothing;
