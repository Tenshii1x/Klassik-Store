-- Klassik Store · Schema inicial Fase 1
-- 2026-05-12

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists secciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  imagen_portada text,
  descripcion_corta text,
  orden int not null default 0,
  tono text not null default 'dark-gold' check (tono in ('dark-gold', 'rose-gold', 'blue-cool')),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subsecciones (
  id uuid primary key default gen_random_uuid(),
  seccion_id uuid not null references secciones(id) on delete cascade,
  nombre text not null,
  slug text not null,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  unique (seccion_id, slug)
);

create table if not exists etiquetas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  color text not null default '#c9a86a',
  created_at timestamptz not null default now()
);

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  seccion_id uuid references secciones(id) on delete set null,
  subseccion_id uuid references subsecciones(id) on delete set null,
  nombre text not null,
  nombre_temu text,
  descripcion text,
  slug text not null unique,
  modelo text,
  modo text not null default 'preorden' check (modo in ('stock', 'preorden')),
  stock_unidades int,
  costo_temu numeric(10,2) not null default 0,
  costo_envio_unitario numeric(10,2) not null default 0,
  precio_venta numeric(10,2) not null default 0,
  precio_anterior numeric(10,2),
  margen_override_porcentaje int,
  temu_url text,
  temu_goods_id text,
  notas_internas text,
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado', 'archivado')),
  destacado boolean not null default false,
  etiquetas text[] not null default '{}',
  fecha_llegada_inicio date,
  fecha_llegada_fin date,
  solo_para_ella boolean not null default false,
  solo_para_el boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index idx_productos_estado on productos(estado);
create index idx_productos_destacado on productos(destacado) where estado = 'publicado';
create index idx_productos_seccion on productos(seccion_id) where estado = 'publicado';
create index idx_productos_temu_goods on productos(temu_goods_id);

create table if not exists producto_imagenes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  url text not null,
  orden int not null default 0,
  tipo text not null default 'imagen' check (tipo in ('imagen', 'video')),
  watermark_limpio boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_producto_imagenes_producto on producto_imagenes(producto_id);

create table if not exists producto_variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  tipo text not null,
  valor text not null,
  precio_extra numeric(10,2) not null default 0,
  stock_unidades int,
  imagen_url text,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_producto_variantes_producto on producto_variantes(producto_id);

create table if not exists productos_relacionados (
  producto_id uuid not null references productos(id) on delete cascade,
  relacionado_id uuid not null references productos(id) on delete cascade,
  orden int not null default 0,
  primary key (producto_id, relacionado_id),
  check (producto_id <> relacionado_id)
);

create table if not exists combos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio_combo numeric(10,2) not null,
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists combo_productos (
  combo_id uuid not null references combos(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete cascade,
  cantidad int not null default 1 check (cantidad > 0),
  primary key (combo_id, producto_id)
);

create table if not exists configuracion (
  id int primary key default 1,
  nombre_tienda text not null default 'Klassik Store',
  logo_url text,
  whatsapp text,
  instagram_handle text,
  instagram_url text,
  yappy_numero text,
  yappy_qr_url text,
  banco_nombre text,
  banco_cuenta text,
  banco_titular text,
  banco_tipo text,
  margen_global_porcentaje int not null default 60 check (margen_global_porcentaje >= 0),
  proxima_fecha_llegada_inicio date,
  proxima_fecha_llegada_fin date,
  banner_activo boolean not null default false,
  banner_texto text,
  banner_cta_texto text,
  banner_cta_url text,
  banner_color text default '#c9a86a',
  politica_devoluciones text,
  politica_privacidad text,
  terminos_condiciones text,
  mensaje_preorden text default 'Tu producto va a estar llegando entre las fechas indicadas. Te avisamos por WhatsApp cuando esté listo para entrega.',
  updated_at timestamptz not null default now(),
  constraint configuracion_singleton check (id = 1)
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo_publico text not null unique,
  nombre_cliente text not null,
  whatsapp_cliente text,
  metodo_pago text check (metodo_pago in ('yappy', 'transferencia', '50_50', 'efectivo')),
  comprobante_url text,
  total numeric(10,2) not null default 0,
  notas_internas text,
  estado_interno text not null default 'nuevo' check (estado_interno in (
    'nuevo',
    'deposito_recibido',
    'pendiente_pedir_supplier',
    'pedido_a_supplier',
    'llegado_pais',
    'listo_entrega',
    'entregado',
    'cancelado'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pedidos_estado on pedidos(estado_interno);

create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  variante_id uuid references producto_variantes(id) on delete set null,
  nombre_snapshot text not null,
  precio_snapshot numeric(10,2) not null,
  cantidad int not null default 1 check (cantidad > 0),
  modo text not null check (modo in ('stock', 'preorden')),
  created_at timestamptz not null default now()
);

create index idx_pedido_items_pedido on pedido_items(pedido_id);
create index idx_pedido_items_producto on pedido_items(producto_id);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  variante_id uuid references producto_variantes(id) on delete cascade,
  email text not null,
  creado_en timestamptz not null default now(),
  notificado_en timestamptz,
  unique (producto_id, variante_id, email)
);

create table if not exists suscriptores_newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  cupon_bienvenida_usado boolean not null default false,
  creado_en timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  rol text not null default 'owner' check (rol in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_secciones_updated_at before update on secciones
  for each row execute function update_updated_at_column();

create trigger trg_productos_updated_at before update on productos
  for each row execute function update_updated_at_column();

create trigger trg_combos_updated_at before update on combos
  for each row execute function update_updated_at_column();

create trigger trg_pedidos_updated_at before update on pedidos
  for each row execute function update_updated_at_column();

create trigger trg_configuracion_updated_at before update on configuracion
  for each row execute function update_updated_at_column();

-- ============================================================
-- Auto-create profile on user signup
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, rol)
  values (new.id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
