-- Bucket privado para comprobantes de pago
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- Cliente puede subir (checkout)
drop policy if exists "Public upload comprobantes" on storage.objects;
create policy "Public upload comprobantes" on storage.objects
  for insert
  with check (bucket_id = 'comprobantes');

-- Solo admin lee
drop policy if exists "Admin read comprobantes" on storage.objects;
create policy "Admin read comprobantes" on storage.objects
  for select
  using (
    bucket_id = 'comprobantes'
    and exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  );

drop policy if exists "Admin update comprobantes" on storage.objects;
create policy "Admin update comprobantes" on storage.objects
  for update
  using (
    bucket_id = 'comprobantes'
    and exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  );

drop policy if exists "Admin delete comprobantes" on storage.objects;
create policy "Admin delete comprobantes" on storage.objects
  for delete
  using (
    bucket_id = 'comprobantes'
    and exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  );
