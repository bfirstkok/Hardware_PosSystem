alter table if exists public.promotions
add column if not exists reward_product_id bigint references public.products(id) on delete set null;

create index if not exists promotions_reward_product_idx
on public.promotions (reward_product_id);
