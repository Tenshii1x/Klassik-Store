CREATE TABLE ventas_offline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_vendido NUMERIC NOT NULL CHECK (precio_vendido >= 0),
  costo_snapshot NUMERIC NOT NULL DEFAULT 0,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'presencial')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ventas_offline_fecha ON ventas_offline(fecha DESC);
CREATE INDEX idx_ventas_offline_producto ON ventas_offline(producto_id);
