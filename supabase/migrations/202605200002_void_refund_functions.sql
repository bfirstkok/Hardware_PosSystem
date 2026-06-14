-- Migration: RPC Functions & Triggers for POS, Void/Refund, and Activity Logging

-- 1. Complete POS Sale RPC Function with sequential INV-YYYYMMDD-001 format and logging
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
  line_discount numeric(12,2);
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
  
  today_date_str text;
  today_sales_count bigint;
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

  -- Generate invoice number in INV-YYYYMMDD-001 format
  today_date_str := to_char(now(), 'YYYYMMDD');
  loop
    select count(*) into today_sales_count
    from sales
    where to_char(sale_date, 'YYYYMMDD') = today_date_str;

    new_sale_no := 'INV-' || today_date_str || '-' || lpad((today_sales_count + 1)::text, 3, '0');
    
    perform 1 from sales where sale_no = new_sale_no;
    if not found then
      exit;
    end if;
  end loop;

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
    line_discount := coalesce((item->>'discount_amount')::numeric, 0);

    if line_qty <= 0 then
      raise exception 'Invalid quantity for product %.', line_product_id;
    end if;

    if line_unit_price < 0 then
      raise exception 'Invalid unit price for product %.', line_product_id;
    end if;

    if line_discount < 0 then
      raise exception 'Invalid discount amount for product %.', line_product_id;
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

    line_total := (line_qty * line_unit_price) - line_discount;
    if line_total < 0 then
      line_total := 0;
    end if;

    sale_total := sale_total + line_total;

    insert into sale_items (sale_id, product_id, qty, unit_price, discount_amount, line_total)
    values (new_sale_id, line_product_id, line_qty, line_unit_price, line_discount, line_total);

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

  -- Log transaction event
  insert into public.transaction_events (sale_id, event_type, amount, reason, metadata, created_by)
  values (
    new_sale_id,
    'created',
    due_total,
    'POS Sale completed successfully',
    jsonb_build_object('client_invoice_no', request_client_invoice_no),
    current_user_id
  );

  -- Log activity
  insert into public.activity_logs (actor_id, action, entity_type, entity_id, before_data, after_data, metadata)
  values (
    current_user_id,
    'sale.create',
    'sales',
    new_sale_id,
    null,
    jsonb_build_object('sale_no', new_sale_no, 'total_amount', due_total),
    jsonb_build_object('sale_no', new_sale_no, 'total_amount', due_total)
  );

  return new_sale_no;
end;
$$;


-- 2. Receive Stock RPC Function with activity logging containing product details
create or replace function public.receive_stock(payload jsonb)
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
  current_stock numeric(12,2);
  prod_name text;
  prod_sku text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if line_product_id is null or line_qty <= 0 then
    raise exception 'Valid product and quantity are required.';
  end if;

  select stock_qty, name, sku into current_stock, prod_name, prod_sku
  from products
  where id = line_product_id and is_active = true
  for update;

  if current_stock is null then
    raise exception 'Product % not found.', line_product_id;
  end if;

  update products
  set stock_qty = stock_qty + line_qty
  where id = line_product_id and is_active = true;

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

  -- Log activity with denormalized product details
  insert into public.activity_logs (actor_id, action, entity_type, entity_id, before_data, after_data, metadata)
  values (
    current_user_id,
    'stock.receive',
    'products',
    line_product_id,
    jsonb_build_object('stock_qty', current_stock),
    jsonb_build_object('stock_qty', current_stock + line_qty),
    jsonb_build_object(
      'qty', line_qty, 
      'note', line_note,
      'product_name', prod_name,
      'product_sku', prod_sku
    )
  );
end;
$$;


-- 3. Void Sale RPC Function with activity logging
create or replace function public.void_sale(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_sale_id bigint := (payload->>'sale_id')::bigint;
  reason text := nullif(trim(payload->>'reason'), '');
  item record;
  current_stock numeric(12,2);
  sale_record record;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_sale_id is null then
    raise exception 'Sale ID is required.';
  end if;

  if reason is null then
    raise exception 'Void reason is required.';
  end if;

  select * into sale_record
  from sales
  where id = target_sale_id
  for update;

  if not found then
    raise exception 'Sale record not found.';
  end if;

  if sale_record.status != 'completed' then
    raise exception 'Only completed sales can be voided. Current status is %.', sale_record.status;
  end if;

  -- Update status and audit info
  update sales
  set status = 'voided',
      voided_at = now(),
      voided_by = current_user_id,
      void_reason = reason
  where id = target_sale_id;

  -- Revert stock and insert movements
  for item in select * from sale_items where sale_id = target_sale_id
  loop
    select stock_qty into current_stock
    from products
    where id = item.product_id
    for update;

    update products
    set stock_qty = stock_qty + item.qty
    where id = item.product_id;

    insert into stock_movements (
      product_id,
      movement_type,
      qty_in,
      qty_out,
      ref_type,
      ref_id,
      note,
      created_by
    )
    values (
      item.product_id,
      'receive',
      item.qty,
      0,
      'sales',
      target_sale_id,
      'Void sale: ' || reason,
      current_user_id
    );
  end loop;

  -- Log transaction event
  insert into public.transaction_events (sale_id, event_type, amount, reason, created_by)
  values (
    target_sale_id,
    'voided',
    sale_record.total_amount,
    reason,
    current_user_id
  );

  -- Log activity
  insert into public.activity_logs (actor_id, action, entity_type, entity_id, before_data, after_data, metadata)
  values (
    current_user_id,
    'sale.void',
    'sales',
    target_sale_id,
    jsonb_build_object('status', 'completed'),
    jsonb_build_object('status', 'voided', 'void_reason', reason),
    jsonb_build_object('sale_no', sale_record.sale_no, 'total_amount', sale_record.total_amount, 'reason', reason)
  );
end;
$$;


-- 4. Refund Sale RPC Function with activity logging
create or replace function public.refund_sale(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_sale_id bigint := (payload->>'sale_id')::bigint;
  reason text := nullif(trim(payload->>'reason'), '');
  item record;
  current_stock numeric(12,2);
  sale_record record;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if target_sale_id is null then
    raise exception 'Sale ID is required.';
  end if;

  if reason is null then
    raise exception 'Refund reason is required.';
  end if;

  select * into sale_record
  from sales
  where id = target_sale_id
  for update;

  if not found then
    raise exception 'Sale record not found.';
  end if;

  if sale_record.status != 'completed' then
    raise exception 'Only completed sales can be refunded. Current status is %.', sale_record.status;
  end if;

  -- Update status and audit info
  update sales
  set status = 'refunded',
      refunded_at = now(),
      refunded_by = current_user_id,
      refund_reason = reason
  where id = target_sale_id;

  -- Revert stock and insert movements
  for item in select * from sale_items where sale_id = target_sale_id
  loop
    select stock_qty into current_stock
    from products
    where id = item.product_id
    for update;

    update products
    set stock_qty = stock_qty + item.qty
    where id = item.product_id;

    insert into stock_movements (
      product_id,
      movement_type,
      qty_in,
      qty_out,
      ref_type,
      ref_id,
      note,
      created_by
    )
    values (
      item.product_id,
      'receive',
      item.qty,
      0,
      'sales',
      target_sale_id,
      'Refund sale: ' || reason,
      current_user_id
    );
  end loop;

  -- Log transaction event
  insert into public.transaction_events (sale_id, event_type, amount, reason, created_by)
  values (
    target_sale_id,
    'refunded',
    sale_record.total_amount,
    reason,
    current_user_id
  );

  -- Log activity
  insert into public.activity_logs (actor_id, action, entity_type, entity_id, before_data, after_data, metadata)
  values (
    current_user_id,
    'sale.refund',
    'sales',
    target_sale_id,
    jsonb_build_object('status', 'completed'),
    jsonb_build_object('status', 'refunded', 'refund_reason', reason),
    jsonb_build_object('sale_no', sale_record.sale_no, 'total_amount', sale_record.total_amount, 'reason', reason)
  );
end;
$$;


-- 5. Trigger for logging product price changes to activity_logs with product details
create or replace function public.log_price_change_activity()
returns trigger
language plpgsql
security definer
as $$
declare
  prod_name text;
  prod_sku text;
begin
  select name, sku into prod_name, prod_sku
  from products
  where id = new.product_id;

  insert into public.activity_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    metadata,
    created_at
  )
  values (
    new.changed_by,
    'product.price_change',
    'products',
    new.product_id,
    jsonb_build_object(
      'retail_price', new.old_retail_price,
      'wholesale_price', new.old_wholesale_price,
      'cost_price', new.old_cost_price
    ),
    jsonb_build_object(
      'retail_price', new.new_retail_price,
      'wholesale_price', new.new_wholesale_price,
      'cost_price', new.new_cost_price
    ),
    jsonb_build_object(
      'product_name', prod_name,
      'product_sku', prod_sku
    ),
    new.changed_at
  );
  return new;
end;
$$;

drop trigger if exists product_price_history_activity_trigger on public.product_price_history;
create trigger product_price_history_activity_trigger
after insert on public.product_price_history
for each row execute function public.log_price_change_activity();
