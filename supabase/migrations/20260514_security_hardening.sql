alter table public.products
drop constraint if exists products_stock_qty_nonnegative;

alter table public.products
add constraint products_stock_qty_nonnegative check (stock_qty >= 0) not valid;

create or replace function public.complete_pos_sale(payload jsonb)
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
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
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
