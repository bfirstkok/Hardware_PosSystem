create index if not exists stock_movements_type_date_idx
on public.stock_movements (movement_type, movement_date desc);

create index if not exists stock_movements_product_type_date_idx
on public.stock_movements (product_id, movement_type, movement_date desc);

create index if not exists sale_items_sale_product_idx
on public.sale_items (sale_id, product_id);
