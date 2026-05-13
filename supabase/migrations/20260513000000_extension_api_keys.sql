-- API keys para la extensión Chrome (auth sin service_role)
create table if not exists extension_api_keys (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  key_hash text not null unique,
  key_prefix text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index idx_extension_api_keys_hash on extension_api_keys(key_hash) where revoked_at is null;

alter table extension_api_keys enable row level security;

create policy "admin all extension_api_keys" on extension_api_keys
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  );

-- Log de importaciones para historial
create table if not exists importaciones_log (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id) on delete set null,
  temu_url text,
  temu_goods_id text,
  api_key_id uuid references extension_api_keys(id) on delete set null,
  status text not null check (status in ('success', 'partial', 'failed')),
  error_message text,
  imagenes_count int not null default 0,
  imagenes_failed int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_importaciones_log_created on importaciones_log(created_at desc);

alter table importaciones_log enable row level security;

create policy "admin all importaciones_log" on importaciones_log
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  );
