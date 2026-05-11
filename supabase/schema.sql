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
  stock_qty numeric(12,2) not null default 0,
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
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

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

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch_updated_at on products;
create trigger products_touch_updated_at
before update on products
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
  current_stock numeric(12,2);
  method text := coalesce(payload->>'payment_method', 'cash');
  reference text := nullif(payload->>'reference_no', '');
  customer text := nullif(payload->>'customer_name', '');
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Sale items are required.';
  end if;

  new_sale_no := 'SALE-' || to_char(now(), 'YYYYMMDDHH24MISSMS');

  insert into sales (sale_no, payment_method, status, created_by)
  values (new_sale_no, method, 'completed', current_user_id)
  returning id into new_sale_id;

  for item in select * from jsonb_array_elements(payload->'items')
  loop
    line_product_id := (item->>'product_id')::bigint;
    line_qty := (item->>'qty')::numeric;
    line_unit_price := (item->>'unit_price')::numeric;

    if line_qty <= 0 then
      raise exception 'Invalid quantity for product %.', line_product_id;
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

  update sales
  set subtotal = sale_total,
      discount_amount = discount_total,
      total_amount = sale_total - discount_total
  where id = new_sale_id;

  insert into payments (sale_id, payment_method, amount, reference_no, created_by)
  values (
    new_sale_id,
    method,
    case when paid_total > 0 then paid_total else sale_total - discount_total end,
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

alter table product_categories enable row level security;
alter table units enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table payments enable row level security;
alter table stock_movements enable row level security;

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
