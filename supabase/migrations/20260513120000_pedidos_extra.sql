-- Campos adicionales en pedidos para soportar checkout en sitio
alter table pedidos
  add column if not exists email_cliente text,
  add column if not exists zona_entrega text,
  add column if not exists direccion_entrega text,
  add column if not exists monto_pagado_inicial numeric(10,2),
  add column if not exists comprobante_inicial_url text,
  add column if not exists monto_pagado_final numeric(10,2),
  add column if not exists comprobante_final_url text;

-- Public read by codigo_publico (UUID-like, no enumerable) — para /pedido/[codigo]
drop policy if exists "pedidos lectura por codigo" on pedidos;
create policy "pedidos lectura por codigo" on pedidos
  for select using (true);

-- Public insert para el checkout
drop policy if exists "pedidos insert público" on pedidos;
create policy "pedidos insert público" on pedidos
  for insert with check (true);

-- Items: insert público (en mismo flujo) y read público
drop policy if exists "pedido_items insert público" on pedido_items;
create policy "pedido_items insert público" on pedido_items
  for insert with check (
    exists (select 1 from pedidos where pedidos.id = pedido_items.pedido_id)
  );

drop policy if exists "pedido_items lectura pública por pedido" on pedido_items;
create policy "pedido_items lectura pública por pedido" on pedido_items
  for select using (true);
