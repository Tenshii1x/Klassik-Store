-- Buckets para imágenes/videos de productos y assets de tienda
insert into storage.buckets (id, name, public)
values
  ('productos', 'productos', true),
  ('configuracion', 'configuracion', true)
on conflict (id) do nothing;

-- RLS para los buckets
create policy "Public read productos" on storage.objects
  for select using (bucket_id = 'productos');

create policy "Public read configuracion" on storage.objects
  for select using (bucket_id = 'configuracion');

create policy "Admin write productos" on storage.objects
  for all
  using (bucket_id = 'productos' and exists (
    select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff')
  ))
  with check (bucket_id = 'productos' and exists (
    select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff')
  ));

create policy "Admin write configuracion" on storage.objects
  for all
  using (bucket_id = 'configuracion' and exists (
    select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff')
  ))
  with check (bucket_id = 'configuracion' and exists (
    select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff')
  ));
