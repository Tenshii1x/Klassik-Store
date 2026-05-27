-- Banner separado de la imagen de portada (tarjeta del home).
-- imagen_portada: imagen pequeña que se ve en la grilla del home (3/4 aspect ratio).
-- imagen_banner: imagen ancha que se muestra como hero al entrar a la página de la sección.

alter table secciones
  add column if not exists imagen_banner text;
