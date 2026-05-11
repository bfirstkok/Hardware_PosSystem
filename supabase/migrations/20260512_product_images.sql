alter table public.products
add column if not exists image_url text;

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
for update to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');
