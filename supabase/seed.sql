-- Datos iniciales necesarios para arrancar
-- Se ejecuta una sola vez después de aplicar el schema.

insert into configuracion (id, nombre_tienda, margen_global_porcentaje, mensaje_preorden)
values (
  1,
  'Klassik Store',
  60,
  'Tu producto va a estar llegando entre las fechas indicadas. Te avisamos por WhatsApp cuando esté listo para entrega.'
)
on conflict (id) do nothing;
