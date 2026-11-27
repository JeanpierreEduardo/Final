/* Ejecutar en Neon después de schema.sql e integracion_sunat.sql.
   El CVV y el código de verificación de Yape se validan en memoria y no se guardan. */
BEGIN;
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS yape_celular VARCHAR(9);
ALTER TABLE compras_entradas_cine ADD COLUMN IF NOT EXISTS tarjeta_vencimiento VARCHAR(7);
CREATE INDEX IF NOT EXISTS compras_pago_idx ON compras_entradas_cine(estado_pago, forma_pago);
COMMIT;
