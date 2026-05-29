# Diseño: Favoritos, Dashboard de Profit, Legal y Cómo Comprar

**Fecha:** 2026-05-29  
**Estado:** Aprobado por el usuario

---

## Resumen

Cuatro mejoras independientes para Klassik Store:

1. Página `/favoritos` — darle destino al botón de corazón
2. Dashboard de Profit y Ventas Offline en el panel admin
3. Contenido de páginas legales (privacidad, términos, devoluciones)
4. Actualización de `/como-comprar` con el flujo real de pago

---

## 1. Página de Favoritos

### Ruta
`/favoritos`

### Comportamiento
- Lee los IDs guardados en `localStorage` con clave `klassik_wishlist_v1`
- Consulta Supabase para obtener los datos actuales de esos productos (mismo select que catálogo: id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fechas, producto_imagenes con orden)
- Renderiza los productos con el componente `ProductoCard` existente
- Si un producto fue despublicado o eliminado, simplemente no aparece (se filtra automáticamente)
- Si no hay favoritos: estado vacío con mensaje y botón CTA al catálogo

### Header
- Agregar ícono de corazón en el `Header.tsx` con contador de favoritos (número de IDs en localStorage)
- El contador se lee del `WishlistProvider` que ya existe
- Click en el ícono navega a `/favoritos`

### Persistencia
- localStorage persiste entre sesiones del mismo navegador
- No requiere login, no sincroniza entre dispositivos

### Lo que NO incluye
- Autenticación ni cuentas de usuario
- Sincronización entre dispositivos
- Notificaciones de cambio de precio

---

## 2. Dashboard de Profit y Ventas Offline

### Ubicación en el admin
Nueva sección "Ventas & Profit" en el panel administrativo.

### Base de datos — Nueva tabla `ventas`
```sql
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_vendido NUMERIC NOT NULL,
  canal TEXT NOT NULL CHECK (canal IN ('web', 'whatsapp', 'presencial')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Al registrar una venta offline, también se descuenta `stock_unidades` del producto correspondiente.

### Tarjetas de resumen (parte superior)
| Tarjeta | Cálculo |
|---|---|
| Inversión en inventario | SUM(precio_costo × stock_unidades) de todos los productos publicados |
| Ganancia potencial | SUM((precio_venta - precio_costo) × stock_unidades) |
| Ganancia real | SUM((precio_vendido - precio_costo) × cantidad) de tabla ventas |
| Unidades en stock | SUM(stock_unidades) de productos publicados |

### Tabla de productos
Columnas: Producto · Costo · Precio venta · Ganancia/unidad · Stock · Ganancia potencial total  
Ordenada por ganancia potencial total descendente.

### Modal "Registrar venta offline"
Campos:
- **Producto** — buscador/select con todos los productos publicados
- **Cantidad** — número (validar que no supere el stock disponible)
- **Precio vendido** — número (puede diferir del precio de la web)
- **Canal** — WhatsApp / Presencial
- **Fecha** — date picker, por defecto hoy

Al guardar:
1. Inserta registro en tabla `ventas` con `canal = 'whatsapp'` o `'presencial'`
2. Descuenta la cantidad de `stock_unidades` en la tabla `productos`

---

## 3. Páginas Legales

Las tres secciones ya existen en `/politicas` y leen de la tabla `configuracion`. Solo hay que llenar los campos desde el panel admin.

### Política de Privacidad (`config.politica_privacidad`)

```
Klassik Store recopila únicamente la información necesaria para procesar tus pedidos: nombre, número de teléfono y comprobante de pago. Esta información se usa exclusivamente para coordinar la entrega de tu pedido y nunca es vendida, cedida ni compartida con terceros.

Tus datos son tratados con total confidencialidad. Si deseas que eliminemos tu información de nuestros registros, puedes solicitarlo en cualquier momento a través de nuestro WhatsApp.

Al realizar una compra en Klassik Store, aceptas esta política de privacidad.
```

### Términos y Condiciones (`config.terminos_condiciones`)

```
1. Precios
Todos los precios están expresados en dólares americanos (USD) y pueden estar sujetos a cambios sin previo aviso. El precio válido es el que aparece al momento de confirmar tu pedido.

2. Formas de pago
Aceptamos Yappy, transferencia bancaria y pago en efectivo presencial (disponible en Penonomé y estaciones del metro en Ciudad de Panamá).

3. Pre-órdenes
Los productos en modalidad pre-orden requieren un anticipo del 50% para reservar el artículo. Este anticipo no es reembolsable si el cliente cancela el pedido una vez confirmada la reserva.

4. Tiempos de entrega
Los tiempos varían según disponibilidad y modalidad del pedido. Los productos en stock tienen tiempos de entrega menores a los de pre-orden. Klassik Store no se hace responsable por retrasos causados por factores externos.

5. Responsabilidad
Klassik Store es responsable únicamente por los productos vendidos directamente a través de sus canales oficiales. Nos comprometemos a ofrecer productos en buen estado y conforme a lo descrito en el catálogo.
```

### Política de Devoluciones (`config.politica_devoluciones`)

```
Aceptamos devoluciones dentro de las 48 horas siguientes a la recepción del pedido, únicamente en los siguientes casos:

- El producto presenta un defecto visible o daño de fábrica
- El artículo recibido no corresponde al pedido confirmado

Para iniciar una devolución, el cliente debe documentar el problema con fotografías y contactarnos a través de nuestro WhatsApp dentro del plazo indicado.

No se aceptan devoluciones por cambio de opinión ni por tallas o características incorrectas seleccionadas por el cliente al momento de hacer el pedido.

El proceso de devolución o cambio se coordina directamente con nuestro equipo.
```

---

## 4. Actualización de `/como-comprar`

### Flujo nuevo (reemplaza el paso 3 actual)

**Paso 1 — Elige tu producto** *(sin cambios)*

**Paso 2 — Agrega al carrito** *(sin cambios)*

**Paso 3 — Elige cómo pagar** *(reemplaza "Coordina por WhatsApp")*

Tres modalidades:

- **Pago completo online** — Paga el 100% por Yappy o transferencia bancaria y sube tu comprobante directamente en la web. Tu pedido queda confirmado de inmediato.
- **Mitad ahora, mitad en entrega** — Paga el 50% por Yappy o transferencia, sube el comprobante, y cancelas el resto al momento de recibir tu pedido.
- **Pago presencial** — Si estás en Penonomé o en una estación del metro en Ciudad de Panamá, puedes coordinar y pagar en efectivo al momento de la entrega.

**Paso 4 — Pre-órdenes** *(sección separada al final)*

Para separar un producto en pre-orden se requiere el 50% de anticipo por Yappy o transferencia bancaria. Sube el comprobante en la web para confirmar tu reserva.

**Nota sobre WhatsApp:**  
El botón de WhatsApp sigue disponible como canal alternativo para quienes prefieran coordinar directamente con el equipo.

---

## Archivos a modificar / crear

| Archivo | Acción |
|---|---|
| `app/(public)/favoritos/page.tsx` | Crear |
| `components/public/Header.tsx` | Modificar — agregar ícono corazón con contador |
| `app/(admin)/admin/ventas/page.tsx` | Crear |
| `supabase/migrations/YYYYMMDD_ventas.sql` | Crear — tabla ventas |
| `app/(public)/como-comprar/page.tsx` | Modificar — nuevo paso 3 |
| Panel admin — sección configuración | Llenar campos de políticas legales vía Supabase MCP |
