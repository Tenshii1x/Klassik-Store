-- RLS policies para Klassik Store

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table secciones enable row level security;
alter table subsecciones enable row level security;
alter table etiquetas enable row level security;
alter table productos enable row level security;
alter table producto_imagenes enable row level security;
alter table producto_variantes enable row level security;
alter table productos_relacionados enable row level security;
alter table combos enable row level security;
alter table combo_productos enable row level security;
alter table configuracion enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table waitlist enable row level security;
alter table suscriptores_newsletter enable row level security;
alter table profiles enable row level security;

-- ============================================================
-- HELPER: check if user is admin (owner or staff)
-- ============================================================
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid()
    and rol in ('owner', 'staff')
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- PUBLIC READ policies (catálogo)
-- ============================================================

-- Secciones activas, públicas
create policy "secciones lectura pública" on secciones
  for select using (activa = true);

create policy "subsecciones lectura pública" on subsecciones
  for select using (
    exists (select 1 from secciones where secciones.id = subsecciones.seccion_id and secciones.activa = true)
  );

create policy "etiquetas lectura pública" on etiquetas
  for select using (true);

-- Productos publicados
create policy "productos lectura pública" on productos
  for select using (estado = 'publicado');

create policy "producto_imagenes lectura pública" on producto_imagenes
  for select using (
    exists (select 1 from productos where productos.id = producto_imagenes.producto_id and productos.estado = 'publicado')
    and watermark_limpio = true
  );

create policy "producto_variantes lectura pública" on producto_variantes
  for select using (
    exists (select 1 from productos where productos.id = producto_variantes.producto_id and productos.estado = 'publicado')
  );

create policy "productos_relacionados lectura pública" on productos_relacionados
  for select using (
    exists (select 1 from productos where productos.id = productos_relacionados.producto_id and productos.estado = 'publicado')
  );

create policy "combos lectura pública" on combos
  for select using (activo = true);

create policy "combo_productos lectura pública" on combo_productos
  for select using (
    exists (select 1 from combos where combos.id = combo_productos.combo_id and combos.activo = true)
  );

-- Configuración: leer todo (frontend lo necesita para banner, redes, etc.)
create policy "configuracion lectura pública" on configuracion
  for select using (true);

-- ============================================================
-- PUBLIC INSERT policies (waitlist, newsletter)
-- ============================================================
create policy "waitlist insert público" on waitlist
  for insert with check (true);

create policy "newsletter insert público" on suscriptores_newsletter
  for insert with check (true);

-- ============================================================
-- ADMIN policies (full access para usuarios admin)
-- ============================================================
create policy "admin all secciones" on secciones for all using (is_admin()) with check (is_admin());
create policy "admin all subsecciones" on subsecciones for all using (is_admin()) with check (is_admin());
create policy "admin all etiquetas" on etiquetas for all using (is_admin()) with check (is_admin());
create policy "admin all productos" on productos for all using (is_admin()) with check (is_admin());
create policy "admin all producto_imagenes" on producto_imagenes for all using (is_admin()) with check (is_admin());
create policy "admin all producto_variantes" on producto_variantes for all using (is_admin()) with check (is_admin());
create policy "admin all productos_relacionados" on productos_relacionados for all using (is_admin()) with check (is_admin());
create policy "admin all combos" on combos for all using (is_admin()) with check (is_admin());
create policy "admin all combo_productos" on combo_productos for all using (is_admin()) with check (is_admin());
create policy "admin all configuracion" on configuracion for all using (is_admin()) with check (is_admin());
create policy "admin all pedidos" on pedidos for all using (is_admin()) with check (is_admin());
create policy "admin all pedido_items" on pedido_items for all using (is_admin()) with check (is_admin());
create policy "admin all waitlist" on waitlist for all using (is_admin()) with check (is_admin());
create policy "admin all newsletter" on suscriptores_newsletter for all using (is_admin()) with check (is_admin());

create policy "admin all profiles select" on profiles for select using (is_admin() or id = auth.uid());
create policy "admin all profiles update" on profiles for update using (is_admin());
