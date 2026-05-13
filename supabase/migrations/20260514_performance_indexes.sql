create index if not exists products_active_name_idx
on public.products (is_active, name);

create index if not exists products_active_stock_idx
on public.products (is_active, stock_qty);

create index if not exists products_sku_lower_idx
on public.products (lower(sku));

create index if not exists products_barcode_idx
on public.products (barcode)
where barcode is not null;

create index if not exists sales_sale_date_desc_idx
on public.sales (sale_date desc);

create index if not exists sales_status_sale_date_idx
on public.sales (status, sale_date desc);

create index if not exists sales_payment_method_sale_date_idx
on public.sales (payment_method, sale_date desc);

create index if not exists sale_items_sale_id_idx
on public.sale_items (sale_id);

create index if not exists sale_items_product_id_idx
on public.sale_items (product_id);

create index if not exists payments_sale_id_idx
on public.payments (sale_id);

create index if not exists stock_movements_date_idx
on public.stock_movements (movement_date desc);

create index if not exists stock_movements_product_date_idx
on public.stock_movements (product_id, movement_date desc);
