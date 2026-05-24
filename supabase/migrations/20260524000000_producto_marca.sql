-- Agrega campo marca a productos para filtros transversales (Casio, Essentials, etc.)
-- Sustituye anidación de sub-subsecciones por un atributo filtrable que escala mejor.

alter table productos
  add column if not exists marca text;

-- Índice case-insensitive para filtros y autocomplete en admin.
create index if not exists idx_productos_marca_lower
  on productos (lower(marca))
  where marca is not null;
