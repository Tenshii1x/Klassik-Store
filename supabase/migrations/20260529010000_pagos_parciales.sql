CREATE TABLE pagos_parciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_offline_id UUID REFERENCES ventas_offline(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL CHECK (monto > 0),
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pagos_parciales_fuente CHECK (
    (venta_offline_id IS NOT NULL AND pedido_id IS NULL) OR
    (venta_offline_id IS NULL AND pedido_id IS NOT NULL)
  )
);

CREATE INDEX idx_pagos_parciales_venta ON pagos_parciales(venta_offline_id);
CREATE INDEX idx_pagos_parciales_pedido ON pagos_parciales(pedido_id);
CREATE INDEX idx_pagos_parciales_fecha ON pagos_parciales(fecha_pago DESC);

ALTER TABLE pagos_parciales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_parciales_auth_only" ON pagos_parciales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
